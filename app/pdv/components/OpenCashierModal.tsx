import React, { useState } from 'react';
import { MoneyInput } from './MoneyInput';

interface OpenCashierModalProps {
  isOpen: boolean;
  onOpen: (initialValue: number) => void;
}

export const OpenCashierModal: React.FC<OpenCashierModalProps> = ({ isOpen, onOpen }) => {
  const [value, setValue] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-blue-900 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔓</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 uppercase">Abertura de Caixa</h2>
          <p className="text-gray-500 text-sm">Informe o valor inicial (fundo de troco) para começar as vendas.</p>
        </div>

        <div className="mb-8">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Valor em Dinheiro</label>
          <MoneyInput 
            value={value}
            onChange={setValue}
            autoFocus
            className="text-5xl font-black w-full border-b-4 border-blue-200 focus:border-blue-600 outline-none pb-2 text-center"
          />
        </div>

        <button 
          onClick={() => onOpen(value)}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xl uppercase transition-all active:scale-95"
        >
          Abrir Caixa agora
        </button>
      </div>
    </div>
  );
};