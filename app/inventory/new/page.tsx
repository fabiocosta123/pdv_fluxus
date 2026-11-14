"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Barcode, 
  Tag, 
  Layers, 
  Scale, 
  TrendingUp,
  DollarSign 
} from "lucide-react";
import { toast } from "sonner";
import { MoneyInput } from "@/app/components/MoneyInput";
import { SUPPLIER_VISITS } from "@/modules/catalog/supplier";
import { PRODUCT_UNITS } from "@/modules/catalog/units";
import { FiscalFields, emptyFiscalDraft, fiscalPayload } from "@/app/inventory/FiscalFields";
import { SuggestedPrice } from "@/app/inventory/SuggestedPrice";
import { classifyProduct, type PriceGroupId } from "@/modules/catalog/margin";

export default function NewInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Estados do Formulário
  const [productName, setProductName] = useState("");
  const [barCode, setBarCode] = useState("");
  const [costPrice, setCostPrice] = useState(0); // Centavos
  const [price, setPrice] = useState(0);     // Centavos
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("un");
  const [supplierName, setSupplierName] = useState("");
  const [supplierVisitDays, setSupplierVisitDays] = useState("");
  const [priceGroup, setPriceGroup] = useState<PriceGroupId>("outros");
  const [groupLocked, setGroupLocked] = useState(false);
  const [fiscal, setFiscal] = useState(emptyFiscalDraft);

  useEffect(() => {
    if (!groupLocked) setPriceGroup(classifyProduct(productName));
  }, [groupLocked, productName]);

  // Cálculo de Margem em tempo real
  const calculateMargin = () => {
    if (price > 0 && costPrice > 0) {
      const margin = ((price - costPrice) / price) * 100;
      return margin.toFixed(1);
    }
    return "0";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (price <= 0) return toast.error("O preço de venda deve ser maior que zero");
    const taxes = fiscalPayload(fiscal);
    if (
      taxes.icmsRate == null || taxes.pisRate == null || taxes.cofinsRate == null
      || (fiscal.icmsCst === "00" || fiscal.icmsCst === "20" ? taxes.icmsRate <= 0 : false)
      || (fiscal.pisCst === "01" || fiscal.pisCst === "49" ? taxes.pisRate <= 0 : false)
      || (fiscal.cofinsCst === "01" || fiscal.cofinsCst === "49" ? taxes.cofinsRate <= 0 : false)
    ) {
      return toast.error("Informe as alíquotas dos impostos tributados, com até duas casas");
    }

    setLoading(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName, 
          barCode,
          costPrice,
          price,
          stock: Number(stock),
          unit,
          supplierName,
          supplierVisitDays: supplierVisitDays ? Number(supplierVisitDays) : null,
          priceGroup,
          ...taxes,
          isActive: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar produto");
      }

      toast.success("Produto cadastrado com sucesso!");
      router.push("/inventory");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* HEADER FIXO */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
        <button 
          onClick={() => router.push("/inventory")}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tighter uppercase leading-none">
            Novo Produto
          </h1>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
            Entrada de Estoque
          </p>
        </div>
      </header>

      <main className="p-4 lg:p-12 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA DA ESQUERDA: Identificação (Mais larga) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Tag size={18} />
                </div>
                <h2 className="font-black text-gray-800 uppercase tracking-tighter">Identificação Básica</h2>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Nome do Produto / Descrição</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Coca-Cola Lata 350ml"
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-inner"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1 text-center md:text-left">Código de Barras</label>
                  <div className="relative">
                    <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="EAN-13"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-mono text-gray-600 shadow-inner"
                      value={barCode}
                      onChange={(e) => setBarCode(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Unidade de Medida</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700 appearance-none shadow-inner cursor-pointer"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    {PRODUCT_UNITS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <h2 className="font-black text-gray-800 uppercase tracking-tighter">Fornecedor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Nome do fornecedor</label>
                  <input
                    type="text"
                    placeholder="Ex: Distribuidora Norte"
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-inner"
                    value={supplierName}
                    onChange={(event) => setSupplierName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Frequência da visita</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-inner"
                    value={supplierVisitDays}
                    onChange={(event) => setSupplierVisitDays(event.target.value)}
                  >
                    <option value="">Não informada</option>
                    {SUPPLIER_VISITS.map((item) => (
                      <option key={item.days} value={item.days}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <h2 className="font-black text-gray-800 uppercase tracking-tighter">Dados fiscais</h2>
              <FiscalFields value={fiscal} onChange={setFiscal} />
            </div>

            {/* SEÇÃO DE ESTOQUE */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                  <Layers size={18} />
                </div>
                <h2 className="font-black text-gray-800 uppercase tracking-tighter">Inventário</h2>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1 italic">Quantidade Inicial em Estoque</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all font-black text-2xl text-gray-700 shadow-inner"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* COLUNA DA DIREITA: Financeiro (Sticky) */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-8">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <DollarSign size={18} />
                </div>
                <h2 className="font-black text-gray-800 uppercase tracking-tighter">Financeiro</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1 italic">Custo Unitário</label>
                  <MoneyInput 
                    value={costPrice}
                    onChange={setCostPrice}
                    className="text-2xl font-bold text-gray-500 bg-transparent border-b-2 border-gray-100 focus:border-orange-400 outline-none w-full pb-1 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-blue-600 mb-2 block ml-1">Preço de Venda</label>
                  <MoneyInput 
                    value={price}
                    onChange={setPrice}
                    className="text-4xl font-black text-emerald-600 bg-transparent border-b-4 border-emerald-100 focus:border-emerald-500 outline-none w-full pb-2 transition-all"
                  />
                  <div className="mt-4">
                    <SuggestedPrice
                      name={productName}
                      costCents={costPrice}
                      currentCents={price}
                      groupId={priceGroup}
                      onGroupChange={(groupId) => {
                        setGroupLocked(true);
                        setPriceGroup(groupId);
                      }}
                      onUse={setPrice}
                    />
                  </div>
                </div>

                {/* INDICADOR DE MARGEM */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Margem Bruta</span>
                    <TrendingUp size={16} className="text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-gray-800">
                    {calculateMargin()}%
                  </p>
                  <p className="text-[9px] text-gray-400 font-medium">Lucro de R$ {((price - costPrice)/100).toFixed(2)} por unidade</p>
                </div>
              </div>

              <div className="mt-auto pt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={20} /> Salvar 
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}