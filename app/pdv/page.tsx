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

  // Foco automático apenas desktop 
  useEffect(() => {
    if (!isPaymentModalOpen && window.innerWidth > 768) {
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

    // toast de feedback visual 
    const loadingId = toast.loading("Buscando produto...");

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(currentCode)}`);
      toast.dismiss(loadingId);

      if (!response.ok) {
        toast.error("Produto não localizado");        
        return;
      }

      const product: Product = await response.json();
      addToCart(product);
      setBarcode("");
    } catch (error) {
      toast.dismiss(loadingId);
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
    toast.info(`${method}: ${(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  }, []);

  const finalizarVenda = useCallback(async () => {
    if (remaingBalance > 0) {
      toast.error("Ainda restam valores a pagar!");
      return;
    }

    const toastId = "venda-processando";
    toast.loading("Processando...", { id: toastId });

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
      console.error("Erro:", error);
      toast.error(`Erro: ${error.message}`, { id: toastId });
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
    
    <div className="h-[100dvh] bg-gray-100 font-sans overflow-hidden flex flex-col lg:flex-row p-2 lg:p-4 gap-2 lg:gap-4">
      
      {/* --- COLUNA ESQUERDA: LISTA DE PRODUTOS --- */}
      {/* Mobile: Ordem 2 (fica abaixo do input se quiser, Desktop: Ordem 1 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden order-2 lg:order-1 h-full">
        <div className="p-3 border-b bg-blue-600 text-white flex justify-between items-center shrink-0">
          <h1 className="text-sm lg:text-xl font-bold italic">🛒 PDV ATIVO</h1>
          <span className="text-[10px] lg:text-xs bg-blue-800 px-2 py-1 rounded">LIVRE</span>
        </div>

        <div className="flex-1 overflow-auto p-2 lg:p-4 scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="border-b text-gray-400 uppercase text-[10px] lg:text-xs font-bold tracking-widest">
                <th className="py-2 px-1">Item</th>
                <th className="px-1 text-center w-12 lg:w-20">Qtd</th>
                <th className="px-1 text-right hidden sm:table-cell w-24">Unit.</th>
                <th className="px-1 text-right w-20 lg:w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr key={index} className="border-b text-sm lg:text-lg font-bold hover:bg-gray-50">
                  <td className="py-3 px-1 text-gray-900 uppercase leading-tight">
                    <div className="line-clamp-2">{item.name}</div>
                    {/* Mostra unitário no mobile abaixo do nome */}
                    <div className="sm:hidden text-[10px] text-gray-400 font-normal">
                      Unit: {(item.price / 100).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-1 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-1 text-right text-gray-500 hidden sm:table-cell">{(item.price / 100).toFixed(2)}</td>
                  <td className="px-1 text-right text-blue-600 font-black">
                    {(item.subtotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                    Nenhum item lançado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- COLUNA DIREITA: AÇÕES E TOTAL --- */}
      {/* Mobile: Ordem 1 (Fica no topo ou fundo, aqui fixo) | Desktop: Largura 450px */}
      <div className="w-full lg:w-[450px] flex flex-col gap-2 lg:gap-4 order-1 lg:order-2 shrink-0">
        
        {/* Input de busca*/}
        <div className="bg-white p-3 lg:p-6 rounded-lg shadow-sm border-t-4 border-blue-600">
          <label className="hidden lg:block text-sm font-black text-blue-900 mb-2 uppercase">Código de Barras</label>
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
              <span className="text-blue-200 text-xs lg:text-2xl uppercase font-bold">Total a Pagar</span>
              <div className="text-4xl lg:text-8xl font-black leading-none tracking-tight">
                {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
           </div>

            {/* Botão Finalizar */}
            <button
              disabled={cart.length === 0}
              onClick={() => setIsPaymentModalOpen(true)}
              className={`py-3 px-6 lg:py-6 rounded-xl text-sm lg:text-3xl font-black uppercase transition-all shadow-lg active:scale-95 z-10 ${
                cart.length === 0 ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-400"
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
              <h2 className="text-lg lg:text-2xl font-black text-blue-800 uppercase">Pagamento</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="bg-gray-300 p-2 rounded-full hover:bg-red-100 text-gray-600">✕</button>
            </div>

            {/* Corpo Modal (Scrollável no mobile) */}
            <div className="p-4 lg:p-8 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                
                {/* Coluna Valores */}
                <div className="space-y-4 lg:space-y-8">
                  <div className="text-center lg:text-left">
                    <p className="text-gray-500 uppercase font-bold text-[10px] lg:text-xs">Total Geral</p>
                    <p className="text-4xl lg:text-5xl font-black text-blue-600">
                      {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>

                  <div className="bg-white p-3 lg:p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <p className="text-gray-600 uppercase font-bold text-[10px] lg:text-xs mb-1">Valor a Lançar</p>
                    <div className="flex items-center justify-center lg:justify-start">
                      <span className="text-2xl lg:text-4xl font-black text-blue-900 mr-2">R$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        autoFocus
                        value={paymentInputValue / 100}
                        onChange={(e) => setPaymentInputValue(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                        onFocus={(e) => e.target.select()}
                        className="text-4xl lg:text-5xl font-black text-gray-900 outline-none w-full bg-transparent text-center lg:text-left"
                      />
                    </div>
                  </div>
                  
                  {/* Saldos */}
                  <div className="flex justify-between lg:justify-start lg:gap-6 bg-gray-100 lg:bg-transparent p-3 rounded-lg lg:p-0">
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold">Falta Pagar</p>
                      <p className={`text-xl lg:text-2xl font-black ${remaingBalance > 0 ? "text-red-600" : "text-green-500"}`}>
                        {(remaingBalance / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    {change > 0 && (
                      <div className="text-right lg:text-left">
                        <p className="text-blue-600 text-[10px] uppercase font-bold">Troco</p>
                        <p className="text-xl lg:text-2xl font-black text-blue-600">
                          {(change / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Pagamento */}
                <div className="flex flex-col gap-2 lg:gap-3">
                  <p className="lg:hidden text-xs font-bold text-gray-500 uppercase text-center mt-2">Selecione a forma:</p>
                  <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col">
                    <button onClick={() => handleAddPayment("DINHEIRO", paymentInputValue)} className="bg-green-100 text-green-800 p-3 lg:p-5 rounded-xl font-bold border border-green-200 hover:bg-green-200 flex justify-between items-center">
                      <span>💵 Dinheiro</span> <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">F1</span>
                    </button>
                    <button onClick={() => handleAddPayment("DÉBITO", paymentInputValue)} className="bg-blue-100 text-blue-800 p-3 lg:p-5 rounded-xl font-bold border border-blue-200 hover:bg-blue-200 flex justify-between items-center">
                      <span>💳 Débito</span> <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">F2</span>
                    </button>
                    <button onClick={() => handleAddPayment("CRÉDITO", paymentInputValue)} className="bg-orange-100 text-orange-800 p-3 lg:p-5 rounded-xl font-bold border border-orange-200 hover:bg-orange-200 flex justify-between items-center">
                      <span>💳 Crédito</span> <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">F3</span>
                    </button>
                    <button onClick={() => handleAddPayment("PIX", paymentInputValue)} className="bg-purple-100 text-purple-800 p-3 lg:p-5 rounded-xl font-bold border border-purple-200 hover:bg-purple-200 flex justify-between items-center">
                      <span>💠 PIX</span> <span className="hidden lg:inline text-xs bg-white/50 px-2 rounded">F4</span>
                    </button>
                  </div>

                  {/* Lista de Pagamentos (Mobile: compacta) */}
                  {payments.length > 0 && (
                    <div className="mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100 max-h-24 overflow-y-auto text-xs">
                      {payments.map((p, i) => (
                        <div key={i} className="flex justify-between py-1 border-b last:border-0 border-gray-300">
                          <span className="text-gray-900 font-semibold">{p.method}</span>
                          <span className="font-bold text-gray-900">{(p.value / 100).toFixed(2)}</span>
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