"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, PackagePlus } from "lucide-react";
import { toast } from "sonner";

export default function NewInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [productName, setProductName] = useState("");
  const [barCode, setBarCode] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Converte 19.90 ou 19,90 para 1990 (centavos)
    const priceInCents = Math.round(parseFloat(price.replace(",", ".")) * 100);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName,
          barCode,
          price: priceInCents,
          stock: Number(stock),
          unit,
        }),
      });

      if (!response.ok) throw new Error("Failed to create product");

      toast.success("Product created successfully!");
      router.push("/inventory");
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen">
      {/* Back Button */}
      <Link
        href="/inventory"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-6 font-medium"
      >
        <ArrowLeft size={16} /> Voltar ao Inventário
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <PackagePlus className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">Add Produto</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
      >
        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nome do Produto
          </label>
          <input
            required
            type="text"
            placeholder="Ex: Coca-Cola 2L"
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>

        {/* Barcode */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cód. Barras / SKU
          </label>
          <input
            type="text"
            placeholder="Scan or type barcode"
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={barCode}
            onChange={(e) => setBarCode(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Preço (Cents)
            </label>
            <input
              required
              type="text"
              placeholder="Ex: 990 for R$ 9,90"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Estoque inicial
            </label>
            <input
              required
              type="number"
              placeholder="0"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Un
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="un">Un (un)</option>
              <option value="kg">Kg (kg)</option>
              <option value="lt">Lt (lt)</option>
              <option value="pc">Pc (pc)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? (
            <span className="animate-pulse">Salvando...</span>
          ) : (
            <>
              <Save size={20} /> Criando Produto
            </>
          )}
        </button>
      </form>
    </div>
  );
}
