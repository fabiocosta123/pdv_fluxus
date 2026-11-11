"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  DollarSign,
  Package,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/components/AccessGate";
import { canAccessPath } from "@/modules/auth/access";

const items = [
  {
    title: "Estoque",
    description: "Produtos, preços e fornecedor",
    icon: <Package className="w-8 h-8" />,
    color: "bg-orange-500",
    path: "/inventory",
  },
  {
    title: "Compras",
    description: "Lista sugerida de reposição",
    icon: <ClipboardList className="w-8 h-8" />,
    color: "bg-amber-600",
    path: "/purchases",
  },
  {
    title: "Financeiro",
    description: "Painel, contas a pagar e a receber",
    icon: <DollarSign className="w-8 h-8" />,
    color: "bg-emerald-600",
    path: "/finance",
  },
  {
    title: "Clientes",
    description: "Cadastro, crédito e histórico",
    icon: <Users className="w-8 h-8" />,
    color: "bg-indigo-500",
    path: "/management/customer",
  },
  {
    title: "Configurações",
    description: "Loja e impressão do cupom",
    icon: <Settings className="w-8 h-8" />,
    color: "bg-gray-600",
    path: "/settings",
  },
  {
    title: "Usuários",
    description: "Níveis de acesso",
    icon: <Shield className="w-8 h-8" />,
    color: "bg-slate-700",
    path: "/users",
  },
];

export default function ManagementPage() {
  const router = useRouter();
  const user = useAuth();
  const visible = user ? items.filter((item) => canAccessPath(user.role, item.path)) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="p-2 rounded-xl hover:bg-gray-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-800">Gestão</h1>
          <p className="text-xs text-gray-400">Estoque, compras, financeiro e cadastros</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              className="group flex flex-col p-8 rounded-[2rem] border-2 border-transparent bg-white text-left hover:border-blue-500 hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              <div className={`${item.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6`}>
                {item.icon}
              </div>
              <h2 className="text-xl font-black text-gray-800 mb-2 group-hover:text-blue-600">{item.title}</h2>
              <p className="text-sm text-gray-500">{item.description}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
