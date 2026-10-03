"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { MoneyInput } from "@/app/components/MoneyInput";
import { formatDocument, formatPhone, maskDocument } from "@/modules/customers/document";
import type { CustomerDetail, CustomerRecord } from "@/modules/customers/types";

const emptyForm = {
  name: "",
  document: "",
  birthDate: "",
  phone: "",
  creditLimit: null as number | null,
  status: "ACTIVE" as "ACTIVE" | "BLOCKED",
};

function money(cents: number | null) {
  if (cents == null) return "Sem limite";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CustomerManagementPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("DINHEIRO");

  const load = useCallback(async (term: string) => {
    const response = await fetch(`/api/customers?q=${encodeURIComponent(term)}`);
    if (!response.ok) {
      toast.error("Não foi possível carregar os clientes");
      return;
    }
    setCustomers(await response.json());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(query), 250);
    return () => clearTimeout(timer);
  }, [query, load]);

  async function openDetail(id: string) {
    const response = await fetch(`/api/customers/${id}`);
    if (!response.ok) {
      toast.error("Não foi possível abrir o cliente");
      return;
    }
    setDetail(await response.json());
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(customer: CustomerRecord) {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      document: formatDocument(customer.document),
      birthDate: customer.birthDate ?? "",
      phone: customer.phone ?? "",
      creditLimit: customer.creditLimit,
      status: customer.status,
    });
    setFormOpen(true);
  }

  async function saveCustomer(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      document: form.document,
      birthDate: form.birthDate || null,
      phone: form.phone || null,
      creditLimit: form.creditLimit,
      status: form.status,
    };
    const response = await fetch(editingId ? `/api/customers/${editingId}` : "/api/customers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, document: undefined } : payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível salvar o cliente");
      return;
    }
    toast.success(editingId ? "Cliente atualizado" : "Cliente cadastrado");
    setFormOpen(false);
    await load(query);
    if (detail?.id === data.id) await openDetail(data.id);
  }

  async function confirmPayment() {
    if (!detail) return;
    const response = await fetch(`/api/customers/${detail.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: payAmount, method: payMethod }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível receber");
      return;
    }
    toast.success("Débito recebido. Limite atualizado.");
    setPayOpen(false);
    await load(query);
    await openDetail(detail.id);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-500">Cadastro, limite de crédito e histórico</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, CPF ou CNPJ"
            className="flex-1 bg-white border rounded-xl px-4 py-3 outline-none focus:border-blue-500"
          />
          <button onClick={openCreate} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold">
            Novo cliente
          </button>
        </div>

        <div className="bg-white rounded-2xl border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase text-gray-400">
              <tr>
                <th className="p-4">Cliente</th>
                <th>CPF/CNPJ</th>
                <th>Nascimento</th>
                <th className="text-right">Limite</th>
                <th className="text-right">Dívida</th>
                <th className="text-right">Disponível</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t">
                  <td className="p-4">
                    <p className="font-bold text-gray-800">{customer.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatPhone(customer.phone) || "Sem telefone"} · {customer.status === "ACTIVE" ? "Ativo" : "Bloqueado"}
                    </p>
                  </td>
                  <td className="font-mono text-sm">{formatDocument(customer.document)}</td>
                  <td className="text-sm">{customer.birthDate ? customer.birthDate.split("-").reverse().join("/") : "—"}</td>
                  <td className="text-right">{money(customer.creditLimit)}</td>
                  <td className="text-right font-bold">{money(customer.currentDebt)}</td>
                  <td className="text-right">{money(customer.availableCredit)}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openDetail(customer.id)} className="text-sm font-bold text-blue-600">Histórico</button>
                    <button onClick={() => openEdit(customer)} className="text-sm font-bold text-gray-600">Editar</button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Nenhum cliente cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {detail && (
          <section className="bg-white rounded-2xl border p-6 space-y-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">{detail.name}</h2>
                <p className="text-sm text-gray-500">Disponível: {money(detail.availableCredit)}</p>
              </div>
              <button
                onClick={() => {
                  setPayAmount(detail.currentDebt);
                  setPayOpen(true);
                }}
                disabled={detail.currentDebt <= 0}
                className="bg-emerald-600 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl font-bold"
              >
                Receber débito
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-black uppercase text-gray-400 mb-2">Compras</h3>
                {detail.purchases.length === 0 && <p className="text-sm text-gray-400">Sem compras.</p>}
                {detail.purchases.map((sale) => (
                  <div key={sale.id} className="flex justify-between gap-3 border-b py-2 text-sm">
                    <span>
                      {new Date(sale.createdAt).toLocaleString("pt-BR")}
                      <span className="block text-[10px] text-gray-400">
                        {sale.payments.map((payment) => `${payment.method} ${money(payment.value)}`).join(" · ")}
                      </span>
                    </span>
                    <span className="font-bold">{money(sale.total)}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-gray-400 mb-2">Financeiro</h3>
                {detail.ledger.length === 0 && <p className="text-sm text-gray-400">Sem lançamentos.</p>}
                {detail.ledger.map((entry) => (
                  <div key={entry.id} className="flex justify-between border-b py-2 text-sm">
                    <span>
                      {entry.type === "CHARGE" ? "Venda em carteira" : `Recebimento ${entry.method ?? ""}`}
                      <span className="block text-[10px] text-gray-400">
                        {entry.type === "PAYMENT" && entry.paidOn
                          ? `Pago em ${entry.paidOn.split("-").reverse().join("/")}`
                          : "Saldo"}
                        {entry.settledBy ? ` · ${entry.settledBy}` : ""} · saldo {money(entry.balanceAfter)}
                        {entry.interest > 0 ? ` · juros ${money(entry.interest)}` : ""}
                        {entry.discount > 0 ? ` · desconto ${money(entry.discount)}` : ""}
                      </span>
                    </span>
                    <span className={entry.type === "CHARGE" ? "text-red-600 font-bold" : "text-emerald-700 font-bold"}>
                      {entry.type === "CHARGE" ? "+" : "-"}
                      {money(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={saveCustomer} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <h2 className="text-lg font-black">{editingId ? "Editar cliente" : "Novo cliente"}</h2>
            <input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg p-3" />
            <input required={!editingId} disabled={Boolean(editingId)} inputMode="numeric" placeholder="CPF ou CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: maskDocument(e.target.value) })} className="w-full border rounded-lg p-3 disabled:bg-gray-100" />
            <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="w-full border rounded-lg p-3" />
            <input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg p-3" />
            <label className="block text-xs font-bold text-gray-400 uppercase">Limite de crédito (opcional)</label>
            <MoneyInput value={form.creditLimit ?? 0} onChange={(value) => setForm({ ...form, creditLimit: value })} className="w-full border rounded-lg p-3 text-xl font-bold" />
            <button type="button" onClick={() => setForm({ ...form, creditLimit: null })} className="text-xs font-bold text-gray-500">Sem limite de crédito</button>
            {editingId && (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" | "BLOCKED" })} className="w-full border rounded-lg p-3">
                <option value="ACTIVE">Ativo</option>
                <option value="BLOCKED">Bloqueado</option>
              </select>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancelar</button>
              <button className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {payOpen && detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-black">Receber de {detail.name}</h2>
            <p className="text-sm text-gray-500">Dívida atual {money(detail.currentDebt)}</p>
            <MoneyInput value={payAmount} onChange={setPayAmount} className="w-full border-b text-4xl font-black outline-none" />
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full border rounded-lg p-3">
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">Pix</option>
              <option value="DEBITO">Débito</option>
              <option value="CREDITO">Crédito</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setPayOpen(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancelar</button>
              <button onClick={confirmPayment} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
