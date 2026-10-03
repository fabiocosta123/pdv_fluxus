"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { MoneyInput } from "@/app/components/MoneyInput";
import { money, showDate } from "@/app/finance/format";
import { EXPENSE_CATEGORIES } from "@/modules/finance/labels";
import type { FinanceExpense } from "@/modules/finance/types";

const PAY_METHODS = [
  { id: "DINHEIRO", label: "Dinheiro" },
  { id: "PIX", label: "Pix" },
  { id: "DEBITO", label: "Débito" },
  { id: "CREDITO", label: "Crédito" },
];

const FILTERS = [
  { id: "PENDING", label: "Em aberto" },
  { id: "PAID", label: "Pagas" },
] as const;

export default function PayablesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof FILTERS)[number]["id"]>("PENDING");
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [paying, setPaying] = useState<FinanceExpense | null>(null);
  const [payMethod, setPayMethod] = useState("DINHEIRO");
  const [form, setForm] = useState({
    description: "",
    category: "FORNECEDOR",
    amount: 0,
    dueDate: "",
    note: "",
    payNow: false,
    method: "DINHEIRO",
  });

  const load = useCallback(async (nextStatus: string) => {
    const response = await fetch(`/api/finance/payables?status=${nextStatus}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível carregar as contas a pagar");
      return;
    }
    setExpenses(data);
  }, []);

  useEffect(() => {
    void load(status);
  }, [load, status]);

  function openForm() {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    setForm({
      description: "",
      category: "FORNECEDOR",
      amount: 0,
      dueDate: today,
      note: "",
      payNow: false,
      method: "DINHEIRO",
    });
    setFormOpen(true);
  }

  async function saveExpense(event: React.FormEvent) {
    event.preventDefault();
    if (form.amount <= 0) {
      toast.error("Informe o valor");
      return;
    }
    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        category: form.category,
        amount: form.amount,
        dueDate: form.dueDate,
        note: form.note,
        payNow: form.payNow,
        method: form.payNow ? form.method : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível lançar a despesa");
      return;
    }
    toast.success(form.payNow ? "Despesa paga" : "Despesa lançada");
    setFormOpen(false);
    setStatus(form.payNow ? "PAID" : "PENDING");
    await load(form.payNow ? "PAID" : "PENDING");
  }

  async function confirmPayment() {
    if (!paying) return;
    const response = await fetch(`/api/finance/expenses/${paying.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: payMethod }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível pagar a despesa");
      return;
    }
    toast.success("Despesa paga");
    setPaying(null);
    await load(status);
  }

  async function removeExpense(expense: FinanceExpense) {
    const response = await fetch(`/api/finance/expenses/${expense.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error || "Não foi possível excluir");
      return;
    }
    toast.success("Despesa excluída");
    await load(status);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/finance")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Contas a pagar</h1>
          <p className="text-sm text-gray-500">Cada conta tem um vencimento</p>
        </div>
        <button onClick={openForm} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold">
          Nova despesa
        </button>
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

        <section className="bg-white rounded-2xl border overflow-hidden">
          {expenses.length === 0 && (
            <p className="p-4 text-sm text-gray-400">
              {status === "PENDING" ? "Nenhuma conta em aberto." : "Nenhuma despesa paga."}
            </p>
          )}
          {expenses.map((expense) => (
            <div key={expense.id} className="border-t first:border-t-0 px-4 py-3 flex justify-between gap-3">
              <div>
                <p className="font-bold text-gray-800">{expense.description}</p>
                <p className="text-xs text-gray-400">
                  {expense.categoryLabel} · vence {showDate(expense.dueDate)}
                  {expense.status === "PAID" ? ` · pago em ${expense.method}` : " · em aberto"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black">{money(expense.amount)}</p>
                {expense.status === "PENDING" && (
                  <button
                    onClick={() => {
                      setPayMethod("DINHEIRO");
                      setPaying(expense);
                    }}
                    className="text-xs font-bold text-emerald-700"
                  >
                    Pagar
                  </button>
                )}
                <button onClick={() => removeExpense(expense)} className="ml-3 text-xs font-bold text-red-500">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>

      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={saveExpense} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <h2 className="text-lg font-black">Nova despesa</h2>
            <input required placeholder="Descrição" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full border rounded-lg p-3" />
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full border rounded-lg p-3">
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
            <MoneyInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} className="w-full border rounded-lg p-3 text-xl font-bold" />
            <label className="block text-xs font-bold text-gray-400 uppercase">
              Vencimento
              <input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="mt-1 w-full border rounded-lg p-3" />
            </label>
            <input placeholder="Observação" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="w-full border rounded-lg p-3" />
            <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
              <input type="checkbox" checked={form.payNow} onChange={(event) => setForm({ ...form, payNow: event.target.checked })} />
              Já foi paga
            </label>
            {form.payNow && (
              <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} className="w-full border rounded-lg p-3">
                {PAY_METHODS.map((method) => (
                  <option key={method.id} value={method.id}>{method.label}</option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-400">
              Dinheiro é aceito mesmo com o caixa fechado. O valor não sai da gaveta do caixa aberto.
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancelar</button>
              <button className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {paying && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-black">Pagar {paying.description}</h2>
            <p className="text-sm text-gray-500">
              {money(paying.amount)} · vence {showDate(paying.dueDate)}
            </p>
            <select value={payMethod} onChange={(event) => setPayMethod(event.target.value)} className="w-full border rounded-lg p-3">
              {PAY_METHODS.map((method) => (
                <option key={method.id} value={method.id}>{method.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              Dinheiro vale mesmo que tenha ficado guardado de um fechamento anterior.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPaying(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancelar</button>
              <button onClick={confirmPayment} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
