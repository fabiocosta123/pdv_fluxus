import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <h1 className="text-4xl font-bold text-blue-900">Fluxus PDV</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/pdv" 
          className="bg-blue-600 hover:bg-blue-700 text-white p-8 rounded-2xl shadow-xl flex flex-col items-center transition-transform hover:scale-105"
        >
          <span className="text-5xl mb-2">🛒</span>
          <span className="font-bold text-xl">Abrir Frente de Caixa</span>
        </Link>
        
        <Link 
          href="/estoque" 
          className="bg-white hover:bg-gray-50 text-blue-900 p-8 rounded-2xl shadow-xl flex flex-col items-center border-2 border-blue-900 transition-transform hover:scale-105"
        >
          <span className="text-5xl mb-2">📦</span>
          <span className="font-bold text-xl">Gerenciar Estoque</span>
        </Link>
      </div>
    </div>
  );
}