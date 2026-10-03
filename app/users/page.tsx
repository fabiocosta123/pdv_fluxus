"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ROLE_LABELS, type AuthUser } from "@/modules/auth/types";

const ROLES = [
  { id: "OPERATOR", label: ROLE_LABELS.OPERATOR, hint: "Caixa e relatórios" },
  { id: "MANAGER", label: ROLE_LABELS.MANAGER, hint: "Estoque, clientes, financeiro e configurações" },
  { id: "OWNER", label: ROLE_LABELS.OWNER, hint: "Tudo, inclusive usuários" },
] as const;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "OPERATOR" });

  const load = useCallback(async () => {
    const response = await fetch("/api/users");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível carregar os usuários");
      return;
    }
    setUsers(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível criar o usuário");
      return;
    }
    toast.success("Usuário criado");
    setForm({ name: "", username: "", password: "", role: "OPERATOR" });
    await load();
  }

  async function saveUser(user: AuthUser, patch: { role?: string; active?: boolean }) {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível salvar");
      await load();
      return;
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? data : item)));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Usuários</h1>
          <p className="text-sm text-gray-500">Operador no caixa e nos relatórios. Gerente no restante. Proprietário também cria usuários.</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <form onSubmit={createUser} className="bg-white rounded-2xl border p-5 grid sm:grid-cols-2 gap-3">
          <input required placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="border rounded-lg p-3" />
          <input required placeholder="Usuário" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="border rounded-lg p-3" autoCapitalize="none" />
          <input required type="password" placeholder="Senha" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="border rounded-lg p-3" />
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="border rounded-lg p-3">
            {ROLES.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
          <button className="sm:col-span-2 py-3 rounded-xl bg-gray-900 text-white font-bold">Criar usuário</button>
        </form>

        <section className="bg-white rounded-2xl border overflow-hidden">
          {users.map((user) => (
            <div key={user.id} className="border-t first:border-t-0 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="font-bold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-400">{user.username} · {user.active ? "ativo" : "inativo"}</p>
              </div>
              <select
                value={user.role}
                onChange={(event) => saveUser(user, { role: event.target.value })}
                className="border rounded-lg px-3 py-2"
              >
                {ROLES.map((role) => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
              <button
                onClick={() => saveUser(user, { active: !user.active })}
                className={`text-xs font-bold ${user.active ? "text-red-500" : "text-emerald-700"}`}
              >
                {user.active ? "Desativar" : "Ativar"}
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
