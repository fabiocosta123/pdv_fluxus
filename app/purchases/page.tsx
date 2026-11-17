"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import { money, showDate } from "@/app/finance/format";
import { downloadPurchaseList } from "@/modules/purchases/list-pdf";
import type { PurchaseSuggestion, PurchaseSupplier } from "@/modules/purchases/service";

type PurchaseMode = "visit" | "sales";
type FilterId = "visit" | "today" | "week" | "month" | "custom";

type PurchaseList = {
  mode: PurchaseMode;
  from: string;
  to: string;
  lookbackDays: number;
  reorderPoint: number;
  totalCost: number;
  suppliers: PurchaseSupplier[];
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "visit", label: "Próxima visita" },
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "custom", label: "Datas" },
];

function qty(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 3,
    maximumFractionDigits: 3,
  });
}

function storeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function shiftDay(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function rangeFor(filter: FilterId, from: string, to: string) {
  const today = storeToday();
  if (filter === "visit") return null;
  if (filter === "today") return { from: today, to: today };
  if (filter === "week") {
    const start = shiftDay(today, -((new Date(`${today}T12:00:00.000Z`).getUTCDay() + 6) % 7));
    return { from: start, to: today };
  }
  if (filter === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (!from || !to || from > to) return null;
  return { from, to };
}

function periodLabel(list: PurchaseList) {
  if (list.mode === "visit") return `Reposição das últimas ${list.lookbackDays} dias`;
  if (list.from === list.to) return `Vendas de ${showDate(list.from)}`;
  return `Vendas de ${showDate(list.from)} a ${showDate(list.to)}`;
}

export default function PurchasesPage() {
  const router = useRouter();
  const [list, setList] = useState<PurchaseList | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("visit");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const customInvalid = filter === "custom" && Boolean(from) && Boolean(to) && from > to;

  useEffect(() => {
    if (filter === "custom" && (!from || !to || from > to)) return;
    const range = rangeFor(filter, from, to);
    const params = new URLSearchParams();
    if (range) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    let active = true;
    setLoading(true);
    fetch(`/api/purchases${params.size ? `?${params}` : ""}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) {
          toast.error(data.error || "Não foi possível montar a lista de compras");
          return;
        }
        setList(data);
      })
      .catch(() => {
        if (active) toast.error("Não foi possível montar a lista de compras");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, from, to]);

  function chooseFilter(next: FilterId) {
    if (next === "custom") {
      const today = storeToday();
      setFrom((current) => current || today);
      setTo((current) => current || today);
    }
    setFilter(next);
  }

  const count = list?.suppliers.reduce((sum, supplier) => sum + supplier.items.length, 0) ?? 0;
  const sales = list?.mode === "sales";

  function download() {
    if (!list || count === 0) {
      toast.error("Não há itens para baixar");
      return;
    }
    downloadPurchaseList({
      period: periodLabel(list),
      headers: sales
        ? ["Produto", "Estoque", "Vendido", "Comprar", "Custo"]
        : ["Produto", "Estoque", "Semana", "Visita", "Comprar", "Custo"],
      suppliers: list.suppliers.map((supplier) => ({
        name: supplier.name,
        cost: money(supplier.cost),
        lines: supplier.items.map((item) => ({
          name: item.name,
          detail: item.reason,
          values: sales
            ? [qty(item.stock), qty(item.sold), `${qty(item.quantity)} ${item.unit}`, money(item.cost)]
            : [qty(item.stock), qty(item.weekly), item.visitLabel, `${qty(item.quantity)} ${item.unit}`, money(item.cost)],
        })),
      })),
      totalLabel: `${count} produto${count === 1 ? "" : "s"}`,
      total: money(list.totalCost),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
              {list ? periodLabel(list) : "Reposição pelo ritmo das vendas e pela visita do fornecedor."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={download}
          className="bg-white border border-gray-200 text-gray-800 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center gap-2"
        >
          <Download size={18} /> Baixar
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => chooseFilter(option.id)}
              className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                filter === option.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filter === "custom" && (
          <div className="bg-white rounded-2xl border p-4 flex flex-wrap items-end gap-3">
            <label className="text-[10px] font-black uppercase text-gray-400">
              De
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 block rounded-xl border px-3 py-2 text-sm font-bold text-gray-800"
              />
            </label>
            <label className="text-[10px] font-black uppercase text-gray-400">
              Até
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 block rounded-xl border px-3 py-2 text-sm font-bold text-gray-800"
              />
            </label>
            {customInvalid && <p className="text-sm text-red-600">A data inicial passa da final.</p>}
          </div>
        )}

        {loading && !list && <p className="text-sm text-gray-400 text-center py-8">Montando a lista...</p>}

        {list && count === 0 && (
          <p className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-500">
            {sales
              ? "Nenhuma venda nesse período para repor."
              : `Nada para repor. O estoque cobre a próxima visita e nenhum produto está com ${list.reorderPoint} ou menos.`}
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
                    <th className="px-2 py-2 font-black text-right">{sales ? "Vendido" : "Venda / semana"}</th>
                    {!sales && <th className="px-2 py-2 font-black">Visita</th>}
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
                      <td className="px-2 py-3 text-right font-mono">{qty(sales ? item.sold : item.weekly)}</td>
                      {!sales && (
                        <td className="px-2 py-3 text-gray-600">
                          {item.visitLabel}
                          {item.assumedVisit && (
                            <span className="block text-[10px] text-amber-700">Sem frequência no cadastro</span>
                          )}
                        </td>
                      )}
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
              <p className="text-sm text-gray-300">
                {count} produto{count === 1 ? "" : "s"} para repor
              </p>
            </div>
            <p className="text-3xl font-black">{money(list.totalCost)}</p>
          </section>
        )}

        <p className="text-xs text-gray-400">
          {sales
            ? "A lista traz o que foi vendido no período escolhido. A quantidade acompanha essa venda. Unidade, pacote e caixa entram inteiros, arredondados para cima. Quilo e litro continuam com gramas e mililitros."
            : `Entra na lista o produto com estoque de ${list?.reorderPoint ?? 1} ou menos, e também o que acaba antes da próxima visita. A quantidade sugerida deixa ${list?.reorderPoint ?? 1} no estoque quando o fornecedor voltar. Unidade, pacote e caixa entram inteiros, arredondados para cima. Quilo e litro continuam com gramas e mililitros. Sem a frequência cadastrada, a conta usa uma semana.`}
        </p>
      </main>
    </div>
  );
}
