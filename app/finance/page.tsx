"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarClock, Wallet } from "lucide-react";
import { money, showDate } from "@/app/finance/format";
import type { FinanceSummary } from "@/modules/finance/types";

export default function FinancePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async (start: string, end: string) => {
    const params = new URLSearchParams();
    if (start) params.set("from", start);
    if (end) params.set("to", end);
    const response = await fetch(`/api/finance?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível carregar o financeiro");
      return;
    }
    setSummary(data);
    setFrom(data.from);
    setTo(data.to);
  }, []);

  useEffect(() => {
    void load("", "");
  }, [load]);

  const balance = summary ? summary.inflowTotal - summary.expensePaid : 0;
  const tight = summary?.tightDay ?? null;
  const tightWhen = !tight || !summary
    ? ""
    : tight.date < summary.today
      ? "Esse vencimento já passou."
      : tight.date === summary.today
        ? "Vence hoje."
        : "Ainda vai vencer.";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Financeiro</h1>
          <p className="text-sm text-gray-500">Painel do período, contas a pagar e contas a receber</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <label className="text-xs font-bold text-gray-400 uppercase">
            De
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block bg-white border rounded-xl px-4 py-3" />
          </label>
          <label className="text-xs font-bold text-gray-400 uppercase">
            Até
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block bg-white border rounded-xl px-4 py-3" />
          </label>
          <button onClick={() => load(from, to)} className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold">
            Atualizar
          </button>
          <button onClick={() => summary && load(summary.today, summary.today)} className="bg-white border px-5 py-3 rounded-xl font-bold">
            Hoje
          </button>
        </div>

        {summary && (
          <>
            <section className="grid sm:grid-cols-3 gap-4">
              <Stat label="Entrou" value={money(summary.inflowTotal)} hint="Vendas à vista e recebimentos" />
              <Stat label="Saiu" value={money(summary.expensePaid)} hint="Despesas pagas no período" />
              <Stat
                label="Sobrou"
                value={money(balance)}
                hint="Entrou menos o que saiu"
                tone={balance < 0 ? "negative" : "default"}
              />
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/finance/payables")}
                className="bg-white rounded-2xl border p-5 text-left hover:border-emerald-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="bg-emerald-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center">
                    <CalendarClock className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase text-gray-400">Contas a pagar</p>
                <p className="text-2xl font-black text-gray-800">{money(summary.payablesTotal)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.payablesCount === 0
                    ? "Nenhuma conta em aberto"
                    : `${summary.payablesCount} conta${summary.payablesCount === 1 ? "" : "s"} com vencimento`}
                </p>
                {summary.overdueCount > 0 && (
                  <p className="text-sm font-bold text-red-600 mt-2">
                    {money(summary.overdueTotal)} já venceram
                  </p>
                )}
              </button>

              <button
                onClick={() => router.push("/finance/receivables")}
                className="bg-white rounded-2xl border p-5 text-left hover:border-indigo-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="bg-indigo-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase text-gray-400">Contas a receber</p>
                <p className="text-2xl font-black text-gray-800">{money(summary.receivablesTotal)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.receivablesCount === 0
                    ? "Nenhum cliente em débito"
                    : `${summary.receivablesCount} cliente${summary.receivablesCount === 1 ? "" : "s"} com data do débito`}
                </p>
                {summary.walletSold > 0 && (
                  <p className="text-sm text-gray-400 mt-2">Carteira vendida no período {money(summary.walletSold)}</p>
                )}
              </button>
            </section>

            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase text-amber-700">Dia do aperto</p>
              {tight ? (
                <>
                  <p className="text-2xl font-black text-gray-800">{showDate(tight.date)}</p>
                  <p className="text-gray-700">
                    {money(tight.amount)} em {tight.count} conta{tight.count === 1 ? "" : "s"} com esse vencimento.
                  </p>
                  <p className="text-sm text-amber-800 mt-1">{tightWhen}</p>
                </>
              ) : (
                <p className="text-gray-600 mt-1">Nenhuma conta a pagar em aberto.</p>
              )}
              {summary.overdueCount > 0 && tight && tight.date >= summary.today && (
                <p className="text-sm font-bold text-red-600 mt-2">
                  Além disso, {money(summary.overdueTotal)} já venceram.
                </p>
              )}
              <p className="text-xs text-amber-900/70 mt-3">
                O aperto compara os vencimentos em aberto. Cada conta a receber guarda a data em que o débito começou.
              </p>
            </section>

            {summary.upcoming.length > 0 && (
              <section className="bg-white rounded-2xl border overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3">
                  <h2 className="text-xs font-black uppercase text-gray-400">Próximos vencimentos</h2>
                  <button onClick={() => router.push("/finance/payables")} className="text-xs font-bold text-emerald-700">
                    Ver contas
                  </button>
                </div>
                {summary.upcoming.map((day) => (
                  <div key={day.date} className="border-t px-4 py-3 flex justify-between gap-3">
                    <span>
                      <span className="block font-bold text-gray-800">{showDate(day.date)}</span>
                      <span className="block text-xs text-gray-400">
                        {day.count} conta{day.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="font-black text-gray-800">{money(day.amount)}</span>
                  </div>
                ))}
              </section>
            )}

            <section className="bg-white rounded-2xl border p-4 flex flex-wrap gap-6">
              {Object.entries(summary.inflowByMethod).length === 0 && (
                <p className="text-sm text-gray-400">Sem entradas neste período.</p>
              )}
              {Object.entries(summary.inflowByMethod).map(([method, value]) => (
                <div key={method}>
                  <p className="text-[10px] font-black uppercase text-gray-400">{method}</p>
                  <p className="font-black text-gray-800">{money(value)}</p>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "negative";
}) {
  return (
    <div className="bg-white rounded-2xl border p-4">
      <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
      <p className={`text-2xl font-black ${tone === "negative" ? "text-red-600" : "text-gray-800"}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}
