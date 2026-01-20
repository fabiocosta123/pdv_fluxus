import { MoneyInput } from "../../components/MoneyInput";
import { useEffect, useCallback } from "react";

interface PaymentModalProps {
  total: number;
  remaingBalance: number;
  change: number;
  payments: { method: string; value: number }[];
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
  setCustomer,
}: PaymentModalProps) => {
  
  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && remaingBalance <= 0) {
        e.preventDefault();
        onFinalize();
      }
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [remaingBalance, onFinalize, onClose]);

  const formatCurrency = (value: number) =>
    (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 no-print text-gray-800">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="text-lg font-black text-blue-900 uppercase tracking-tight">
            Finalizar Venda
          </h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
          > ✕ </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Coluna Esquerda: Inputs */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline border-b pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Total da Venda:</span>
              <span className="text-3xl font-black text-blue-600">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border-2 border-blue-200">
              <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Valor a Receber</p>
              <MoneyInput
                value={paymentInputValue}
                onChange={setPaymentInputValue}
                onEnter={() => handleAddPayment("DINHEIRO", paymentInputValue)}
                autoFocus
                className="text-4xl font-black text-gray-900 outline-none w-full bg-transparent"
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Identificação do Cliente</p>
              <input
                type="text"
                placeholder="Nome do Cliente"
                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="CPF/CNPJ"
                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={customer.document}
                onChange={(e) => setCustomer({ ...customer, document: e.target.value })}
              />
            </div>
          </div>

          {/* Coluna Direita: Status e Métodos */}
          <div className="flex flex-col gap-4">
            <div className={`p-4 rounded-xl border-2 flex justify-between items-center transition-colors ${
              remaingBalance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
            }`}>
               <span className="text-xs font-bold uppercase text-gray-500">Saldo Restante:</span>
               <span className={`text-2xl font-black ${remaingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                 {formatCurrency(remaingBalance)}
               </span>
            </div>

            <div className="flex-1 min-h-[120px] bg-white border rounded-xl p-3 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 border-b pb-1">Pagamentos Lançados</p>
              <div className="space-y-1 overflow-y-auto max-h-[100px]">
                {payments.length === 0 ? (
                  <p className="text-xs text-gray-300 italic py-2">Aguardando lançamento...</p>
                ) : (
                  payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs font-mono py-1 border-b border-gray-50 last:border-0">
                      <span className="font-bold text-gray-700">{p.method}</span>
                      <span className="font-black text-blue-700">{formatCurrency(p.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {["DINHEIRO", "DÉBITO", "CRÉDITO", "PIX"].map((method, i) => (
                <button
                  key={method}
                  onClick={() => handleAddPayment(method, paymentInputValue)}
                  className="bg-white py-2.5 px-3 rounded-lg font-bold text-xs border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all flex justify-between items-center group"
                >
                  <span className="group-hover:text-blue-700">{method}</span>
                  <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px]">F{i+1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bloco de Troco Dinâmico */}
        {change > 0 && (
          <div className="mx-5 mb-5 p-4 bg-green-50 border-2 border-green-500 rounded-2xl flex justify-between items-center animate-bounce shadow-lg">
            <div>
              <p className="text-[10px] font-black text-green-600 uppercase">Troco a devolver</p>
              <p className="text-4xl font-black text-green-700 leading-none">
                {formatCurrency(change)}
              </p>
            </div>
            <div className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm">
              Devolver Dinheiro
            </div>
          </div>
        )}

        {/* Rodapé: Ação Final */}
        <div className="p-5 bg-gray-50 border-t mt-auto">
          <button
            disabled={remaingBalance > 0}
            onClick={onFinalize}
            className={`w-full py-5 rounded-2xl font-black text-2xl uppercase transition-all shadow-xl hover:scale-[1.01] active:scale-95 ${
              remaingBalance > 0 
                ? "bg-gray-200 text-gray-400 cursor-not-allowed border-b-4 border-gray-300" 
                : "bg-green-600 text-white border-b-4 border-green-800 hover:bg-green-500"
            }`}
          >
            {remaingBalance > 0 ? "Aguardando Pagamento" : "Confirmar e Imprimir (ENTER)"}
          </button>
        </div>
      </div>
    </div>
  );
};