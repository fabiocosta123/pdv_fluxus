import React, { useState } from 'react';
import { MoneyInput } from './MoneyInput';
import { ArrowLeft } from 'lucide-react'; // Importamos o ícone de voltar

interface OpenCashierModalProps {
  isOpen: boolean;
  onOpen: (initialValue: number) => void;
  onCancel: () => void; // Adicionamos esta nova prop
}

export const OpenCashierModal: React.FC<OpenCashierModalProps> = ({ isOpen, onOpen, onCancel }) => {
  const [value, setValue] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-blue-900 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative">
        
        {/* Botão de Voltar/Fechar no topo */}
        <button 
          onClick={onCancel}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          title="Voltar ao menu"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔓</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Abertura de Caixa</h2>
          <p className="text-gray-500 text-sm">Informe o valor inicial (fundo de troco) para começar as vendas.</p>
        </div>

        <div className="mb-8">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1 text-center">Valor em Dinheiro</label>
          <MoneyInput 
            value={value}
            onChange={setValue}
            autoFocus
            onEnter={() => onOpen(value)} // Permite abrir o caixa dando Enter
            className="text-5xl font-black w-full border-b-4 border-blue-200 focus:border-blue-600 outline-none pb-2 text-center bg-transparent"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => onOpen(value)}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xl uppercase transition-all active:scale-95 shadow-lg shadow-blue-100"
          >
            Abrir Caixa agora
          </button>
          
          <button 
            onClick={onCancel}
            className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors text-sm uppercase"
          >
            Cancelar e sair
          </button>
        </div>
      </div>
    </div>
  );
};