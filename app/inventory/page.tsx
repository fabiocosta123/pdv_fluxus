"use client";

import { Product } from "@prisma/client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCw,
  Search,
  Plus,
  Edit3,
  Power,
  PowerOff,
  Package,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro:", error);
      setProducts([]);
      toast.error("Falha ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barCode?.includes(searchTerm)
  );

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(currentStatus ? "Produto inativado" : "Produto ativado");
        fetchInventory();
      }
    } catch (error) {
      toast.error("Erro ao alterar status do produto");
    }
  };

  // Função auxiliar para calcular margem
  const getMargin = (price: number, cost: number) => {
    if (!price || price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-800 tracking-tighter uppercase leading-none">
              Estoque
            </h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Gestão de Produtos</p>
          </div>
        </div>

        <Link
          href="/inventory/new"
          className="bg-blue-600 text-white px-5 py-3 rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-tighter"
        >
          <Plus size={18} /> Novo Produto
        </Link>
      </header>

      <main className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou código de barras..."
              className="w-full pl-12 pr-4 py-4 bg-white border-transparent border-2 rounded-2xl focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchInventory}
            className="bg-white p-4 rounded-2xl border border-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-sm"
          >
            <RotateCw size={20} className={loading ? "animate-spin" : ""} />
            <span className="md:hidden lg:inline">Sincronizar</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-[2rem] border border-gray-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest animate-pulse">Consultando Banco de Dados...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
            <Package size={60} className="text-gray-200 mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-tighter">Nenhum item em estoque</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Código</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Preços e Margem</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((product) => {
                    const margin = getMargin(Number(product.price), Number(product.costPrice || 0));
                    
                    return (
                      <tr
                        key={product.id}
                        className={`group hover:bg-blue-50/30 transition-colors ${!product.isActive && "opacity-60 bg-gray-50/50"}`}
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </p>
                          <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            {product.unit || "un"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400 uppercase">
                          {product.barCode || "---"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 text-sm">
                              {(Number(product.price) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">
                                Custo: {(Number(product.costPrice || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                              <span className={`text-[10px] font-black px-1 rounded flex items-center gap-0.5 ${margin > 20 ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50'}`}>
                                <TrendingUp size={10} />
                                {margin.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-black text-[11px] ${
                            Number(product.stock) <= 0 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${Number(product.stock) <= 0 ? "bg-red-600" : "bg-blue-600"}`} />
                            {Number(product.stock)} {product.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/inventory/edit/${product.id}`}
                              className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 flex items-center justify-center"
                              title="Editar Produto"
                            >
                              <Edit3 size={18} />
                            </Link>
                            <button
                              onClick={() => handleToggleActive(product.id, product.isActive)}
                              className={`p-2.5 rounded-xl transition-all shadow-sm border flex items-center justify-center ${
                                product.isActive 
                                  ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white" 
                                  : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                              }`}
                              title={product.isActive ? "Inativar" : "Ativar"}
                            >
                              {product.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}