"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível trocar a senha");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Senha alterada. Os outros acessos desta conta foram encerrados.");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button type="button" onClick={() => router.push("/")} className="p-2 rounded-full hover:bg-gray-100" aria-label="Voltar">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Minha senha</h1>
          <p className="text-sm text-gray-500">A senha atual precisa conferir. Quem estava em outro aparelho entra de novo.</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6">
        <form onSubmit={submit} className="bg-white rounded-2xl border p-5 space-y-3">
          <label className="block text-sm font-bold text-gray-700">
            Senha atual
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full border rounded-lg p-3 font-normal"
            />
          </label>
          <label className="block text-sm font-bold text-gray-700">
            Nova senha
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full border rounded-lg p-3 font-normal"
            />
          </label>
          <label className="block text-sm font-bold text-gray-700">
            Confirme a nova senha
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full border rounded-lg p-3 font-normal"
            />
          </label>
          <button disabled={saving} className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">
            {saving ? "Salvando..." : "Salvar senha"}
          </button>
        </form>
      </main>
    </div>
  );
}
