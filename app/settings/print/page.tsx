"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { STORE_DEFAULTS } from "@/modules/settings/defaults";
import type { PrintWidthId, StoreSettings } from "@/modules/settings/types";

const WIDTHS: { id: PrintWidthId; label: string; hint: string }[] = [
  { id: "58mm", label: "58 mm", hint: "Bobina estreita" },
  { id: "80mm", label: "80 mm", hint: "Bobina larga" },
];

export default function PrintSettingsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PrintWidthId>(STORE_DEFAULTS.printWidth);
  const [saving, setSaving] = useState<PrintWidthId | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then(async (response) => {
        const data: StoreSettings = await response.json().catch(() => STORE_DEFAULTS);
        if (response.ok && active) setSelected(data.printWidth);
      })
      .catch(() => toast.error("Não foi possível carregar a impressão"));
    return () => {
      active = false;
    };
  }, []);

  async function choose(printWidth: PrintWidthId) {
    setSaving(printWidth);
    const response = await fetch("/api/settings/print", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printWidth }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(null);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível salvar a impressão");
      return;
    }
    setSelected(data.printWidth);
    toast.success(`Cupom em ${data.printWidth}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/settings")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Impressão</h1>
          <p className="text-sm text-gray-500">Vale para o cupom da venda e para o fechamento</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 grid gap-4">
        {WIDTHS.map((width) => {
          const active = selected === width.id;
          return (
            <button
              key={width.id}
              disabled={saving !== null}
              onClick={() => choose(width.id)}
              className={`rounded-2xl border p-5 text-left ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white"}`}
            >
              <p className="text-xl font-black">{width.label}</p>
              <p className={`text-sm mt-1 ${active ? "text-gray-300" : "text-gray-500"}`}>
                {saving === width.id ? "Salvando..." : width.hint}
              </p>
            </button>
          );
        })}
      </main>
    </div>
  );
}
