import { MoneyInput } from "./MoneyInput";
import { useEffect } from "react";

interface PaymentModalProps {
  total: number;
  remaingBalance: number;
  change: number;
  payments: any[];
  paymentInputValue: number;
  customer: { name: string; document: string };
  setCustomer: (customer: { name: string; document: string }) => void;
  setPaymentInputValue: (val: number) => void;
  onClose: () => void;
  handleAddPayment: (method: string, amount: number) => void;
  onFinalize: () => void;
}

export const PaymentModal = ({
  total,
  remaingBalance,
  change,
  payments,
  paymentInputValue,
  setPaymentInputValue,
  onClose,
  handleAddPayment,
  onFinalize,
  customer,
  setCustomer
}: PaymentModalProps) => {
  useEffect(() => {
    const handleGlobalEnter = (e: KeyboardEvent) => {
      // Se apertar Enter e não houver mais saldo a pagar (ou houver troco)
      if (e.key === "Enter" && remaingBalance <= 0) {
        e.preventDefault();
        onFinalize();
      }
    };

    window.addEventListener("keydown", handleGlobalEnter);
    return () => window.removeEventListener("keydown", handleGlobalEnter);
  }, [remaingBalance, onFinalize]);
  return (
    <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 no-print">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabeçalho mais fino */}
        <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
          <h2 className="text-base font-black text-blue-800 uppercase tracking-tight">
            Finalizar Venda
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"> ✕ </button>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* COLUNA ESQUERDA */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline border-b pb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total:</span>
              <span className="text-2xl font-black text-blue-600">
                {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>

            {/* Input de Valor Menor */}
            <div className="bg-gray-50 p-2 rounded-lg border-2 border-blue-100">
              <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Valor a Lançar</p>
              <MoneyInput
                value={paymentInputValue}
                onChange={setPaymentInputValue}
                onEnter={() => handleAddPayment("DINHEIRO", paymentInputValue)}
                autoFocus
                className="text-3xl font-black text-gray-900 outline-none w-full bg-transparent"
              />
            </div>

            {/* Identificação Compacta */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Cliente / Conta Mensal</p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Nome do Cliente"
                  className="p-1.5 border rounded text-xs outline-none focus:border-blue-500"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="CPF (para localizar conta)"
                  className="p-1.5 border rounded text-xs outline-none focus:border-blue-500"
                  value={customer.document}
                  onChange={(e) => setCustomer({ ...customer, document: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="flex flex-col gap-3">
            <div className={`p-3 rounded-lg border flex justify-between items-center ${remaingBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
               <span className="text-[10px] font-bold uppercase text-gray-500">Falta:</span>
               <span className={`text-lg font-black ${remaingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                 {(remaingBalance / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
               </span>
            </div>

            {/* Histórico visível sem scroll */}
            <div className="flex-1 min-h-[100px] max-h-[120px] overflow-y-auto bg-white border rounded-lg p-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1 border-b pb-1">Pagamentos:</p>
              {payments.length === 0 && <p className="text-[10px] text-gray-300 italic">Nenhum lançamento...</p>}
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between text-[11px] font-mono py-0.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{p.method}</span>
                  <span className="font-bold">{(p.value / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Botões de Método Menores */}
            <div className="grid grid-cols-2 gap-1.5">
              {["DINHEIRO", "DÉBITO", "CRÉDITO", "PIX"].map((method, i) => (
                <button
                  key={method}
                  onClick={() => handleAddPayment(method, paymentInputValue)}
                  className="bg-gray-100 py-2 px-3 rounded-md font-bold text-[11px] border hover:bg-blue-50 flex justify-between items-center"
                >
                  <span>{method}</span>
                  <span className="text-[9px] opacity-40">F{i+1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Botão Finalizar */}
        <div className="p-4 bg-gray-50 border-t">
          <button
            disabled={remaingBalance > 0}
            onClick={onFinalize}
            className={`w-full py-4 rounded-xl font-black text-xl uppercase transition-all shadow-md ${
              remaingBalance > 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-500 active:scale-95"
            }`}
          >
            Confirmar Venda (ENTER)
          </button>
        </div>
      </div>
    </div>
  );
};
