"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CalendarSearch,
} from "lucide-react";

// --- Sub-componente para o Card de Relatório ---
const ReportCard = ({ report, formatCurrency }: { report: any, formatCurrency: Function }) => {
  const hasDiff = report.differences.DINHEIRO !== 0;
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
            <p className={`text-xl font-black ${hasDiff ? "text-red-600" : "text-green-700"}`}>
              {formatCurrency(report.differences.DINHEIRO)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50/50 px-6 py-4 border-t flex flex-wrap gap-8">
        {Object.entries(report.salesByMethod).map(([method, value]: any) => (
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
  const [history, setHistory] = useState<any[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("closing_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      setHistory(parsed.sort((a: any, b: any) => 
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
      ));
    }
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

      <main className="max-w-7xl mx-auto px-4 py-8">
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