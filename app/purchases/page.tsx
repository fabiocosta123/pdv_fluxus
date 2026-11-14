"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { money } from "@/app/finance/format";
import type { PurchaseSuggestion, PurchaseSupplier } from "@/modules/purchases/service";

type PurchaseList = {
  lookbackDays: number;
  reorderPoint: number;
  totalCost: number;
  suppliers: PurchaseSupplier[];
};

function qty(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 3,
    maximumFractionDigits: 3,
  });
}

export default function PurchasesPage() {
  const router = useRouter();
  const [list, setList] = useState<PurchaseList | null>(null);

  useEffect(() => {
    fetch("/api/purchases")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          toast.error(data.error || "Não foi possível montar a lista de compras");
          return;
        }
        setList(data);
      })
      .catch(() => toast.error("Não foi possível montar a lista de compras"));
  }, []);

  const count = list?.suppliers.reduce((sum, supplier) => sum + supplier.items.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/management")}
          className="p-2 rounded-xl hover:bg-gray-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-800">Lista de compra</h1>
          <p className="text-xs text-gray-400">
            Reposição pelo ritmo das últimas {list?.lookbackDays ?? 28} dias e pela visita do fornecedor.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-4">
        {!list && <p className="text-sm text-gray-400 text-center py-8">Montando a lista...</p>}

        {list && count === 0 && (
          <p className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-500">
            Nada para repor. O estoque cobre a próxima visita e nenhum produto está com 3 ou menos.
          </p>
        )}

        {list?.suppliers.map((supplier) => (
          <section key={supplier.name} className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
              <h2 className="font-black text-gray-800 uppercase">{supplier.name}</h2>
              <p className="text-sm font-black text-gray-700">{money(supplier.cost)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-400 text-left">
                    <th className="px-4 py-2 font-black">Produto</th>
                    <th className="px-2 py-2 font-black text-right">Estoque</th>
                    <th className="px-2 py-2 font-black text-right">Venda / semana</th>
                    <th className="px-2 py-2 font-black">Visita</th>
                    <th className="px-2 py-2 font-black text-right">Comprar</th>
                    <th className="px-4 py-2 font-black text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.items.map((item: PurchaseSuggestion) => (
                    <tr key={item.productId} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.reason}</p>
                      </td>
                      <td className="px-2 py-3 text-right font-mono">{qty(item.stock)}</td>
                      <td className="px-2 py-3 text-right font-mono">{qty(item.weekly)}</td>
                      <td className="px-2 py-3 text-gray-600">
                        {item.visitLabel}
                        {item.assumedVisit && (
                          <span className="block text-[10px] text-amber-700">Sem frequência no cadastro</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-black text-orange-700">
                        {qty(item.quantity)} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{money(item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {list && count > 0 && (
          <section className="bg-gray-900 text-white rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400">Previsão de custo</p>
              <p className="text-sm text-gray-300">{count} produto{count === 1 ? "" : "s"} para repor</p>
            </div>
            <p className="text-3xl font-black">{money(list.totalCost)}</p>
          </section>
        )}

        <p className="text-xs text-gray-400">
          Entra na lista o produto com estoque de {list?.reorderPoint ?? 3} ou menos, e também o que acaba antes da
          próxima visita. A quantidade sugerida deixa 3 no estoque quando o fornecedor voltar. Unidade, pacote e
          caixa entram inteiros, arredondados para cima. Quilo e litro continuam com gramas e mililitros. Sem a
          frequência cadastrada, a conta usa uma semana.
        </p>
      </main>
    </div>
  );
}
