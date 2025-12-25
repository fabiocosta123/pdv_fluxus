"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}

export default function PDVPage() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<{ method: string; value: number }[]>([]);
  const [paymentInputValue, setPaymentInputValue] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Totais calculados
  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0);
  const remaingBalance = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

  // Foco automático
  useEffect(() => {
    if (!isPaymentModalOpen) {
      inputRef.current?.focus();
    }
  }, [isPaymentModalOpen]);

  // Atualiza valor de entrada quando o modal abre ou saldo muda
  useEffect(() => {
    if (isPaymentModalOpen) {
      setPaymentInputValue(remaingBalance);
    }
  }, [isPaymentModalOpen, remaingBalance]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, subtotal: product.price }];
    });
    toast.success(`${product.name} adicionado!`);
  };

  const handleSearchProduct = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const currentCode = barcode.trim();
    if (!currentCode) return;

    try {
      const response = await fetch(`/api/products/${currentCode}`);
      if (!response.ok) {
        toast.error("Produto não localizado");
        setBarcode("");
        return;
      }
      const product: Product = await response.json();
      addToCart(product);
      setBarcode("");
    } catch (error) {
      toast.error("Erro na busca");
      setBarcode("");
    }
  };

  const handleAddPayment = useCallback((method: string, amount: number) => {
    if (amount <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setPayments((prev) => [...prev, { method, value: amount }]);
    toast.info(`${method} lançado: ${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  }, []);

  const finalizarVenda = useCallback(async () => {
    if (remaingBalance > 0) {
      toast.error("Ainda restam valores a pagar!");
      return;
    }

    // Cria um Toast de carregamento para dar feedback ao usuario
    const toastId = "Processando venda..."
    toast.loading("Gravando venda, aguarde...", { id: toastId });

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          payments,
          total,
          totalPaid,
          change
        })
      })

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Erro ao salvar a venda");
        throw new Error('Erro ao salvar a venda');
      }

      toast.success("Venda gravada com sucesso!", { id: toastId });
    
    // Reseta o PDV para a proxima venda
    setCart([]);
    setPayments([]);
    setIsPaymentModalOpen(false);
    setBarcode("");

    } catch (error: any) {
      console.error("Erro no checkout:", error);
      toast.error(`Falha ao finalizar a venda: ${error.message}`, { id: toastId });
    }
    
  }, [cart, payments, total, totalPaid, change, remaingBalance]);

  // Lógica de Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F10" && cart.length > 0 && !isPaymentModalOpen) {
        e.preventDefault();
        setIsPaymentModalOpen(true);
      }

      if (isPaymentModalOpen) {
        if (e.key === "F1") { e.preventDefault(); handleAddPayment("DINHEIRO", paymentInputValue); }
        if (e.key === "F2") { e.preventDefault(); handleAddPayment("DÉBITO", paymentInputValue); }
        if (e.key === "F3") { e.preventDefault(); handleAddPayment("CRÉDITO", paymentInputValue); }
        if (e.key === "F4") { e.preventDefault(); handleAddPayment("PIX", paymentInputValue); }
        if (e.key === "Enter" && remaingBalance === 0) { e.preventDefault(); finalizarVenda(); }
        if (e.key === "Escape") { setIsPaymentModalOpen(false); }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaymentModalOpen, cart.length, paymentInputValue, remaingBalance, handleAddPayment, finalizarVenda]);

  return (
    <div className="h-screen bg-gray-100 font-sans overflow-hidden flex flex-col">
      {/* LAYOUT DESKTOP */}
      <div className="flex flex-col lg:flex-row h-full p-2 lg:p-4 gap-4 overflow-auto lg:overflow-hidden">
        {/* Lado Esquerdo */}
        <div className="flex-1 bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold italic">🛒 PDV SISTEMA - VENDA ATIVA</h1>
            <span className="text-xs bg-blue-800 px-2 py-1 rounded">CAIXA LIVRE</span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b-2 text-gray-400 uppercase text-xs font-bold tracking-widest">
                  <th className="py-3 px-2">Descrição do Item</th>
                  <th className="px-2 w-20">Qtd</th>
                  <th className="px-2 w-32 text-right">Unitário</th>
                  <th className="px-2 w-32 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index} className="border-b text-lg font-bold hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-2 text-blue-900 uppercase">{item.name}</td>
                    <td className="px-2 text-gray-600">{item.quantity}</td>
                    <td className="px-2 text-right text-gray-500">{(item.price / 100).toFixed(2)}</td>
                    <td className="px-2 text-right text-blue-600 font-black">
                      {(item.subtotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lado Direito */}
        <div className="w-[450px] flex flex-col gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md border-t-8 border-blue-600">
            <label className="block text-sm font-black text-blue-900 mb-2 uppercase tracking-tight">Código de Barras</label>
            <form onSubmit={handleSearchProduct}>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-4xl font-mono focus:border-blue-600 outline-none bg-gray-50 transition-all"
                placeholder="0000000000000"
              />
            </form>
          </div>

          <div className="bg-blue-900 text-white p-8 rounded-2xl shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden">
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="text-9xl font-black">TOTAL</span>
            </div>

            <div className="relative z-10">
              <span className="text-blue-300 text-2xl uppercase font-black tracking-tighter">Total a Pagar</span>
              <div className="text-8xl font-black mt-2 leading-none tracking-tighter">
                {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => setIsPaymentModalOpen(true)}
              className={`w-full py-6 rounded-2xl text-3xl font-black uppercase transition-all shadow-[0_8px_0_rgb(21,128,61)] active:shadow-none active:translate-y-2 relative z-10 cursor-pointer ${
                cart.length === 0 ? "bg-gray-700 text-gray-500 cursor-not-allowed shadow-none" : "bg-green-500 text-white hover:bg-green-400"
              }`}
            >
              FINALIZAR (F10)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE PAGAMENTO */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col border border-gray-200">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-2xl font-black text-blue-900 uppercase">Fechamento de Venda</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="bg-gray-200 hover:bg-red-100 hover:text-red-600 p-2 rounded-full w-10 h-10 transition-colors">✕</button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div>
                  <p className="text-gray-400 uppercase font-black text-xs mb-1">Total da Venda</p>
                  <p className="text-5xl font-black text-blue-600">
                    {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 uppercase font-bold text-xs mb-2">Valor a Lançar</p>
                  <div className="flex items-center">
                    <span className="text-4xl font-black text-blue-900 mr-2">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      autoFocus
                      value={paymentInputValue / 100}
                      onChange={(e) => setPaymentInputValue(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                      onFocus={(e) => e.target.select()}
                      className="text-5xl font-black text-blue-900 outline-none w-full bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <div>
                    <p className="text-gray-400 uppercase font-black text-[10px]">Restante</p>
                    <p className={`text-2xl font-black ${remaingBalance > 0 ? "text-red-600" : "text-green-500"}`}>
                      {(remaingBalance / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  {change > 0 && (
                    <div>
                      <p className="text-blue-400 uppercase font-black text-[10px]">Troco</p>
                      <p className="text-2xl font-black text-blue-600">
                        {(change / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => handleAddPayment("DINHEIRO", paymentInputValue)} className="flex justify-between items-center bg-green-600 text-white p-5 rounded-2xl font-black hover:bg-green-700 transition-all transform active:scale-95 cursor-pointer shadow-lg shadow-green-200">
                  <span>DINHEIRO</span> <span className="text-xs bg-green-800 px-2 py-1 rounded">F1</span>
                </button>
                <button onClick={() => handleAddPayment("DÉBITO", paymentInputValue)} className="flex justify-between items-center bg-blue-600 text-white p-5 rounded-2xl font-black hover:bg-blue-700 transition-all transform active:scale-95 cursor-pointer shadow-lg shadow-blue-200">
                  <span>DÉBITO</span> <span className="text-xs bg-blue-800 px-2 py-1 rounded">F2</span>
                </button>
                <button onClick={() => handleAddPayment("CRÉDITO", paymentInputValue)} className="flex justify-between items-center bg-orange-500 text-white p-5 rounded-2xl font-black hover:bg-orange-600 transition-all transform active:scale-95 cursor-pointer shadow-lg shadow-orange-200">
                  <span>CRÉDITO</span> <span className="text-xs bg-orange-800 px-2 py-1 rounded">F3</span>
                </button>
                <button onClick={() => handleAddPayment("PIX", paymentInputValue)} className="flex justify-between items-center bg-purple-600 text-white p-5 rounded-2xl font-black hover:bg-purple-700 transition-all transform active:scale-95 cursor-pointer shadow-lg shadow-purple-200">
                  <span>PIX</span> <span className="text-xs bg-purple-800 px-2 py-1 rounded">F4</span>
                </button>

                <div className="mt-4 bg-gray-50 p-4 rounded-2xl flex-1 max-h-40 overflow-y-auto border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Lançamentos</p>
                  {payments.map((p, index) => (
                    <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                      <span className="font-bold text-gray-700">{p.method}</span>
                      <span className="font-mono text-blue-600">{(p.value / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 pt-0">
              <button
                disabled={remaingBalance > 0}
                onClick={finalizarVenda}
                className={`w-full py-6 rounded-2xl font-black text-2xl tracking-tight transition-all cursor-pointer shadow-xl ${
                  remaingBalance > 0 
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none" 
                  : "bg-green-500 text-white hover:bg-green-400 hover:-translate-y-1 active:translate-y-0"
                }`}
              >
                {remaingBalance > 0 ? "AGUARDANDO PAGAMENTO..." : "CONFIRMAR VENDA (ENTER)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}