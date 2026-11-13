"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarClock, Wallet } from "lucide-react";
import { MoneyInput } from "@/app/components/MoneyInput";
import { money, showDate } from "@/app/finance/format";
import { projectMonth, type MonthOutlook } from "@/modules/finance/projection";
import type { FinanceSummary } from "@/modules/finance/types";

function periodLength(from: string, to: string) {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((end - start) / 86_400_000) + 1;
}

function salesMovement(current: number, previous: number, from: string, to: string) {
  const days = periodLength(from, to);
  const compared = days === 1 ? "ao dia anterior" : `aos ${days} dias anteriores`;
  const empty = days === 1 ? "O dia anterior não teve venda." : `Os ${days} dias anteriores não tiveram venda.`;
  const change = current - previous;
  if (current === 0 && previous === 0) {
    return { text: "Nenhuma venda neste período.", tone: "flat" as const };
  }
  if (previous === 0) {
    return { text: `Aumentaram ${money(change)}. ${empty}`, tone: "up" as const };
  }
  const rate = `${Math.abs((change / previous) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (change > 0) return { text: `Aumentaram ${money(change)} (${rate}) em relação ${compared}.`, tone: "up" as const };
  if (change < 0) {
    return { text: `Diminuíram ${money(Math.abs(change))} (${rate}) em relação ${compared}.`, tone: "down" as const };
  }
  return { text: `Ficaram iguais em relação ${compared}.`, tone: "flat" as const };
}

export default function FinancePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [goal, setGoal] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem("fluxus-reserve-goal");
    if (saved) setGoal(Number(saved) || 0);
  }, []);

  function changeGoal(value: number) {
    setGoal(value);
    window.localStorage.setItem("fluxus-reserve-goal", String(value));
  }

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

  const balance = summary ? summary.availableTotal - summary.expensePaid : 0;
  const movement = summary
    ? salesMovement(summary.salesTotal, summary.previousSalesTotal, summary.from, summary.to)
    : null;
  const outlook = summary ? projectMonth(summary.monthOutlook, goal) : null;
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
        <button onClick={() => router.push("/management")} className="p-2 rounded-full hover:bg-gray-100">
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
            <section className="grid md:grid-cols-2 gap-4">
              <article className="bg-white rounded-2xl border p-5">
                <p className="text-[10px] font-black uppercase text-gray-400">Vendas</p>
                <p className="text-2xl font-black text-gray-800">{money(summary.salesTotal)}</p>
                <p
                  className={`text-sm mt-1 ${
                    movement?.tone === "up"
                      ? "text-emerald-700"
                      : movement?.tone === "down"
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {movement?.text}
                </p>
              </article>
              <article className="bg-white rounded-2xl border p-5">
                <p className="text-[10px] font-black uppercase text-gray-400">Lucro</p>
                <p className={`text-2xl font-black ${summary.profit < 0 ? "text-red-600" : "text-gray-800"}`}>
                  {money(summary.profit)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.salesTotal > 0
                    ? `${((summary.profit / summary.salesTotal) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% sobre as vendas`
                    : "Sem vendas neste período."}
                </p>
                <p className="text-xs text-gray-400 mt-1">Preço vendido menos o custo cadastrado dos produtos.</p>
              </article>
            </section>

            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Stat label="Entrou" value={money(summary.inflowTotal)} hint="Vendas à vista e recebimentos" />
              <Stat
                label="Disponível"
                value={money(summary.availableTotal)}
                hint={
                  summary.supplyTotal > 0
                    ? `Entrou mais ${money(summary.supplyTotal)} de aporte`
                    : "Entrou mais os aportes do caixa"
                }
              />
              <Stat label="Saiu" value={money(summary.expensePaid)} hint="Despesas pagas no período" />
              <Stat
                label="Sobrou"
                value={money(balance)}
                hint="Disponível menos o que saiu"
                tone={balance < 0 ? "negative" : "default"}
              />
            </section>

            {outlook && (
              <section
                className={`rounded-2xl border-2 p-5 space-y-4 ${
                  outlook.salesSoFar === 0
                    ? "border-gray-200 bg-white"
                    : outlook.onTrack
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-500">Projeção do mês</p>
                    <p className="text-sm text-gray-500">
                      Dia {outlook.elapsedDays} de {outlook.daysInMonth}. O lucro já desconta o custo do produto vendido.
                    </p>
                  </div>
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Quero guardar
                    <MoneyInput
                      value={goal}
                      onChange={changeGoal}
                      className="mt-1 block w-40 rounded-xl border bg-white px-3 py-2 text-lg font-black text-gray-800"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Vendas até agora" value={money(outlook.salesSoFar)} hint={`Projeção ${money(outlook.projectedSales)}`} />
                  <Stat label="Lucro projetado" value={money(outlook.projectedProfit)} hint="Preço menos o custo, no ritmo atual" />
                  <Stat label="Contas do mês" value={money(outlook.bills)} hint="Pagas neste mês e as que vencem até o fim, inclusive atrasadas" />
                </div>

                <div>
                  <p className="text-lg font-black text-gray-900">{outlookHeadline(outlook, goal)}</p>
                  <p className="mt-1 text-sm text-gray-700">{outlookDetail(outlook, goal)}</p>
                </div>
              </section>
            )}

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
              {Object.entries(summary.inflowByMethod).length === 0 && summary.supplyTotal === 0 && (
                <p className="text-sm text-gray-400">Sem entradas neste período.</p>
              )}
              {Object.entries(summary.inflowByMethod).map(([method, value]) => (
                <div key={method}>
                  <p className="text-[10px] font-black uppercase text-gray-400">{method}</p>
                  <p className="font-black text-gray-800">{money(value)}</p>
                </div>
              ))}
              {summary.supplyTotal > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Aporte</p>
                  <p className="font-black text-gray-800">{money(summary.supplyTotal)}</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function outlookHeadline(outlook: MonthOutlook, goal: number) {
  if (outlook.salesSoFar <= 0) return "Ainda não há venda neste mês para projetar o ritmo.";
  if (outlook.onTrack && goal > 0) return "No ritmo atual, dá para honrar as contas e guardar a meta.";
  if (outlook.onTrack) return "No ritmo atual, o lucro cobre as contas do mês.";
  if (goal > 0) return `No ritmo atual, faltam ${money(outlook.gap)} para guardar ${money(goal)} depois das contas.`;
  return `No ritmo atual, faltam ${money(outlook.gap)} para cobrir as contas.`;
}

function outlookDetail(outlook: MonthOutlook, goal: number) {
  if (outlook.salesSoFar <= 0) {
    const bills = outlook.bills > 0 ? `As contas até o fim do mês somam ${money(outlook.bills)}. ` : "";
    const target = goal > 0 ? `A meta é guardar ${money(goal)}.` : "Defina quanto quer guardar no fim do mês.";
    return `${bills}${target}`;
  }

  if (outlook.onTrack) {
    const spare = outlook.left - goal;
    return goal > 0
      ? `O lucro projetado é ${money(outlook.projectedProfit)} e as contas somam ${money(outlook.bills)}. Sobra ${money(outlook.left)}, ${money(spare)} acima da meta.`
      : `O lucro projetado é ${money(outlook.projectedProfit)}. Depois das contas, sobram ${money(outlook.left)}.`;
  }

  const margin = outlook.profitSoFar / outlook.salesSoFar;
  if (margin <= 0) {
    return `A margem das vendas está negativa, então vender mais nesse preço aumenta o buraco. Suba os preços para o valor sugerido no cadastro ou reduza ${money(outlook.gap)} nas contas.`;
  }

  const daily =
    outlook.perDay != null && outlook.remainingDays > 0
      ? ` Isso dá cerca de ${money(outlook.perDay)} por dia nos ${outlook.remainingDays} dias que faltam.`
      : "";
  return `Venda mais cerca de ${money(outlook.extraSales ?? 0)} até o fim do mês.${daily} Ou reduza ${money(outlook.gap)} nas contas a pagar.`;
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
