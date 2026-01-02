"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";

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

  const inputRef = useRef<HTMLInputElement>(null);

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

  // Totais calculados
  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0);
  const remaingBalance = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

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
      if (["F1", "F8", "F10", "Delete"].includes(e.key)) e.preventDefault();

      if (isPaymentModalOpen) {
        if (e.key === "Escape") setIsPaymentModalOpen(false);
        if (e.key === "Enter" && remaingBalance === 0) finalizarVenda();
        if (e.key === "F1") handleAddPayment("DINHEIRO", paymentInputValue);
        if (e.key === "F2") handleAddPayment("DÉBITO", paymentInputValue);
        if (e.key === "F3") {
          e.preventDefault()
          handleAddPayment("CRÉDITO", paymentInputValue);
        }
        if (e.key === "F4") handleAddPayment("PIX", paymentInputValue);
      } else {
        if (e.key === "F10" && cart.length > 0) setIsPaymentModalOpen(true);
        if (e.key === "Delete") removeLastItem();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPaymentModalOpen,
    cart,
    paymentInputValue,
    remaingBalance,
    handleAddPayment,
    finalizarVenda,
    removeLastItem,
  ]);

  // Foco automático
  useEffect(() => {
    if (!isPaymentModalOpen && window.innerWidth > 768)
      inputRef.current?.focus();
  }, [isPaymentModalOpen]);

  useEffect(() => {
    if (isPaymentModalOpen) setPaymentInputValue(remaingBalance);
  }, [isPaymentModalOpen, remaingBalance]);

  return (
    <div className="h-[100dvh] bg-gray-100 font-sans overflow-hidden flex flex-col lg:flex-row p-2 lg:p-4 gap-2 lg:gap-4">
      {/* --- COLUNA ESQUERDA: LISTA DE PRODUTOS --- */}
      {/* Mobile: Ordem 2 (fica abaixo do input se quiser, Desktop: Ordem 1 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden order-2 lg:order-1 h-full">
        <div className="p-3 border-b bg-blue-600 text-white flex justify-between items-center shrink-0">
          <h1 className="text-sm lg:text-xl font-bold italic">🛒 PDV ATIVO</h1>
          <span className="text-XS lg:text-xs bg-blue-900 px-2 py-1 rounded">
            CAIXA LIVRE
          </span>
        </div>

        <div className="flex-1 overflow-auto p-2 lg:p-4 scrollbar-thin">
          <table className="w-full table-fixed">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase font-bold text-left border-b">
                <th className="w-16 py-2 px-2">Item</th>
                <th className="w-1/2 px-2">Descrição</th>
                <th className="w-20 text-center px-2">Qtd</th>
                <th className="w-32 text-right hidden sm:table-cell px-2">
                  Unit.
                </th>
                <th className="w-32 text-right px-2">Total</th>
                <th className="w-12 text-center lg:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cart.map((item, index) => (
                <tr
                  key={item.id}
                  className="text-sm lg:text-lg font-bold hover:bg-gray-50 group"
                >
                  {/* ITEM + DESCRIÇÃO - Ajustado Alinhamento */}
                  <td className="py-4 px-2 font-mono text-gray-400">
                    {String(index + 1).padStart(3, "0")}
                  </td>
                  <td className="py-4 px-2 overflow-hidden">
                    <div className="flex flex-col truncate">
                      <span className="uppercase text-blue-900 truncate">
                        {item.name}
                      </span>
                      {item.quantity > item.stock && (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                          <AlertTriangle size={12} /> ESTOQUE: {item.stock}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* QUANTIDADE */}
                  <td className="text-center px-2 text-gray-700 font-mono">
                    {/* Se for inteiro mostra normal, se for decimal mostra 3 casas */}
                    {Number.isInteger(item.quantity)
                      ? item.quantity
                      : item.quantity.toLocaleString("pt-BR", {
                          minimumFractionDigits: 3,
                        })}
                  </td>

                  {/* UNITÁRIO -*/}
                  <td className="text-right hidden sm:table-cell text-gray-500 font-mono">
                    {(item.price / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>

                  {/* TOTAL DO ITEM */}
                  <td className="text-right text-blue-700 font-mono pr-4">
                    {(item.subtotal / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>

                  {/* REMOVER */}
                  <td className="text-center w-10 lg:hidden">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- COLUNA DIREITA: AÇÕES E TOTAL --- */}
      {/* Mobile: Ordem 1 (Fica no topo ou fundo, aqui fixo) | Desktop: Largura 450px */}
      <div className="w-full lg:w-[450px] flex flex-col gap-2 lg:gap-4 order-1 lg:order-2 shrink-0">
        {/* Input de busca*/}
        <div className="bg-white p-3 lg:p-6 rounded-lg shadow-sm border-t-4 border-blue-600">
          <label className="hidden lg:block text-sm font-black text-blue-900 mb-2 uppercase">
            Código de Barras
          </label>
          <form onSubmit={handleSearchProduct}>
            <input
              ref={inputRef}
              type="text"
              // inputMode="numeric" ajuda no celular a abrir teclado numérico
              inputMode="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 lg:p-4 text-xl lg:text-4xl font-mono focus:border-blue-600 outline-none bg-gray-50 uppercase placeholder:text-sm lg:placeholder:text-xl"
              placeholder="Digitar Código ou nome..."
            />
          </form>
        </div>

        {/* Painel de Total e Botão Finalizar */}
        <div className="bg-blue-900 text-white p-4 lg:p-8 rounded-xl shadow-lg flex flex-row lg:flex-col items-center lg:items-stretch justify-between lg:justify-end gap-4 lg:flex-1 relative overflow-hidden">
          {/* Total Mobile (Esquerda) */}
          <div className="flex flex-col z-10">
            <span className="text-blue-200 text-xs lg:text-2xl uppercase font-bold">
              Total a Pagar
            </span>
            <div className="text-4xl lg:text-4xl font-black leading-none tracking-tight">
              {(total / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </div>

          {/* Botão Finalizar */}
          <button
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className={`py-3 px-6 lg:py-6 rounded-xl text-sm lg:text-3xl font-black uppercase transition-all shadow-lg active:scale-95 z-10 ${
              cart.length === 0
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-400"
            }`}
          >
            <span className="lg:hidden">Pagar</span>
            <span className="hidden lg:inline">FINALIZAR (F10)</span>
          </button>
        </div>
      </div>

      {/* --- MODAL DE PAGAMENTO RESPONSIVO --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-sm flex items-end lg:items-center justify-center z-[100] p-0 lg:p-4">
          <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
            {/* Cabeçalho Modal */}
            <div className="p-4 lg:p-6 bg-gray-100 border-b flex justify-between items-center rounded-t-3xl">
              <h2 className="text-lg lg:text-2xl font-black text-blue-800 uppercase">
                Pagamento
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="bg-gray-300 p-2 rounded-full hover:bg-red-100 text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Corpo Modal (Scrollável no mobile) */}
            <div className="p-4 lg:p-8 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                {/* Coluna Valores */}
                <div className="space-y-4 lg:space-y-8">
                  <div className="text-center lg:text-left">
                    <p className="text-gray-500 uppercase font-bold text-[10px] lg:text-xs">
                      Total Geral
                    </p>
                    <p className="text-4xl lg:text-5xl font-black text-blue-600">
                      {(total / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>

                  <div className="bg-white p-3 lg:p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <p className="text-gray-600 uppercase font-bold text-[10px] lg:text-xs mb-1">
                      Valor a Lançar
                    </p>
                    <div className="flex items-center justify-center lg:justify-start">
                      <span className="text-2xl lg:text-4xl font-black text-blue-900 mr-2">
                        R$
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        autoFocus
                        // Usamos step para evitar avisos de validação de decimais do navegador
                        step="0.01"
                        value={(paymentInputValue / 100).toFixed(2)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setPaymentInputValue(0);
                          } else {
                            // Convertemos para centavos imediatamente para evitar erros de ponto flutuante
                            setPaymentInputValue(
                              Math.round(parseFloat(val) * 100)
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          // Atalho: Enter no valor de pagamento adiciona como DINHEIRO por padrão
                          if (e.key === "Enter" && paymentInputValue > 0) {
                            handleAddPayment("DINHEIRO", paymentInputValue);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => { if(!paymentInputValue) setPaymentInputValue(0) }}
                        className="text-4xl lg:text-5xl font-black text-gray-900 outline-none w-full bg-transparent text-center lg:text-left"
                      />
                    </div>
                  </div>

                  {/* Saldos */}
                  <div className="flex justify-between lg:justify-start lg:gap-6 bg-gray-100 lg:bg-transparent p-3 rounded-lg lg:p-0">
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold">
                        Falta Pagar
                      </p>
                      <p
                        className={`text-xl lg:text-2xl font-black ${
                          remaingBalance > 0 ? "text-red-600" : "text-green-500"
                        }`}
                      >
                        {(remaingBalance / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                    {change > 0 && (
                      <div className="text-right lg:text-left">
                        <p className="text-blue-600 text-[10px] uppercase font-bold">
                          Troco
                        </p>
                        <p className="text-xl lg:text-2xl font-black text-blue-600">
                          {(change / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Pagamento */}
                <div className="flex flex-col gap-2 lg:gap-3">
                  <p className="lg:hidden text-xs font-bold text-gray-500 uppercase text-center mt-2">
                    Selecione a forma:
                  </p>
                  <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col">
                    <button
                      onClick={() =>
                        handleAddPayment("DINHEIRO", paymentInputValue)
                      }
                      className="bg-green-100 text-green-800 p-3 lg:p-5 rounded-xl font-bold border border-green-200 hover:bg-green-200 flex justify-between items-center"
                    >
                      <span>💵 Dinheiro</span>{" "}
                      <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">
                        F1
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        handleAddPayment("DÉBITO", paymentInputValue)
                      }
                      className="bg-blue-100 text-blue-800 p-3 lg:p-5 rounded-xl font-bold border border-blue-200 hover:bg-blue-200 flex justify-between items-center"
                    >
                      <span>💳 Débito</span>{" "}
                      <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">
                        F2
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        handleAddPayment("CRÉDITO", paymentInputValue)
                      }
                      className="bg-orange-100 text-orange-800 p-3 lg:p-5 rounded-xl font-bold border border-orange-200 hover:bg-orange-200 flex justify-between items-center"
                    >
                      <span>💳 Crédito</span>{" "}
                      <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">
                        F3
                      </span>
                    </button>
                    <button
                      onClick={() => handleAddPayment("PIX", paymentInputValue)}
                      className="bg-purple-100 text-purple-800 p-3 lg:p-5 rounded-xl font-bold border border-purple-200 hover:bg-purple-200 flex justify-between items-center"
                    >
                      <span>💠 PIX</span>{" "}
                      <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">
                        F4
                      </span>
                    </button>
                  </div>

                  {/* Lista de Pagamentos (Mobile: compacta) */}
                  {payments.length > 0 && (
                    <div className="mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100 max-h-24 overflow-y-auto text-xs">
                      {payments.map((p, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-1 border-b last:border-0 border-gray-300"
                        >
                          <span className="text-gray-900 font-semibold">
                            {p.method}
                          </span>
                          <span className="font-bold text-gray-900">
                            {(p.value / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé Modal (Botão Confirmar) */}
            <div className="p-4 lg:p-8 bg-white border-t rounded-b-3xl">
              <button
                disabled={remaingBalance > 0}
                onClick={finalizarVenda}
                className={`w-full py-4 lg:py-6 rounded-xl font-black text-lg lg:text-2xl uppercase transition-all shadow-lg ${
                  remaingBalance > 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-green-600 text-white hover:bg-green-500 active:scale-95"
                }`}
              >
                {remaingBalance > 0 ? "Falta Pagar" : "Confirmar Venda"}
              </button>
            </div>

            {/* COMPONENTE DE IMPRESSÃO */}
            {/* COMPONENTE DE IMPRESSÃO - Visível apenas para a impressora */}
            <div
              id="receipt-print"
              className="hidden print:block font-mono text-[12px] leading-tight w-full"
            >
              {lastSale && (
                <div className="p-0">
                  <div className="text-center mb-2 uppercase">
                    <h2 className="font-bold text-[14px]">Fluxus</h2>
                    <p>CNPJ: 00.000.000/0001-00</p>
                    <p className="text-[10px]">Rua das Flores, 123 - Centro</p>
                    <p>--------------------------------</p>
                    <p className="font-bold">CUPOM NÃO FISCAL</p>
                    <p>--------------------------------</p>
                  </div>

                  <div className="mb-2">
                    <p>
                      DATA: {new Date(lastSale.date).toLocaleString("pt-BR")}
                    </p>
                    <p>VENDA: #{String(lastSale.id).padStart(6, "0")}</p>
                  </div>

                  <table className="w-full mb-2 border-collapse">
                    <thead>
                      <tr className="border-b border-black">
                        <th className="text-left w-[60%]">DESCRIÇÃO</th>
                        <th className="text-right">QTDxUN</th>
                        <th className="text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastSale.cart.map((item: any, index: number) => (
                        <tr
                          key={index}
                          className="border-b border-dotted border-black/20"
                        >
                          <td className="py-1 uppercase">
                            {String(index + 1).padStart(3, "0")}{" "}
                            {item.name.substring(0, 18)}
                          </td>
                          <td className="text-right">
                            {item.quantity}x{(item.price / 100).toFixed(2)}
                          </td>
                          <td className="text-right font-bold">
                            {(item.subtotal / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t border-black pt-1 space-y-1">
                    <div className="flex justify-between font-bold text-[14px]">
                      <span>TOTAL:</span>
                      <span>
                        {(lastSale.total / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                    {lastSale.payments.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span>{p.method}:</span>
                        <span>{(p.value / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    {lastSale.change > 0 && (
                      <div className="flex justify-between font-bold border-t border-dotted border-black pt-1">
                        <span>TROCO:</span>
                        <span>{(lastSale.change / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center mt-4 uppercase text-[10px]">
                    <p>Obrigado pela preferência!</p>
                    <p>Volte Sempre</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
