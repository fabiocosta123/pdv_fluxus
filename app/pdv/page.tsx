"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Minus, AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
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

  const inputRef = useRef<HTMLInputElement>(null);

  // Totais calculados
  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0);
  const remaingBalance = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

  const addToCart = (product: Product, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const newQuantity = existing ? existing.quantity + qty : qty;

      // 1. AVISO DE ESTOQUE (Apenas se a quantidade total no carrinho superar o estoque)
      if (newQuantity > product.stock) {
        toast.warning(
          `Venda acima do estoque (${product.stock} un. em sistema)`,
          {
            id: `stock-${product.id}`, // Evita duplicidade de aviso para o mesmo produto
          }
        );
      }

      // 2. MENSAGEM DE SUCESSO ÚNICA
      toast.success(`${newQuantity}x ${product.name}`, {
        id: `success-${product.id}`, // Atualiza o mesmo toast se bipar repetidamente
      });

      // 3. ATUALIZAÇÃO DO ESTADO (Sem travas)
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

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    toast.info("Item removido do carrinho");
  };

  // busca produto pelo código de barras ou nome
  const handleSearchProduct = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const inputVal = barcode.trim();
    if (!inputVal) return;

    let quantityToLoad = 1;
    let codeToSearch = inputVal;

    // 1. LÓGICA DE BALANÇA (Etiquetas EAN-13 que começam com '2')
    // Exemplo de etiqueta: 2 00015 00450 7 (2 + 5 dígitos código + 5 dígitos valor + verificador)
    if (inputVal.length === 13 && inputVal.startsWith("2")) {
      // Extrai o código do produto (posições 1 a 6) -> "00015"
      codeToSearch = inputVal.substring(1, 6);

      // Extrai o valor total impresso na etiqueta (posições 6 a 11) -> "00450" (R$ 4,50)
      const priceFromLabel = parseFloat(inputVal.substring(6, 11)) / 100;

      const loadingId = toast.loading("Processando balança...");
      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(codeToSearch)}`
        );
        toast.dismiss(loadingId);
        if (!response.ok) throw new Error();

        const product = await response.json();
        const productUnitPrice = product.price / 100; // Converte preço do BD para decimal

        // Peso = Valor da Etiqueta / Preço por KG do cadastro
        // Ex: R$ 4,50 / R$ 20,00 o kg = 0.225 kg
        quantityToLoad = priceFromLabel / productUnitPrice;

        addToCart(product, quantityToLoad);
        setBarcode("");
        return; // Finaliza aqui pois já buscou e adicionou
      } catch {
        toast.error("Produto da balança não cadastrado");
        setBarcode("");
        return;
      }
    }

    // 2. LÓGICA DE MULTIPLICADOR (Existente: 5*789...)
    if (inputVal.includes("*")) {
      const parts = inputVal.split("*");
      const qty = parseFloat(parts[0].replace(",", "."));
      const code = parts[1];

      if (!isNaN(qty) && qty > 0 && code) {
        quantityToLoad = qty;
        codeToSearch = code;
      }
    }

    // 3. BUSCA COMUM (Código de barras normal ou multiplicador)
    const loadingId = toast.loading("Buscando...");
    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(codeToSearch)}`
      );
      toast.dismiss(loadingId);

      if (!response.ok) throw new Error();

      const product = await response.json();
      addToCart(product, quantityToLoad);
      setBarcode("");
    } catch {
      toast.error("Produto não encontrado");
      setBarcode("");
    }
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
    if (remaingBalance > 0) {
      toast.error("Ainda restam valores a pagar!");
      return;
    }

    const toastId = "venda-processando";
    toast.loading("Processando...", { id: toastId });

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          payments,
          total,
          totalPaid,
          change,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar");
      }

      toast.success("Venda realizada!", { id: toastId });

      setCart([]);
      setPayments([]);
      setIsPaymentModalOpen(false);
      setBarcode("");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`, { id: toastId });
    }
  }, [cart, payments, total, totalPaid, change, remaingBalance]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F10" && cart.length > 0 && !isPaymentModalOpen) {
        e.preventDefault();
        setIsPaymentModalOpen(true);
      }
      if (isPaymentModalOpen) {
        const maps: Record<string, string> = {
          F1: "DINHEIRO",
          F2: "DÉBITO",
          F3: "CRÉDITO",
          F4: "PIX",
        };
        if (maps[e.key]) {
          e.preventDefault();
          handleAddPayment(maps[e.key], paymentInputValue);
        }
        if (e.key === "Enter" && remaingBalance === 0) finalizarVenda();
        if (e.key === "Escape") setIsPaymentModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPaymentModalOpen,
    cart.length,
    paymentInputValue,
    remaingBalance,
    handleAddPayment,
    finalizarVenda,
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
                <th className="w-12 text-center"></th>
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
                  <td className="text-center w-10">
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
                        value={paymentInputValue / 100}
                        onChange={(e) =>
                          setPaymentInputValue(
                            e.target.value === ""
                              ? 0
                              : Math.round(parseFloat(e.target.value) * 100)
                          )
                        }
                        onFocus={(e) => e.target.select()}
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
          </div>
        </div>
      )}
    </div>
  );
}
