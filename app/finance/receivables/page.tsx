"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { MoneyInput } from "@/app/components/MoneyInput";
import { money, showDate } from "@/app/finance/format";
import { formatDocument } from "@/modules/customers/document";
import type { FinanceReceipt, FinanceReceivable } from "@/modules/finance/types";

const PAY_METHODS = [
  { id: "DINHEIRO", label: "Dinheiro" },
  { id: "PIX", label: "Pix" },
  { id: "DEBITO", label: "Débito" },
  { id: "CREDITO", label: "Crédito" },
];

const FILTERS = [
  { id: "OPEN", label: "Em aberto" },
  { id: "PAID", label: "Baixadas" },
] as const;

function storeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default function ReceivablesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof FILTERS)[number]["id"]>("OPEN");
  const [receivables, setReceivables] = useState<FinanceReceivable[]>([]);
  const [receipts, setReceipts] = useState<FinanceReceipt[]>([]);
  const [settling, setSettling] = useState<FinanceReceivable | null>(null);
  const [amount, setAmount] = useState(0);
  const [interest, setInterest] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paidOn, setPaidOn] = useState("");
  const [payMethod, setPayMethod] = useState("DINHEIRO");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (nextStatus: string) => {
    const response = await fetch(`/api/finance/receivables?status=${nextStatus}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível carregar as contas a receber");
      return;
    }
    if (nextStatus === "PAID") setReceipts(data);
    else setReceivables(data);
  }, []);

  useEffect(() => {
    void load(status);
  }, [load, status]);

  function openSettle(item: FinanceReceivable) {
    setAmount(item.amount);
    setInterest(0);
    setDiscount(0);
    setPaidOn(storeToday());
    setPayMethod("DINHEIRO");
    setSettling(item);
  }

  const received = amount + interest - discount;
  const creditAfter =
    settling?.creditLimit == null ? null : settling.creditLimit - (settling.amount - amount);

  async function confirmSettlement() {
    if (!settling || saving) return;
    if (!paidOn) {
      toast.error("Informe a data do pagamento");
      return;
    }
    if (amount <= 0) {
      toast.error("Informe o valor da conta");
      return;
    }
    if (amount > settling.amount) {
      toast.error("Valor maior que a dívida atual");
      return;
    }
    if (discount > amount) {
      toast.error("Desconto maior que o valor da conta");
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/finance/receivables/${settling.customerId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        interest,
        discount,
        paidOn,
        method: payMethod,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível dar baixa");
      return;
    }
    toast.success("Conta baixada. O crédito do cliente foi atualizado.");
    setSettling(null);
    await load(status);
  }

  const total = receivables.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/finance")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Contas a receber</h1>
          <p className="text-sm text-gray-500">Baixa da carteira, com vencimento, pagamento, juros e desconto</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatus(filter.id)}
              className={`px-4 py-2 rounded-xl font-bold ${status === filter.id ? "bg-gray-900 text-white" : "bg-white border"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {status === "OPEN" && (
          <>
            <section className="bg-white rounded-2xl border p-4">
              <p className="text-[10px] font-black uppercase text-gray-400">Em aberto</p>
              <p className="text-2xl font-black text-gray-800">{money(total)}</p>
            </section>
            <section className="bg-white rounded-2xl border overflow-hidden">
              {receivables.length === 0 && <p className="p-4 text-sm text-gray-400">Nenhum cliente em débito.</p>}
              {receivables.map((item) => (
                <div key={item.customerId} className="border-t first:border-t-0 px-4 py-3 flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatDocument(item.document) || "Sem documento"} · desde {showDate(item.since)} · vence {showDate(item.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-600">{money(item.amount)}</p>
                    <button onClick={() => openSettle(item)} className="text-xs font-bold text-emerald-700">
                      Dar baixa
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {status === "PAID" && (
          <section className="bg-white rounded-2xl border overflow-hidden">
            {receipts.length === 0 && <p className="p-4 text-sm text-gray-400">Nenhuma conta baixada.</p>}
            {receipts.map((item) => (
              <div key={item.id} className="border-t first:border-t-0 px-4 py-3 flex justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    baixado por {item.settledBy || "—"} · venceu {showDate(item.dueDate)} · pago em {showDate(item.paidOn)}
                    {item.method ? ` · ${item.method}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.interest > 0 || item.discount > 0
                      ? `${item.interest > 0 ? `Juros ${money(item.interest)}` : "Sem juros"}${item.discount > 0 ? ` · Desconto ${money(item.discount)}` : " · Sem desconto"}`
                      : "Sem juros nem desconto"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-700">{money(item.received)}</p>
                  <p className="text-[10px] text-gray-400">conta {money(item.amount)}</p>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {settling && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-black">Dar baixa em {settling.name}</h2>
            <p className="text-sm text-gray-500">
              Dívida {money(settling.amount)} · vence {showDate(settling.dueDate)}
            </p>
            <label className="block text-xs font-bold text-gray-400 uppercase">
              Valor da conta
              <MoneyInput value={amount} onChange={setAmount} className="mt-1 w-full border rounded-lg p-3 text-xl font-bold" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-gray-400 uppercase">
                Juros
                <MoneyInput value={interest} onChange={setInterest} className="mt-1 w-full border rounded-lg p-3 font-bold" />
              </label>
              <label className="block text-xs font-bold text-gray-400 uppercase">
                Desconto
                <MoneyInput value={discount} onChange={setDiscount} className="mt-1 w-full border rounded-lg p-3 font-bold" />
              </label>
            </div>
            <label className="block text-xs font-bold text-gray-400 uppercase">
              Data do pagamento
              <input required type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} className="mt-1 w-full border rounded-lg p-3" />
            </label>
            <select value={payMethod} onChange={(event) => setPayMethod(event.target.value)} className="w-full border rounded-lg p-3">
              {PAY_METHODS.map((method) => (
                <option key={method.id} value={method.id}>{method.label}</option>
              ))}
            </select>
            <p className="text-sm text-gray-600">
              Valor recebido {money(Math.max(received, 0))}. O crédito do cliente aumenta em {money(amount)}.
              {creditAfter != null && settling.availableCredit != null
                ? ` Disponível passa de ${money(settling.availableCredit)} para ${money(creditAfter)}.`
                : ""}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setSettling(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancelar</button>
              <button disabled={saving} onClick={confirmSettlement} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold">
                {saving ? "Aguarde..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
