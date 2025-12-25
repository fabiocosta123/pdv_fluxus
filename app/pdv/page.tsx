"use client";

import { useState, useRef, useEffect } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPaymentModalOpen) {
      inputRef.current?.focus();
    }
  }, [isPaymentModalOpen]);

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

  const handleSearchProduct = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div className="h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* 🖥️ LAYOUT DESKTOP */}
      <div className="hidden lg:flex h-full p-4 gap-4">
        {/* Lado Esquerdo: Lista de Itens */}
        <div className="flex-1 bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-blue-600 text-white">
            <h1 className="text-xl font-bold italic">🛒 PDV SISTEMA - VENDA ATIVA</h1>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 text-gray-600 uppercase text-sm tracking-widest">
                  <th className="py-3 px-2">Descrição</th>
                  <th className="px-2">Qtd</th>
                  <th className="px-2">Unitário</th>
                  <th className="px-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index} className="border-b text-lg font-medium hover:bg-gray-50">
                    <td className="py-4 px-2 text-blue-900">{item.name}</td>
                    <td className="px-2">{item.quantity}</td>
                    <td className="px-2 text-gray-500">{(item.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-2 text-right font-bold">{(item.subtotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lado Direito: Info e Totais */}
        <div className="w-[400px] flex flex-col gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Código de Barras (F2)</label>
            <form onSubmit={handleSearchProduct}>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full border-2 border-gray-300 rounded p-4 text-3xl font-mono focus:border-blue-600 outline-none transition-all"
                placeholder="0000000000000"
              />
            </form>
          </div>

          <div className="bg-blue-900 text-white p-8 rounded-lg shadow-inner flex-1 flex flex-col justify-between">
            <div>
              <span className="text-blue-300 text-sm uppercase font-bold tracking-tighter text-2xl">Total a Pagar</span>
              <div className="text-7xl font-black mt-2 leading-none">
                {(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            
            <button 
              disabled={cart.length === 0}
              onClick={() => setIsPaymentModalOpen(true)}
              className={`w-full py-6 rounded-xl text-3xl font-black uppercase tracking-tighter transition-all duration-75 relative z-10
                ${cart.length === 0 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 text-white hover:bg-green-400 active:translate-y-1 shadow-[0_8px_0_rgb(21,128,61)] active:shadow-none'
                }`}
            >
              FINALIZAR (F10)
            </button>
          </div>
        </div>
      </div>

      {/* 📱 LAYOUT MOBILE/TABLET */}
      <div className="lg:hidden flex flex-col h-full">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center shadow-md">
          <h1 className="font-bold">PDV Mobile</h1>
          <span className="font-mono bg-blue-800 px-2 py-1 rounded text-sm">
            Total: {(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="p-3 bg-white border-b">
          <form onSubmit={handleSearchProduct}>
            <input
              type="text"
              inputMode="numeric"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full border-2 border-blue-400 rounded-lg p-3 text-xl"
              placeholder="Bipar ou digitar código"
            />
          </form>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50">
          {cart.map((item, index) => (
            <div key={index} className="bg-white m-2 p-3 rounded-lg shadow-sm flex justify-between items-center border-l-4 border-blue-500">
              <div>
                <div className="font-bold text-gray-800">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.quantity}un x {(item.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
              <div className="font-bold text-blue-700">
                {(item.subtotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl text-xl active:scale-95 transition-transform"
          >
            CONCLUIR VENDA
          </button>
        </div>
      </div>

      {/* 🏦 MODAL DE PAGAMENTO (Comum aos dois layouts) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 bg-gray-100 border-b flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800 uppercase">Fechamento</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl">✕</button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-gray-500 uppercase font-bold text-xs">Total a receber</p>
                <p className="text-4xl font-black text-blue-600">
                  {(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button className="bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-700 transition-colors">DINHEIRO (F1)</button>
                <button className="bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-colors">CARTÃO (F2)</button>
                <button className="bg-purple-600 text-white p-4 rounded-xl font-bold hover:bg-purple-700 transition-colors">PIX (F3)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}