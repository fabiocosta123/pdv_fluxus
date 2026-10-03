"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CashierModal } from "../components/CashierModal";
import { CartTable } from "./components/CartTable";
import { PaymentModal } from "./components/PaymentModal";
import { SaleReceipt } from "@/app/components/SaleReceipt";
import { STORE_DEFAULTS } from "@/modules/settings/defaults";
import type { StoreSettings } from "@/modules/settings/types";
import { OpenCashierModal } from "../components/OpenCashierModal";
import type { CashierReport } from "@/modules/cashier/types";
import {
  CONFERENCE_METHODS,
  cashDrawerLines,
  differenceLabel,
  expectedAmount,
} from "@/modules/cashier/conference";
import { ArrowLeft } from "lucide-react";
import ProductSearch from "../components/ProductSearch";
import type { CustomerRecord } from "@/modules/customers/types";


interface Product {
  id: string;
  name: string;
  price: number;
  barCode?: string;
  stock: number;
  unit?: string;
  isActive: boolean;
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}

export default function PDVPage() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<{ method: string; value: number }[]>(
    [],
  );
  const [paymentInputValue, setPaymentInputValue] = useState(0);
  const [lastSale, setLastSale] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    "SANGRIA" | "APORTE" | "FECHAMENTO"
  >("SANGRIA");
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

  const [store, setStore] = useState<StoreSettings>(STORE_DEFAULTS);
  const [printSize, setPrintSize] = useState<"58mm" | "80mm">(STORE_DEFAULTS.printWidth);

  const printerStyles = {
    "58mm": {
      width: "w-[58mm]",
      text: "text-[10px]",
      headerText: "text-xs",
      maxChars: "max-w-[110px]",
    },
    "80mm": {
      width: "w-[80mm]",
      text: "text-xs",
      headerText: "text-sm",
      maxChars: "max-w-[180px]",
    },
  }[printSize];

  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [cashierReady, setCashierReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const [cashierSummary, setCashierSummary] = useState<CashierReport | null>(null);
  const [countedValues, setCountedValues] = useState<{ [key: string]: number }>(
    {},
  );

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Totais calculados
  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0);
  const remaingBalance = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

  useEffect(() => {
    let active = true;

    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok || !active) return;
        const settings: StoreSettings = await response.json();
        setStore(settings);
        setPrintSize(settings.printWidth);
      })
      .catch(() => undefined);

    fetch("/api/cashier/session")
      .then(async (response) => {
        if (!response.ok) {
          if (active) setIsCashierOpen(false);
          return;
        }
        const session = await response.json();
        if (active) setIsCashierOpen(Boolean(session));
      })
      .catch(() => {
        if (active) setIsCashierOpen(false);
      })
      .finally(() => {
        if (active) setCashierReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleOpenCashier = async (initialValue: number) => {
    try {
      const response = await fetch("/api/cashier/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingValue: initialValue }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Não foi possível abrir o caixa");
        return;
      }

      setIsCashierOpen(true);
      toast.success("Caixa aberto com sucesso!");
    } catch {
      toast.error("Sem conexão para abrir o caixa");
    }
  };

  // Função de busca para o modal F1
  const handleProductLookup = (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const localCatalog = JSON.parse(
      localStorage.getItem("localCatalog") || "[]",
    );
    const filtered = localCatalog.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        (p.barCode ?? "").includes(term),
    );

    setSearchResults(filtered);
  };

  const handleAddPayment = useCallback(
    (method: string, amount: number) => {
      if (amount <= 0) return;

      setPayments((prev) => {
        const newPayments = [...prev, { method, value: amount }];

        toast.info(
          `${method}: ${(amount / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })} registrado!`,
        );

        return newPayments;
      });

      // Limpa o valor digitado para facilitar a próxima entrada
      setPaymentInputValue(0);
    },
    [total],
  );

  // Finaliza venda
  const finalizarVenda = useCallback(async () => {
    if (remaingBalance > 0) return;

    const toastId = "venda-processando";
    toast.loading("Processando venda...", { id: toastId });

    const saleDate = new Date().toISOString();
    const saleData = {
      cart,
      payments,
      total,
      totalPaid,
      change,
      customerId: customer?.id ?? null,
      customer: customer
        ? { name: customer.name, document: customer.document }
        : undefined,
      createdAt: saleDate,
    };

    let completed = false;

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSale({ id: data.id, ...saleData, date: saleDate });
        toast.success("Venda online realizada!", { id: toastId });
        completed = true;
      } else if (response.status >= 500) {
        throw new Error("offline");
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Não foi possível concluir a venda", {
          id: toastId,
        });
      }
    } catch {
      const vendaOff = handleOfflineSave(saleData);
      setLastSale({ id: vendaOff.idTemporario, ...saleData, date: saleDate });
      toast.warning("Venda salva no notebook (Offline)!", { id: toastId });
      completed = true;
    } finally {
      if (!completed) return;
      // delay para o React renderizar o conteúdo do cupom escondido
      setTimeout(() => {
        window.print();
        // Limpeza após o comando de impressão ser enviado
        setCart([]);
        setPayments([]);
        setIsPaymentModalOpen(false);
        setCustomer(null);
        setBarcode("");

        setTimeout(() => {
          setLastSale(null); // faz o componente Receipt retornar null e sumir do HTML
        }, 2000);
      }, 300);
    }
  }, [cart, payments, total, totalPaid, change, remaingBalance, customer]);

  // remove ultimo item
  const removeLastItem = useCallback(() => {
    if (cart.length === 0) return;
    setCart((prev) => {
      const newCart = [...prev];
      const removed = newCart.pop();
      toast.info(`Item removido: ${removed?.name}`, {
        icon: "🗑️",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return newCart;
    });
  }, [cart.length]);

  const handleFinalCashierProcess = useCallback(async () => {
    setLastSale(null);

    try {
      const response = await fetch("/api/cashier/session/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countedMoney: countedValues["DINHEIRO"] || 0,
          countedDebit: countedValues["DÉBITO"] || 0,
          countedCredit: countedValues["CRÉDITO"] || 0,
          countedPix: countedValues["PIX"] || 0,
          countedWallet: countedValues["CARTEIRA"] || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Não foi possível fechar o caixa");
        return;
      }

      const finalReport = await response.json();
      setCashierSummary(finalReport);
      setIsCashierOpen(false);
      setIsCashModalOpen(false);
      toast.success("Caixa fechado! Imprimindo resumo...");

      setTimeout(() => {
        window.print();
        setTimeout(() => {
          router.push("/");
        }, 500);
      }, 1000);
    } catch {
      toast.error("Sem conexão para fechar o caixa");
    }
  }, [countedValues, router]);

  const formatQty = (value: number) =>
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 3,
    });

  const adjustToStock = useCallback((id: string, stock: number) => {
    setCart((prev) => {
      if (stock <= 0) return prev.filter((item) => item.id !== id);
      return prev.map((item) =>
        item.id === id
          ? { ...item, quantity: stock, subtotal: stock * item.price, stock }
          : item,
      );
    });
    toast.success(
      stock > 0 ? `Quantidade ajustada para ${formatQty(stock)}` : "Item removido",
      { id: `stock-${id}` },
    );
  }, []);

  const warnOverStock = useCallback(
    (item: { id: string; name: string; unit?: string }, stock: number) => {
      const unit = item.unit || "UN";
      const available = formatQty(stock);
      toast.warning(item.name, {
        id: `stock-${item.id}`,
        description: `Estoque: ${available} ${unit}. Cancele o item ou ajuste a quantidade.`,
        duration: 15000,
        action: {
          label: `Ajustar para ${available}`,
          onClick: () => adjustToStock(item.id, stock),
        },
        cancel: {
          label: "Cancelar item",
          onClick: () => {
            setCart((prev) => prev.filter((line) => line.id !== item.id));
            toast.info("Item removido", { id: `stock-${item.id}` });
          },
        },
      });
    },
    [adjustToStock],
  );

  const openPayment = useCallback(() => {
    if (cart.length === 0) return;
    for (const item of cart) {
      const stock = Number(item.stock);
      if (Number.isFinite(stock) && item.quantity > stock) {
        warnOverStock(item, stock);
      }
    }
    setIsPaymentModalOpen(true);
  }, [cart, warnOverStock]);

  // atalhos teclado com travas de segurança
  const handleShortcuts = useCallback(
    (key: string) => {
      // --- MODAL DE PAGAMENTO ---
      if (isPaymentModalOpen) {
        switch (key) {
          case "F1":
            handleAddPayment("DINHEIRO", paymentInputValue);
            break;
          case "F2":
            handleAddPayment("DÉBITO", paymentInputValue);
            break;
          case "F3":
            handleAddPayment("CRÉDITO", paymentInputValue);
            break;
          case "F4":
            break;
          case "Escape":
            setIsPaymentModalOpen(false);
            break;
          case "Enter":
            if (remaingBalance === 0) finalizarVenda();
            break;
        }
        return; // bloqueia outras teclas enquanto modal de pagamento está aberto
      }

      // --- MODAL DE CONSULTA DE PRODUTOS ---
      if (isProductSearchOpen) {
        if (key === "Escape") {
          setIsProductSearchOpen(false);
          setSearchTerm("");
          setSearchResults([]);
        }
        return; // bloqueia outras teclas enquanto modal de consulta está aberto
      }

      // --- TELA DE VENDA NORMAL ---
      const isCartEmpty = cart.length === 0;

      switch (key) {
        case "F1":
          setIsProductSearchOpen(true);
          break;
        case "F4":
          if (isCartEmpty) {
            setModalType("SANGRIA");
            setIsCashModalOpen(true);
          } else {
            toast.error("Finalize a venda primeiro");
          }
          break;
        case "F5":
          if (isCartEmpty) {
            setModalType("APORTE");
            setIsCashModalOpen(true);
          } else {
            toast.error("Finalize a venda primeiro");
          }
          break;
        case "F8": // Cancelar Venda
          if (!isCartEmpty) {
            toast("Deseja realmente cancelar toda a venda?", {
              action: {
                label: "SIM, CANCELAR",
                onClick: () => {
                  setCart([]);
                  setPayments([]);
                  toast.success("Venda cancelada com sucesso!");
                },
              },
              cancel: {
                label: "NÃO",
                onClick: () => toast.dismiss(),
              },
              duration: 10000,
            });
          }
          break;
        case "F9":
          if (isCartEmpty) {
            setModalType("FECHAMENTO");
            setIsCashModalOpen(true);
          } else {
            toast.error("Finalize a venda primeiro");
          }
          break;
        case "F10":
          openPayment();
          break;
        case "Delete":
          removeLastItem();
          break;
      }
    },
    [
      isPaymentModalOpen,
      isProductSearchOpen,
      cart.length,
      paymentInputValue,
      remaingBalance,
      handleAddPayment,
      finalizarVenda,
      removeLastItem,
      openPayment,
    ],
  );


  const syncOfflineSales = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem("offlineSales") || "[]");
    setPendingCount(queue.length);

    if (queue.length === 0) return;

    console.log(`Sincronizando ${queue.length} vendas...`);
    const remainingSales = [];

    for (const sale of queue) {
      try {
        const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sale),
        });

        if (!response.ok) throw new Error();
      } catch (error) {
        remainingSales.push(sale);
      }
    }

    localStorage.setItem("offlineSales", JSON.stringify(remainingSales));
    setPendingCount(remainingSales.length);

    if (remainingSales.length === 0 && queue.length > 0) {
      toast.success("Todas as vendas sincronizadas!");
    }
  }, []);

  // Função para salvar offline quando a API falhar
  const handleOfflineSave = (saleData: any) => {
    const queue = JSON.parse(localStorage.getItem("offlineSales") || "[]");
    const newSale = {
      ...saleData,
      idTemporario: `OFF-${Date.now()}`,
      isOffline: true,
    };
    queue.push(newSale);
    localStorage.setItem("offlineSales", JSON.stringify(queue));
    setPendingCount(queue.length);
    return newSale;
  };

  // sincroniza venda (roda ao abrir a pagina)
  const syncProductsToLocal = useCallback(async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const products = await response.json();
        localStorage.setItem("localCatalog", JSON.stringify(products));
      }
    } catch (error) {
      console.log("Modo Offline: Usando catálogo local pré-existente.");
    }
  }, []);

  //efeitos de monitoramento
  useEffect(() => {
    // Sincroniza vendas e catálogo ao iniciar
    syncOfflineSales();
    syncProductsToLocal();

    const interval = setInterval(syncOfflineSales, 60000);

    const handleOnline = () => {
      toast.success("Conexão restabelecida! Sincronizando...");
      syncOfflineSales();
      syncProductsToLocal();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
    };
  }, [syncOfflineSales, syncProductsToLocal]);

  // adiciona ao carrinho
  const addToCart = (product: Product, qty: number = 1) => {
    if (product.isActive === false) {
      toast.error("Este produto está inativo e não pode ser vendido!");
      return;
    }
    const stock = Number(product.stock);
    let overStock = false;
    let addedQuantity = qty;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const newQuantity = existing ? existing.quantity + qty : qty;
      addedQuantity = newQuantity;
      overStock = Number.isFinite(stock) && newQuantity > stock;

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
              stock: Number.isFinite(stock) ? stock : item.stock,
            }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...product,
          stock: Number.isFinite(stock) ? stock : product.stock,
          quantity: qty,
          subtotal: qty * product.price,
        },
      ];
    });

    if (overStock) {
      warnOverStock(product, stock);
      return;
    }
    toast.success(`${formatQty(addedQuantity)}x ${product.name}`, {
      id: `success-${product.id}`,
    });
  };

  // remove item específico
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    toast.info("Item removido", { icon: "🗑️" });
  };

  // busca produto pelo código de barras ou nome
  const handleSearchProduct = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const inputVal = barcode.trim();
    if (!inputVal) return;

    let quantityToLoad = 1;
    let codeToSearch = inputVal;
    let isScaleLabel = false;
    let priceFromLabel = 0;

    // identifica tipo de entrada
    if (inputVal.length === 13 && inputVal.startsWith("2")) {
      isScaleLabel = true;
      codeToSearch = inputVal.substring(1, 6);
      priceFromLabel = parseFloat(inputVal.substring(6, 11)) / 100;
    } else if (inputVal.includes("*")) {
      const parts = inputVal.split("*");
      quantityToLoad = parseFloat(parts[0].replace(",", ".")) || 1;
      codeToSearch = parts[1];
    }

    if (!codeToSearch) return;

    // busca no localStorage offline
    const localCatalog = JSON.parse(
      localStorage.getItem("localCatalog") || "[]",
    );
    const product = localCatalog.find((p: Product) => {
      const searchTerm = codeToSearch.toLowerCase();

      // Verifica código de barras
      const isBarcode = (p.barCode ?? "").toLowerCase() === searchTerm;


      // Verifica se o termo está contido no nome do produto
      const isName = p.name.toLowerCase().includes(searchTerm);

      return isBarcode || isName;
    });

    if (product) {
      if (product.isActive === false) {
        toast.error("Produto inativado no estoque!");
        setBarcode("");
        return;
      }
      if (isScaleLabel) {
        const productUnitPrice = product.price / 100;
        quantityToLoad = priceFromLabel / productUnitPrice;
      }
      addToCart(product, quantityToLoad);
      setBarcode("");
      return;
    }

    // busca na api se não achou no cache ou se tem internet
    try {
      const response = await fetch(
        `/api/products/search/${encodeURIComponent(codeToSearch)}`,
      );
      if (response.ok) {
        const data = await response.json();
        const list: Product[] = Array.isArray(data) ? data : [data];
        const exact = list.find(
          (item) =>
            (item.barCode ?? "").toLowerCase() === codeToSearch.toLowerCase(),
        );
        const apiProduct = exact ?? (list.length === 1 ? list[0] : undefined);

        if (!apiProduct) {
          toast.error("Vários produtos encontrados. Use F1 para escolher.");
        } else {
          if (isScaleLabel) {
            const productUnitPrice = apiProduct.price / 100;
            quantityToLoad = priceFromLabel / productUnitPrice;
          }

          addToCart(apiProduct, quantityToLoad);
        }
      } else {
        toast.error("Produto não encontrado");
      }
    } catch (error) {
      toast.error("Offline: Produto não encontrado no catálogo local");
    }

    setBarcode("");
  };

  // Monitor do Navegador
  useEffect(() => {
    // 1. Tenta sincronizar ao abrir o sistema
    syncOfflineSales();

    // 2. Escuta quando a internet volta
    const handleOnline = () => {
      toast.success("Conexão restabelecida!");
      syncOfflineSales();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncOfflineSales]);

  // Sincroniza catálogo de produtos para uso offline
  useEffect(() => {
    const syncCatalog = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data = await response.json();
          // Salva uma cópia de segurança para o modo offline
          localStorage.setItem("localCatalog", JSON.stringify(data));
          console.log("Catálogo sincronizado para uso offline.");
        }
      } catch (error) {
        console.log("Modo Offline: Não foi possível atualizar o catálogo.");
      }
    };

    syncCatalog();
  }, []);

  // atalhos teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const blockedKeys = ["F1", "F2", "F3", "F4", "F5", "F8", "F9", "F10"];

      if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        handleShortcuts(e.key); // <-- AQUI NÓS CONECTAMOS A FUNÇÃO
      }

      if (e.key === "Escape") handleShortcuts("Escape");
      if (e.key === "Delete") removeLastItem();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShortcuts, removeLastItem]);

  // Foco automático
  useEffect(() => {
    if (!isPaymentModalOpen && window.innerWidth > 768)
      inputRef.current?.focus();
  }, [isPaymentModalOpen]);

  // define o valor no momento em que o modal abre
  useEffect(() => {
    if (isPaymentModalOpen && payments.length === 0) {
      setPaymentInputValue(remaingBalance);
    }
  }, [isPaymentModalOpen]);

  // Função para processar Sangria, Aporte e Fechamento
  const handleProcessMovement = useCallback(
    async (
      type: "SANGRIA" | "APORTE" | "FECHAMENTO",
      value: number,
      obs: string,
    ) => {
      if (type === "FECHAMENTO") return;

      try {
        const response = await fetch("/api/cashier/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            value,
            note: obs,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          toast.error(data.error || "Erro ao processar movimentação");
          return;
        }

        toast.success(
          `${type} de ${(value / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })} registrado!`,
        );
      } catch {
        toast.error("Sem conexão para registrar a movimentação");
      } finally {
        setIsCashModalOpen(false);
      }
    },
    [],
  );

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Botão de Voltar Inteligente */}
        <button
          onClick={() => {
            if (cart.length > 0) {
              toast.error("Cancele a venda atual antes de sair!");
            } else {
              router.push("/");
            }
          }}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-all group"
          title="Voltar ao Menu"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>

        <h1 className="text-xl font-black text-gray-800 tracking-tighter uppercase">
          Frente de Caixa
        </h1>
      </div>
      {/* Se o caixa não estiver aberto, mostra apenas o modal de abertura */}
      {cashierReady && !isCashierOpen && (
        <OpenCashierModal
          isOpen={true}
          onOpen={handleOpenCashier}
          onCancel={() => router.push("/")}
        />
      )}
      <div className="h-[100dvh] bg-gray-100 font-sans overflow-hidden flex flex-col lg:flex-row p-2 lg:p-4 gap-2 lg:gap-4">
        {/* COLUNA ESQUERDA: LISTA DE PRODUTOS */}
        <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden order-2 lg:order-1 h-full">
          <div className="p-3 border-b bg-blue-600 text-white flex justify-between items-center shrink-0">
            <h1 className="text-sm lg:text-xl font-bold italic">
              🛒 PDV ATIVO
            </h1>
            {/* MOSTRANDO O PENDING COUNT AQUI */}
            {pendingCount > 0 && (
              <span className="text-[10px] bg-red-500 animate-pulse px-2 py-1 rounded font-bold">
                {pendingCount} SYNC PENDENTE
              </span>
            )}
            <span className="text-xs bg-blue-900 px-2 py-1 rounded">
              CAIXA LIVRE
            </span>
          </div>

          {/* Componente extraído */}
          <CartTable cart={cart} removeFromCart={removeFromCart} />
        </div>

        {/* COLUNA DIREITA: BUSCA E TOTAL */}
        {/* COLUNA DIREITA: BUSCA, ATALHOS E TOTAL */}
        <div className="w-full lg:w-[450px] flex flex-col gap-2 lg:gap-4 order-1 lg:order-2 shrink-0 h-full">
          {/* 1. CAMPO DE BUSCA */}
          <div className="bg-white p-3 lg:p-6 rounded-lg shadow-sm border-t-4 border-blue-600">


            <form onSubmit={handleSearchProduct}>
              <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                Bipar item ou buscar
              </label>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-3 lg:p-4 text-xl lg:text-4xl font-mono focus:border-blue-600 outline-none bg-gray-50 uppercase"
                placeholder="CÓDIGO / NOME"
              />
            </form>
          </div>

          {/* 2. TECLAS DE AJUDA, OPERAÇÕES E CANCELAMENTO */}
          <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto content-start">
            {[
              {
                key: "F1",
                label: "CONSULTA (PREÇO)",
                color: "bg-white",
                disabled: false,
              },
              {
                key: "F5",
                label: "APORTE",
                color: "bg-green-50",
                disabled: cart.length > 0,
              },
              {
                key: "F4",
                label: "SANGRIA",
                color: "bg-red-50",
                disabled: cart.length > 0,
              },
              {
                key: "DEL",
                label: "REMOVER ITEM",
                color: "bg-orange-50",
                disabled: cart.length === 0,
              },
              {
                key: "F8",
                label: "CANCELAR VENDA",
                color: "bg-red-600 text-white",
                disabled: cart.length === 0,
              },
              {
                key: "F9",
                label: "FECHAMENTO",
                color: "bg-gray-100",
                disabled: cart.length > 0,
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  handleShortcuts(item.key === "DEL" ? "Delete" : item.key)
                }
                disabled={item.disabled}
                className={`${item.color
                  } p-3 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm transition-all ${item.disabled
                    ? "opacity-30 cursor-not-allowed grayscale"
                    : "hover:border-blue-500 active:scale-95"
                  }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase ${item.key === "F8" ? "text-white" : "text-gray-500"
                    }`}
                >
                  {item.label}
                </span>
                <kbd
                  className={`px-2 py-1 rounded text-xs font-black border-b-2 ${item.key === "F8"
                    ? "bg-red-800 border-red-900"
                    : "bg-white border-gray-300"
                    }`}
                >
                  {item.key}
                </kbd>
              </button>
            ))}
          </div>

          {/* 3. BLOCO FINANCEIRO (TOTAL + BOTÃO) - Fica na parte de baixo */}
          <div className="bg-blue-900 text-white p-4 lg:p-6 rounded-xl shadow-lg flex flex-col gap-4 mt-auto">
            <div className="flex flex-col border-b border-blue-800 pb-4">
              <span className="text-blue-200 text-xs lg:text-sm uppercase font-bold tracking-widest">
                Total a Pagar
              </span>
              <div className="text-4xl lg:text-6xl font-black tabular-nums">
                {(total / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>

            <button
              onClick={openPayment}
              disabled={cart.length === 0}
              className={`w-full py-5 lg:py-6 rounded-xl text-lg lg:text-2xl font-black uppercase transition-all active:scale-95 flex flex-col items-center justify-center leading-tight ${cart.length === 0
                ? "bg-blue-800 text-blue-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-400 text-white shadow-inner"
                }`}
            >
              <span>FINALIZAR VENDA</span>
              <span className="text-[10px] opacity-70">PRESSIONE F10</span>
            </button>
          </div>
        </div>

        {/* MODAIS GERENCIADOS POR ESTADO */}
        {isPaymentModalOpen && (
          <PaymentModal
            total={total}
            remaingBalance={remaingBalance}
            change={change}
            payments={payments}
            paymentInputValue={paymentInputValue}
            setPaymentInputValue={setPaymentInputValue}
            onClose={() => setIsPaymentModalOpen(false)}
            handleAddPayment={handleAddPayment}
            onFinalize={finalizarVenda}
            customer={customer}
            setCustomer={setCustomer}
          />
        )}

        <CashierModal
          isOpen={isCashModalOpen && modalType !== "FECHAMENTO"}
          type={modalType}
          onClose={() => setIsCashModalOpen(false)}
          onConfirm={handleProcessMovement}
        />

        {/* Componente de Impressão Invisível */}
        <SaleReceipt lastSale={lastSale} store={store} printWidth={printSize} />

        {/* Área de Impressão do Fechamento (Só renderiza se o summary existir) */}
        {/* Área de Impressão do Fechamento (Suporte dinâmico para 58mm e 80mm) */}
        {cashierSummary && (
          <>
            {/* 1. Injeta a regra de tamanho de página do navegador para não cortar margens */}
            <style jsx global>{`
              @media print {
                @page {
                  size: ${printSize} auto;
                  margin: 0;
                }
              }
            `}</style>

            {/* 2. Container principal com largura e fonte dinâmicas */}
            <div
              id="printable-area"
              className={`print-area hidden print:block text-black mx-auto p-[2mm] font-mono leading-tight bg-white ${printerStyles.width} ${printerStyles.text}`}
            >
              <div className="text-center border-b-2 border-black pb-2 mb-2">
                <p className={`font-bold uppercase ${printerStyles.headerText}`}>{store.tradeName}</p>
                <p className="text-[9px]">{store.address}</p>
                <p className="text-[9px]">CNPJ: {store.cnpj}</p>
                <h2 className={`font-bold uppercase tracking-tight mt-2 ${printerStyles.headerText}`}>
                  Resumo de Fechamento
                </h2>
                <p className="text-[9px]">
                  {new Date(cashierSummary.closedAt).toLocaleString("pt-BR")}
                </p>
              </div>

              <div className="space-y-1 my-2">
                {Object.entries(cashierSummary.salesByMethod).map(
                  ([method, value]) => (
                    <div
                      key={method}
                      className="flex justify-between"
                    >
                      <span>{method}:</span>
                      <span>
                        {(value / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ),
                )}
                <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
                  <span>TOTAL VENDIDO:</span>
                  <span>
                    {(cashierSummary.totalSold / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-3 border-t border-black pt-2 space-y-1">
                <p className="font-bold text-[9px] uppercase mb-1">
                  Conferência
                </p>
                {CONFERENCE_METHODS.map((method) => {
                  const diff = cashierSummary.differences[method];
                  if (
                    expectedAmount(cashierSummary, method) === 0 &&
                    cashierSummary.countedValues[method] === 0
                  ) {
                    return null;
                  }

                  return (
                    <div key={method} className="border-b border-black/20 pb-1">
                      <div className="flex justify-between font-bold">
                        <span>{method}</span>
                        <span>
                          {diff === 0
                            ? "OK"
                            : `${differenceLabel(diff)} ${(Math.abs(diff) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>ESPERADO</span>
                        <span>
                          {(expectedAmount(cashierSummary, method) / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>CONTADO</span>
                        <span>
                          {(cashierSummary.countedValues[method] / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {cashierSummary.differences.DINHEIRO !== 0 && (
                  <div className="pt-1">
                    <p className="font-bold text-[9px] uppercase">Dinheiro esperado</p>
                    {cashDrawerLines(cashierSummary).map((line) => (
                      <div key={line.label} className="flex justify-between">
                        <span>{line.label.toUpperCase()}</span>
                        <span>
                          {(line.value / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Área de assinatura e respiro para o corte da bobina */}
              <div className="mt-8 text-center border-t border-black pt-3">
                <p className="text-[9px] uppercase">
                  __________________________
                </p>
                <p className="text-[9px] uppercase font-bold mt-0.5">
                  Assinatura do Operador
                </p>
                <div className="h-8" aria-hidden="true"></div>
              </div>
            </div>
          </>
        )}

        {/* MODAL DE CONSULTA DE PRODUTOS (F1) */}
        {isProductSearchOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[200] pt-20 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
              <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="font-bold uppercase italic">
                  🔍 Consulta de Preços
                </h3>
                <button
                  onClick={() => {
                    setIsProductSearchOpen(false);
                    setSearchTerm("");
                    setSearchResults([]);
                  }}
                  className="text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <input
                  autoFocus
                  type="text"
                  placeholder="Digite o nome ou bipe o código..."
                  className="w-full border-2 border-blue-100 rounded-xl p-4 text-2xl outline-none focus:border-blue-600 uppercase"
                  value={searchTerm}
                  onChange={(e) => handleProductLookup(e.target.value)}
                />

                <div className="mt-4 max-h-[400px] overflow-y-auto">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center p-4 border-b hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-bold text-lg uppercase">{p.name}</p>
                        <p className="text-sm text-gray-400 font-mono">
                          {p.barCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-700">
                          {(p.price / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                        <p
                          className={`text-xs font-bold ${p.stock > 0 ? "text-green-500" : "text-red-500"
                            }`}
                        >
                          ESTOQUE: {p.stock}
                        </p>
                      </div>
                    </div>
                  ))}
                  {searchTerm.length > 1 && searchResults.length === 0 && (
                    <p className="text-center py-8 text-gray-400">
                      Nenhum produto encontrado.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gray-50 text-center text-[10px] text-gray-400 uppercase font-bold">
                Pressione ESC para sair
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 max-h-[400px] overflow-y-auto">
          {searchResults.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center p-4 border-b hover:bg-gray-50"
            >
              <div>
                <p className="font-bold text-lg uppercase">{p.name}</p>
                <p className="text-sm text-gray-400 font-mono">{p.barCode ?? ""}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-blue-700">
                  {(p.price / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <p
                  className={`text-xs font-bold ${p.stock > 0 ? "text-green-500" : "text-red-500"
                    }`}
                >
                  ESTOQUE: {p.stock}
                </p>

                {/* Botão para inserir na compra */}
                <button
                  onClick={() => {
                    addToCart(p);
                    setIsProductSearchOpen(false);
                    setSearchTerm("");
                    setSearchResults([]);
                  }}
                  disabled={!p.isActive}
                  className={`mt-2 px-3 py-1 rounded text-xs font-bold ${p.isActive
                    ? "bg-green-600 text-white hover:bg-green-500"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Inserir na compra
                </button>
              </div>
            </div>
          ))}
          {searchTerm.length > 1 && searchResults.length === 0 && (
            <p className="text-center py-8 text-gray-400">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
        {/* MODAL DE CONFERÊNCIA DE VALORES (FECHAMENTO) */}
        {modalType === "FECHAMENTO" && isCashModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[250] p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">
                    Conferência de Caixa
                  </h2>
                  <p className="text-xs text-gray-400">
                    Informe o valor conferido de cada meio
                  </p>
                </div>
                <button
                  onClick={() => setIsCashModalOpen(false)}
                  className="text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {CONFERENCE_METHODS.map((method) => (
                  <div key={method} className="flex items-center gap-4">
                    <label className="w-28 font-bold text-gray-600 text-sm">
                      {method}
                    </label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        className="w-full border-2 border-gray-200 rounded-lg py-3 pl-10 pr-4 text-xl font-mono focus:border-blue-600 outline-none"
                        onChange={(e) => {
                          const val = Math.round(
                            parseFloat(e.target.value || "0") * 100,
                          );
                          setCountedValues((prev) => ({
                            ...prev,
                            [method]: val,
                          }));
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t">
                  <button
                    onClick={() => handleFinalCashierProcess()}
                    className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-xl shadow-lg transition-all active:scale-95"
                  >
                    CONFIRMAR E IMPRIMIR RESUMO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div>
          {/* ... resto do PDV ... */}
          {lastSale && <SaleReceipt lastSale={lastSale} store={store} printWidth={printSize} />}
        </div>
      </div>
    </>
  );
}
