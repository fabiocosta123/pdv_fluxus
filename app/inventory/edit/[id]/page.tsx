"use client";
import { useState, useEffect, use } from "react"; 
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Barcode } from "lucide-react";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params); 
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    costPrice: 0,
    stock: 0,
    barCode: "", 
  });

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error("Produto não encontrado");
        
        const data = await response.json();
        setFormData({
          name: data.name || "",
          price: (data.price || 0) / 100,
          costPrice: (data.costPrice || 0) / 100,
          stock: data.stock || 0,
          barCode: data.barCode || "",
        });
      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: Math.round(formData.price * 100),
          costPrice: Math.round(formData.costPrice * 100),
        }),
      });

      if (response.ok) {
        router.push("/inventory");
        router.refresh();
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Editar Produto</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-sm border p-8 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Nome do Produto</label>
            <input
              type="text"
              required
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Código de Barras */}
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Código de Barras</label>
            <div className="relative">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                className="w-full p-4 pl-12 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-mono font-bold"
                value={formData.barCode}
                onChange={(e) => setFormData({ ...formData, barCode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Preço Custo */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-orange-600"
                value={formData.costPrice || ""}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            {/* Preço Venda */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-green-600"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Estoque */}
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Estoque</label>
            <input
              type="number"
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-100"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Salvar Alterações
          </button>
        </form>
      </main>
    </div>
  );
}