"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, 
  BarChart3, 
  Package, 
  Users, 
  Settings, 
  DollarSign,
  TrendingUp,
  LayoutDashboard
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const menuItems = [
    {
      title: "Frente de Caixa",
      description: "Vendas, abertura e fechamento",
      icon: <ShoppingCart className="w-8 h-8" />,
      color: "bg-blue-600",
      path: "/pdv",
      status: "active"
    },
    {
      title: "Relatórios",
      description: "Histórico de fechamentos",
      icon: <BarChart3 className="w-8 h-8" />,
      color: "bg-purple-600",
      path: "/report/cashier",
      status: "active"
    },
    {
      title: "Estoque",
      description: "Gestão de produtos e preços",
      icon: <Package className="w-8 h-8" />,
      color: "bg-orange-500",
      path: "/inventory",
      status: "active"
    },
    {
      title: "Financeiro",
      description: "Controle de fluxo e despesas",
      icon: <DollarSign className="w-8 h-8" />,
      color: "bg-emerald-600",
      path: "#",
      status: "soon"
    },
    {
      title: "Clientes",
      description: "Cadastro e fidelização",
      icon: <Users className="w-8 h-8" />,
      color: "bg-indigo-500",
      path: "#",
      status: "soon"
    },
    {
      title: "Configurações",
      description: "Ajustes do sistema",
      icon: <Settings className="w-8 h-8" />,
      color: "bg-gray-600",
      path: "#",
      status: "soon"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar Superior */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-blue-200 shadow-lg">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
            Fluxus <span className="text-blue-600 font-extrabold">PDV</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
            <p className="text-sm font-black text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> ONLINE
            </p>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full">
        {/* Banner de Status Opcional */}
        <div className="mb-10 bg-gradient-to-br from-blue-700 to-blue-500 rounded-[2rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden transition-all">
          <TrendingUp className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-3xl lg:text-4xl font-black mb-3">Painel Administrativo</h2>
            <p className="text-blue-100 text-lg max-w-md font-medium">
              Bem-vindo de volta! Selecione um módulo abaixo para começar a operar.
            </p>
          </div>
        </div>

        {/* Grid de Cards Interativos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {menuItems.map((item, index) => (
            <button
              key={index}
              disabled={item.status === "soon"}
              onClick={() => router.push(item.path)}
              className={`group relative flex flex-col p-8 rounded-[2rem] transition-all duration-300 border-2 text-left ${
                item.status === "soon" 
                ? "bg-gray-50 border-gray-100 opacity-60 grayscale cursor-not-allowed" 
                : "bg-white border-transparent hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2"
              }`}
            >
              <div className={`${item.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                {item.icon}
              </div>
              
              <h3 className="text-xl font-black text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {item.description}
              </p>

              {item.status === "soon" && (
                <span className="absolute top-6 right-6 bg-gray-200 text-gray-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                  Em Breve
                </span>
              )}
            </button>
          ))}
        </div>
      </main>

      <footer className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
        Fluxus System &copy; 2026 • Tecnologia para Varejo
      </footer>
    </div>
  );
}