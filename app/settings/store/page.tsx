"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { STORE_DEFAULTS } from "@/modules/settings/defaults";
import type { StoreSettings } from "@/modules/settings/types";

export default function StoreSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tradeName: STORE_DEFAULTS.tradeName,
    address: STORE_DEFAULTS.address,
    cnpj: STORE_DEFAULTS.cnpj,
    phone: STORE_DEFAULTS.phone ?? "",
    footer: STORE_DEFAULTS.footer,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then(async (response) => {
        const data: StoreSettings = await response.json().catch(() => STORE_DEFAULTS);
        if (!response.ok || !active) return;
        setForm({
          tradeName: data.tradeName,
          address: data.address,
          cnpj: data.cnpj,
          phone: data.phone ?? "",
          footer: data.footer,
        });
      })
      .catch(() => toast.error("Não foi possível carregar a loja"));
    return () => {
      active = false;
    };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/settings/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível salvar a loja");
      return;
    }
    toast.success("Dados da loja salvos");
    router.push("/settings");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/settings")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Loja</h1>
          <p className="text-sm text-gray-500">Nome, endereço e CNPJ impressos no cupom</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6">
        <form onSubmit={save} className="bg-white rounded-2xl border p-6 space-y-3">
          <label className="block text-xs font-bold text-gray-400 uppercase">
            Nome
            <input required value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} className="mt-1 w-full border rounded-lg p-3 text-base font-medium normal-case" />
          </label>
          <label className="block text-xs font-bold text-gray-400 uppercase">
            Endereço
            <input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-1 w-full border rounded-lg p-3 text-base font-medium normal-case" />
          </label>
          <label className="block text-xs font-bold text-gray-400 uppercase">
            CNPJ
            <input required value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} className="mt-1 w-full border rounded-lg p-3 text-base font-medium normal-case" />
          </label>
          <label className="block text-xs font-bold text-gray-400 uppercase">
            Telefone
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Opcional" className="mt-1 w-full border rounded-lg p-3 text-base font-medium normal-case" />
          </label>
          <label className="block text-xs font-bold text-gray-400 uppercase">
            Frase do cupom
            <input value={form.footer} onChange={(event) => setForm({ ...form, footer: event.target.value })} className="mt-1 w-full border rounded-lg p-3 text-base font-medium normal-case" />
          </label>
          <button disabled={saving} className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </main>
    </div>
  );
}
