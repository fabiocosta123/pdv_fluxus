"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { money, showDate } from "@/app/finance/format";
import { formatCpf } from "@/modules/customers/document";
import type { FinanceReceivable } from "@/modules/finance/types";

export default function ReceivablesPage() {
  const router = useRouter();
  const [receivables, setReceivables] = useState<FinanceReceivable[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/finance/receivables");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível carregar as contas a receber");
      return;
    }
    setReceivables(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = receivables.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/finance")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Contas a receber</h1>
          <p className="text-sm text-gray-500">Cada débito mostra a data em que ficou em aberto</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <section className="bg-white rounded-2xl border p-4">
          <p className="text-[10px] font-black uppercase text-gray-400">Em aberto</p>
          <p className="text-2xl font-black text-gray-800">{money(total)}</p>
        </section>

        <section className="bg-white rounded-2xl border overflow-hidden">
          {receivables.length === 0 && <p className="p-4 text-sm text-gray-400">Nenhum cliente em débito.</p>}
          {receivables.map((item) => (
            <button
              key={item.customerId}
              onClick={() => router.push("/management/customer")}
              className="w-full text-left border-t first:border-t-0 px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex justify-between gap-3">
                <span>
                  <span className="block font-bold text-gray-800">{item.name}</span>
                  <span className="block text-xs text-gray-400">
                    {formatCpf(item.document) || "Sem CPF"} · desde {showDate(item.since)}
                  </span>
                </span>
                <span className="font-black text-red-600">{money(item.amount)}</span>
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
