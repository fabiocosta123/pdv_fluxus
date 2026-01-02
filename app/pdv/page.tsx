"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CashierModal } from "./components/CashierModal";
import { CartTable } from "./components/CartTable";
import { PaymentModal } from "./components/PaymentModal";
import { Receipt } from "./components/Receipt";
import { OpenCashierModal } from "./components/OpenCashierModal";

interface Product {
  id: string;
  name: string;
  price: number;
  barCode: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}

export default function PDVPage() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<{ method: string; value: number }[]>(
    []
  );
  const [paymentInputValue, setPaymentInputValue] = useState(0);
  const [lastSale, setLastSale] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    "SANGRIA" | "APORTE" | "FECHAMENTO"
  >("SANGRIA");
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Totais calculados
  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0);
  const remaingBalance = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

  // checa abertura modal de abertura de caixa
  useEffect(() => {
    const savedCashier = localStorage.getItem("cashier_status");
    if (savedCashier === "open") {
      setIsCashierOpen(true);
    }
  }, []);

  // Função para processar a abertura
  const handleOpenCashier = (initialValue: number) => {
    // Aqui futuramente você enviará para sua API
    localStorage.setItem("cashier_status", "open");
    localStorage.setItem("cashier_opening_value", initialValue.toString());

    setIsCashierOpen(true);
    toast.success("Caixa aberto com sucesso!");
  };

  // Função de busca para o modal F1
  const handleProductLookup = (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const localCatalog = JSON.parse(
      localStorage.getItem("localCatalog") || "[]"
    );
    const filtered = localCatalog.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        p.barCode.includes(term)
    );
    setSearchResults(filtered);
  };

  const handleAddPayment = useCallback((method: string, amount: number) => {
    if (amount <= 0) return;

    setPayments((prev) => [...prev, { method, value: amount }]);
    toast.info(
      `${method}: ${(amount / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} registrado!`
    );
  }, []);

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
      createdAt: saleDate,
    };

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
      } else {
        throw new Error();
      }
    } catch (error) {
      const vendaOff = handleOfflineSave(saleData);
      setLastSale({ id: vendaOff.idTemporario, ...saleData, date: saleDate });
      toast.warning("Venda salva no notebook (Offline)!", { id: toastId });
    } finally {
      // Pequeno delay para o React renderizar o conteúdo do cupom escondido
      setTimeout(() => {
        window.print();
        // Limpeza após o comando de impressão ser enviado
        setCart([]);
        setPayments([]);
        setIsPaymentModalOpen(false);
        setBarcode("");
      }, 300);
    }
  }, [cart, payments, total, totalPaid, change, remaingBalance]);

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

  // atalhos teclado com travas de segurança
  const handleShortcuts = useCallback(
  (key: string) => {
    //SE O MODAL DE PAGAMENTO ESTIVER ABERTO
    if (isPaymentModalOpen) {
      switch (key) {
        case "F1": handleAddPayment("DINHEIRO", paymentInputValue); break;
        case "F2": handleAddPayment("DÉBITO", paymentInputValue); break;
        case "F3": handleAddPayment("CRÉDITO", paymentInputValue); break;
        case "F4": handleAddPayment("PIX", paymentInputValue); break;
        case "Escape": setIsPaymentModalOpen(false); break;
        case "Enter": if (remaingBalance === 0) finalizarVenda(); break;
      }
      return; // Para a execução aqui se o modal estiver aberto
    }

    //SE O MODAL DE CONSULTA (F1) ESTIVER ABERTO
    if (isProductSearchOpen) {
      if (key === "Escape") {
        setIsProductSearchOpen(false);
        setSearchTerm("");
        setSearchResults([]);
      }
      return;
    }

    // TELA DE VENDA NORMAL
    const isCartEmpty = cart.length === 0;

    switch (key) {
      case "F1": setIsProductSearchOpen(true); break;
      case "F4": 
        if (isCartEmpty) { setModalType("SANGRIA"); setIsCashModalOpen(true); } 
        else { toast.error("Finalize a venda primeiro"); }
        break;
      case "F5": 
        if (isCartEmpty) { setModalType("APORTE"); setIsCashModalOpen(true); } 
        else { toast.error("Finalize a venda primeiro"); }
        break;
      case "F8": // Cancelar Venda
        if (!isCartEmpty) {
          if (confirm("Deseja realmente cancelar toda a venda?")) {
            setCart([]);
            setPayments([]);
            toast.info("Venda cancelada");
          }
        }
        break;
      case "F9":
        if (isCartEmpty) { setModalType("FECHAMENTO"); setIsCashModalOpen(true); } 
        else { toast.error("Finalize a venda primeiro"); }
        break;
      case "F10":
        if (!isCartEmpty) setIsPaymentModalOpen(true);
        break;
      case "Delete":
        removeLastItem();
        break;
    }
  },
  [
    isPaymentModalOpen, isProductSearchOpen, cart.length, 
    paymentInputValue, remaingBalance, handleAddPayment, 
    finalizarVenda, removeLastItem
  ]
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
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const newQuantity = existing ? existing.quantity + qty : qty;

      // AVISO DE ESTOQUE (Apenas se a quantidade total no carrinho superar o estoque)
      if (newQuantity > product.stock) {
        toast.warning(`Estoque baixo: ${product.stock} un.`, {
          id: `stock-${product.id}`,
        });
      }

      toast.success(`${newQuantity}x ${product.name}`, {
        id: `success-${product.id}`,
      });

      //ATUALIZAÇÃO DO ESTADO
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * item.price,
              }
            : item
        );
      }

      return [
        ...prev,
        { ...product, quantity: qty, subtotal: qty * product.price },
      ];
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
      localStorage.getItem("localCatalog") || "[]"
    );
    const product = localCatalog.find(
      (p: Product) => p.barCode === codeToSearch || p.id === codeToSearch
    );

    if (product) {
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
        `/api/products/${encodeURIComponent(codeToSearch)}`
      );
      if (response.ok) {
        const apiProduct = await response.json();

        if (isScaleLabel) {
          const productUnitPrice = apiProduct.price / 100;
          quantityToLoad = priceFromLabel / productUnitPrice;
        }

        addToCart(apiProduct, quantityToLoad);
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

  useEffect(() => {
    if (isPaymentModalOpen) setPaymentInputValue(remaingBalance);
  }, [isPaymentModalOpen, remaingBalance]);

  // Função para processar Sangria, Aporte e Fechamento
  const handleProcessMovement = useCallback(
    async (
      type: "SANGRIA" | "APORTE" | "FECHAMENTO",
      value: number,
      obs: string
    ) => {
      const movementData = {
        id: `MOV-${Date.now()}`,
        type,
        value,
        description: obs,
        createdAt: new Date().toISOString(),
      };

      try {
        //Salva no histórico local (para o fechamento do dia)
        const history = JSON.parse(
          localStorage.getItem("cashier_history") || "[]"
        );
        history.push(movementData);
        localStorage.setItem("cashier_history", JSON.stringify(history));

        // Lógica específica para Fechamento
        if (type === "FECHAMENTO") {
          localStorage.removeItem("cashier_status"); // Fecha o caixa no sistema
          setIsCashierOpen(false); // Bloqueia a tela do PDV
          toast.success("Caixa fechado com sucesso!");

          // Opcional: imprimir resumo de fechamento
          window.print();
        } else {
          toast.success(
            `${type} de ${(value / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })} registrado!`
          );
        }

        // 3. Tenta enviar para o servidor (Opcional por enquanto)
        // await fetch("/api/cashier/movements", { method: "POST", body: JSON.stringify(movementData) });
      } catch (error) {
        toast.error("Erro ao processar movimentação");
      } finally {
        setIsCashModalOpen(false);
      }
    },
    []
  );

  return (
    <>
      {/* Se o caixa não estiver aberto, mostra apenas o modal de abertura */}
      {!isCashierOpen && (
        <OpenCashierModal isOpen={true} onOpen={handleOpenCashier} />
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
                className={`${
                  item.color
                } p-3 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm transition-all ${
                  item.disabled
                    ? "opacity-30 cursor-not-allowed grayscale"
                    : "hover:border-blue-500 active:scale-95"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase ${
                    item.key === "F8" ? "text-white" : "text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
                <kbd
                  className={`px-2 py-1 rounded text-xs font-black border-b-2 ${
                    item.key === "F8"
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
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className={`w-full py-5 lg:py-6 rounded-xl text-lg lg:text-2xl font-black uppercase transition-all active:scale-95 flex flex-col items-center justify-center leading-tight ${
                cart.length === 0
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
          />
        )}

        <CashierModal
          isOpen={isCashModalOpen}
          type={modalType}
          onClose={() => setIsCashModalOpen(false)}
          onConfirm={handleProcessMovement}
        />

        {/* Componente de Impressão Invisível */}
        <Receipt lastSale={lastSale} />

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
                          className={`text-xs font-bold ${
                            p.stock > 0 ? "text-green-500" : "text-red-500"
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
      </div>
    </>
  );
}
