"use client";

import { Product } from "@prisma/client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // buscar produtos
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching products:", error.message);
        toast.error("Falha ao carregar produtos.");
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // filtrar produtos
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barCode?.includes(searchTerm)
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Botão Voltar - Estilo Minimalista */}
      <Link
        href="/pdv"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4 transition-colors"
      >
       <ArrowLeft size={16} />  Voltar para Vendas
      </Link>

      {/* Header com Título e Botão de Atualizar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-gray-800">Estoque</h1>

          {/* Botão Atualizar (Mobile) */}
          <button
            onClick={() => fetchInventory()}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            title="Atualizar estoque"
          >
            🔄<RotateCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Carregando estoque...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Nenhum produto encontrado.
          </div>
        ) : (
          <>
            {/* VISUAL MOBILE: Grid de Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredProducts.map((product) => {
                const stockNumber = Number(product.stock);
                const priceNumber = Number(product.price) / 100;

                return (
                  <div
                    key={product.id}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          ID: {product.barCode || "N/A"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          stockNumber <= 0
                            ? "bg-red-100 text-red-700"
                            : priceNumber <= 5
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        Qtd: {stockNumber}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-blue-600">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(product.price))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISUAL DESKTOP: Tabela Tradicional */}
            <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estoque
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const stockNumber = Number(product.stock);
                    const priceNumber = Number(product.price) / 100;
                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {product.barCode || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number(priceNumber))}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-bold ${
                            stockNumber <= 0
                              ? "text-red-600"
                              : stockNumber <= 5
                              ? "text-orange-500"
                              : "text-green-600"
                          }`}
                        >
                          {stockNumber}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
