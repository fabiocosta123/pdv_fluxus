import React from "react";
import { MoneyInput } from "./MoneyInput";

interface CashierModalProps {
  isOpen: boolean;
  type: 'SANGRIA' | 'APORTE' | 'FECHAMENTO'; // Tipagem específica
  onClose: () => void;
  onConfirm: (type: 'SANGRIA' | 'APORTE' | 'FECHAMENTO', value: number, obs: string) => void;
}

export const CashierModal = ({ type, isOpen, onClose, onConfirm }: CashierModalProps) => {
  const [value, setValue] = React.useState(0);
  const [obs, setObs] = React.useState("");
  

  if (!isOpen) return null;

  const titles = {
    SANGRIA: { label: "Sangria (Retirada)", color: "text-red-600", btn: "bg-red-600" },
    APORTE: { label: "Aporte (Entrada)", color: "text-green-600", btn: "bg-green-600" },
    FECHAMENTO: { label: "Fechamento de Caixa", color: "text-blue-600", btn: "bg-blue-600" }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
        <h2 className={`text-2xl font-black mb-6 ${titles[type].color}`}>
          {titles[type].label}
        </h2>
        
        <div className="space-y-6">
          <MoneyInput 
            value={value}
            onChange={setValue}
            autoFocus
            className="text-5xl font-black w-full border-b-4 border-gray-200 focus:border-blue-500 outline-none pb-2"
          />

          <textarea 
            placeholder="Observação (Ex: Pagamento Fornecedor)"
            className="w-full p-3 border rounded-lg resize-none outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            onChange={(e) => setObs(e.target.value)}
          />

          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 bg-gray-100 font-bold rounded-xl">Cancelar</button>
            <button 
              onClick={() => onConfirm(type, value, obs)}
              className={`flex-1 py-4 text-white font-bold rounded-xl ${titles[type].btn}`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};