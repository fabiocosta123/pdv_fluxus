import { MoneyInput } from "./MoneyInput";

interface PaymentModalProps {
  total: number;
  remaingBalance: number;
  change: number;
  payments: any[];
  paymentInputValue: number;
  setPaymentInputValue: (val: number) => void;
  onClose: () => void;
  handleAddPayment: (method: string, amount: number) => void;
  onFinalize: () => void;
}

export const PaymentModal = ({
  total, remaingBalance, change, payments, paymentInputValue,
  setPaymentInputValue, onClose, handleAddPayment, onFinalize
}: PaymentModalProps) => {
  return (
    <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-sm flex items-end lg:items-center justify-center z-[100] p-0 lg:p-4">
      <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Cabeçalho */}
        <div className="p-4 lg:p-6 bg-gray-100 border-b flex justify-between items-center rounded-t-3xl">
          <h2 className="text-lg lg:text-2xl font-black text-blue-800 uppercase">Pagamento</h2>
          <button onClick={onClose} className="bg-gray-300 p-2 rounded-full hover:bg-red-100">✕</button>
        </div>

        <div className="p-4 lg:p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          <div className="space-y-4">
            <div className="text-center lg:text-left">
              <p className="text-gray-500 uppercase font-bold text-[10px]">Total Geral</p>
              <p className="text-4xl lg:text-5xl font-black text-blue-600">
                {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>

            <div className="bg-white p-3 lg:p-4 rounded-xl border-2 border-dashed border-gray-300">
              <p className="text-gray-600 uppercase font-bold text-[10px] mb-1 text-center lg:text-left">Valor a Lançar</p>
              <MoneyInput 
                value={paymentInputValue}
                onChange={setPaymentInputValue}
                onEnter={() => handleAddPayment("DINHEIRO", paymentInputValue)}
                autoFocus
                className="text-4xl lg:text-5xl font-black text-gray-900 outline-none w-full bg-transparent text-center lg:text-left"
              />
            </div>

            <div className="flex justify-between lg:justify-start lg:gap-6">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold">Falta Pagar</p>
                <p className={`text-xl font-black ${remaingBalance > 0 ? "text-red-600" : "text-green-500"}`}>
                  {(remaingBalance / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              {change > 0 && (
                <div className="text-right">
                  <p className="text-blue-600 text-[10px] uppercase font-bold">Troco</p>
                  <p className="text-xl font-black text-blue-600">
                    {(change / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {["DINHEIRO", "DÉBITO", "CRÉDITO", "PIX"].map((method, i) => (
              <button
                key={method}
                onClick={() => handleAddPayment(method, paymentInputValue)}
                className="bg-gray-100 p-4 rounded-xl font-bold border hover:bg-blue-50 flex justify-between items-center"
              >
                <span>{method}</span>
                <span className="text-xs bg-gray-200 px-2 rounded">F{i+1}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 lg:p-8 border-t">
          <button
            disabled={remaingBalance > 0}
            onClick={onFinalize}
            className={`w-full py-4 lg:py-6 rounded-xl font-black text-lg lg:text-2xl uppercase ${
              remaingBalance > 0 ? "bg-gray-200 text-gray-400" : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {remaingBalance > 0 ? "Aguardando Pagamento" : "Confirmar Venda"}
          </button>
        </div>
      </div>
    </div>
  );
};