"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CashierReport } from "@/modules/cashier/types";
import {
  CONFERENCE_METHODS,
  brokenMethods,
  cashDrawerLines,
  differenceLabel,
  expectedAmount,
} from "@/modules/cashier/conference";
import {
  ArrowLeft,
  Printer,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CalendarSearch,
} from "lucide-react";

// --- Sub-componente para o Card de Relatório ---
const ReportCard = ({
  report,
  formatCurrency,
}: {
  report: CashierReport;
  formatCurrency: (value: number) => string;
}) => {
  const breaks = brokenMethods(report);
  const hasDiff = breaks.length > 0;
  const closedDate = new Date(report.closedAt);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:border-blue-300 transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase mb-2 inline-block">
              Turno Encerrado
            </span>
            <h2 className="text-lg font-bold text-gray-800 capitalize">
              {closedDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <p className="text-sm text-gray-500 font-mono">
              Hora do fechamento: {closedDate.toLocaleTimeString()}
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          >
            <Printer className="w-4 h-4" /> REIMPRIMIR
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatBox label="Total em Vendas" value={formatCurrency(report.totalSold)} />
          <StatBox label="Abertura de Caixa" value={formatCurrency(report.openingValue)} />
          <StatBox label="Dinheiro Contado" value={formatCurrency(report.countedValues.DINHEIRO)} />
          
          <div className={`p-4 rounded-xl border-2 ${hasDiff ? "border-red-100 bg-red-50" : "border-green-100 bg-green-50"}`}>
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-[10px] font-black uppercase ${hasDiff ? "text-red-500" : "text-green-600"}`}>
                Diferença (Quebra)
              </p>
              {hasDiff ? <AlertCircle className="w-3 h-3 text-red-500" /> : <CheckCircle2 className="w-3 h-3 text-green-600" />}
            </div>
            {hasDiff ? (
              <ul className="space-y-1">
                {breaks.map((method) => (
                  <li key={method}>
                    <p className="text-[10px] font-black uppercase text-red-500">{method}</p>
                    <p className="text-xl font-black text-red-600">
                      {differenceLabel(report.differences[method])}{" "}
                      {formatCurrency(Math.abs(report.differences[method]))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xl font-black text-green-700">Sem quebra</p>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-2">
            Conferência por meio
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-400">
                <th className="text-left font-black pb-2">Meio</th>
                <th className="text-right font-black pb-2">Esperado</th>
                <th className="text-right font-black pb-2">Contado</th>
                <th className="text-right font-black pb-2">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {CONFERENCE_METHODS.map((method) => {
                const diff = report.differences[method];
                const broken = diff !== 0;
                return (
                  <tr key={method} className={broken ? "bg-red-50" : ""}>
                    <td className="py-2 pr-3 font-bold text-gray-800">{method}</td>
                    <td className="py-2 text-right text-gray-600">
                      {formatCurrency(expectedAmount(report, method))}
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {formatCurrency(report.countedValues[method])}
                    </td>
                    <td className={`py-2 text-right font-black ${broken ? "text-red-600" : "text-green-700"}`}>
                      {broken
                        ? `${differenceLabel(diff)} ${formatCurrency(Math.abs(diff))}`
                        : "OK"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {report.differences.DINHEIRO !== 0 && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-4">
            <p className="text-[10px] font-black uppercase text-red-500 mb-2">
              Composição do dinheiro esperado
            </p>
            <div className="space-y-1">
              {cashDrawerLines(report).map((line) => (
                <div key={line.label} className="flex justify-between text-sm text-gray-700">
                  <span>{line.label}</span>
                  <span className="font-bold">{formatCurrency(line.value)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-black text-gray-900 border-t border-red-100 pt-2 mt-2">
                <span>Esperado na gaveta</span>
                <span>{formatCurrency(report.moneyExpected)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900">
                <span>Contado</span>
                <span>{formatCurrency(report.countedValues.DINHEIRO)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50/50 px-6 py-4 border-t flex flex-wrap gap-8">
        {Object.entries(report.salesByMethod).map(([method, value]) => (
          <div key={method}>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{method}</span>
            <p className="text-sm font-bold text-gray-600">{formatCurrency(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatBox = ({ label, value }: { label: string, value: string }) => (
  <div className="bg-gray-50 p-4 rounded-xl">
    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{label}</p>
    <p className="text-xl font-black text-gray-800">{value}</p>
  </div>
);

// --- Componente Principal ---
export default function CashierReports() {
  const [history, setHistory] = useState<CashierReport[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const router = useRouter();

  useEffect(() => {
    let active = true;

    fetch("/api/cashier/reports")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as CashierReport[];
        if (active) setHistory(data);
      })
      .catch(() => {
        if (active) toast.error("Não foi possível carregar os fechamentos");
      });

    return () => {
      active = false;
    };
  }, []);

  // Filtro inteligente usando useMemo para performance
  const filteredHistory = useMemo(() => {
    return history.filter((report) => {
      if (!startDate && !endDate) return true;
      const reportDate = new Date(report.closedAt).toISOString().split("T")[0];
      
      const matchStart = startDate ? reportDate >= startDate : true;
      const matchEnd = endDate ? reportDate <= endDate : true;
      
      return matchStart && matchEnd;
    });
  }, [history, startDate, endDate]);

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-black text-gray-800 tracking-tighter uppercase">
              Relatórios de Fechamento
            </h1>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white p-4 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">De:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      <main id="cashier-reports" className="max-w-7xl mx-auto px-4 py-8">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            {history.length === 0 ? (
              <>
                <TrendingUp className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhum fechamento registrado ainda.</p>
              </>
            ) : (
              <>
                <CalendarSearch className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhum resultado para este período.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredHistory.map((report, index) => (
              <ReportCard key={index} report={report} formatCurrency={formatCurrency} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}