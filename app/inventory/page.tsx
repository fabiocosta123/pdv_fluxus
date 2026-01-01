"use client";

import { Product } from "@prisma/client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCw,
  Search,
  Plus,
  Edit3,
  Power,
  PowerOff,
} from "lucide-react";
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

  // filtrar produtos
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
        fetchInventory(); // Recarrega a lista
      }
    } catch (error) {
      toast.error("Erro ao alterar status do produto");
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* 1. NAVEGAÇÃO SUPERIOR (Breadcrumbs) */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/pdv"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-all"
        >
          <ArrowLeft size={16} /> Voltar para Vendas
        </Link>

        <Link
          href="/inventory/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={18} />
          <span>Novo Produto</span>
        </Link>
      </div>

      {/* 2. HEADER DE CONTEÚDO (Mobile: Stacked | Desktop: Row) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Estoque
          </h1>

          {/* Botão Atualizar (Apenas Mobile) */}
          <button
            onClick={() => fetchInventory()}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200 transition-all"
          >
            <RotateCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Grupo de Busca e Refresh (Desktop) */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar produto..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Botão Atualizar (Apenas Desktop) */}
          <button
            onClick={() => fetchInventory()}
            className="hidden md:flex p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-xl transition-all shadow-sm"
            title="Atualizar estoque"
          >
            <RotateCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
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
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grayscale-[0.5]"
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
                    }).format(Number(priceNumber))}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
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
                      className={`hover:bg-gray-50 transition-colors ${
                        !product.isActive && "bg-gray-50 opacity-60"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {product.barCode || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {(product.price / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-bold ${
                          stockNumber <= 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {stockNumber} {product.unit}
                      </td>
                      <td className="px-6 py-4 text-left text-sm font-medium space-x-4">
                        <Link
                          href={`/inventory/edit/${product.id}`}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                        >
                          <Edit3 size={16} /> Editar
                        </Link>
                        <button
                          onClick={() =>
                            handleToggleActive(product.id, product.isActive)
                          }
                          className={`${
                            product.isActive
                              ? "text-red-600 hover:text-red-800"
                              : "text-green-600 hover:text-green-800"
                          } inline-flex items-center gap-1`}
                        >
                          {product.isActive ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
                          {product.isActive ? "Inativar" : "Ativar"}
                        </button>
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
  );
}
