"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutDashboard } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [setup, setSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!active) return;
        if (response.ok) {
          router.replace("/");
          return;
        }
        const data = await response.json().catch(() => ({}));
        setSetup(Boolean(data.setup));
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(setup ? "/api/auth/setup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setup ? { name, username, password } : { username, password }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível entrar");
      return;
    }
    router.replace("/");
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-white rounded-2xl border w-full max-w-md p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Fluxus PDV</h1>
            <p className="text-sm text-gray-500">
              {setup ? "Crie o proprietário para começar" : "Entre com seu usuário"}
            </p>
          </div>
        </div>
        {setup && (
          <input required placeholder="Nome" value={name} onChange={(event) => setName(event.target.value)} className="w-full border rounded-lg p-3" />
        )}
        <input required placeholder="Usuário" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full border rounded-lg p-3" autoCapitalize="none" />
        <input required type="password" placeholder="Senha" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border rounded-lg p-3" />
        <button disabled={saving} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold">
          {saving ? "Aguarde..." : setup ? "Criar proprietário" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
