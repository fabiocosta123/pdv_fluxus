"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Printer, Store } from "lucide-react";
import { STORE_DEFAULTS } from "@/modules/settings/defaults";
import type { StoreSettings } from "@/modules/settings/types";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings>(STORE_DEFAULTS);

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          toast.error(data.error || "Não foi possível carregar as configurações");
          return;
        }
        if (active) setSettings(data);
      })
      .catch(() => toast.error("Não foi possível carregar as configurações"));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Configurações</h1>
          <p className="text-sm text-gray-500">Dados da loja e impressão do cupom</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <section className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/settings/store")}
            className="bg-white rounded-2xl border p-5 text-left hover:border-gray-500 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="bg-gray-700 text-white w-12 h-12 rounded-2xl flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300" />
            </div>
            <p className="mt-4 text-[10px] font-black uppercase text-gray-400">Loja</p>
            <p className="text-xl font-black text-gray-800">{settings.tradeName}</p>
            <p className="text-sm text-gray-500 mt-1">{settings.address}</p>
            <p className="text-sm text-gray-400 mt-1">CNPJ {settings.cnpj}</p>
          </button>

          <button
            onClick={() => router.push("/settings/print")}
            className="bg-white rounded-2xl border p-5 text-left hover:border-gray-500 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="bg-gray-700 text-white w-12 h-12 rounded-2xl flex items-center justify-center">
                <Printer className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300" />
            </div>
            <p className="mt-4 text-[10px] font-black uppercase text-gray-400">Impressão</p>
            <p className="text-xl font-black text-gray-800">{settings.printWidth}</p>
            <p className="text-sm text-gray-500 mt-1">Largura do cupom de venda e do fechamento</p>
          </button>
        </section>
      </main>
    </div>
  );
}
