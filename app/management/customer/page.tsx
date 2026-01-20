"use client";

import { useState } from 'react';
import { Customer } from "@/app/types/customer";
import { MoneyInput } from "@/app/components/MoneyInput"; // Certifique-se que o caminho está correto

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([
    { 
      id: '1', 
      name: 'João Silva', 
      document: '123.456.789-00', 
      creditLimit: 50000, 
      currentDebt: 15000, 
      status: 'ACTIVE' 
    },
    { 
      id: '2', 
      name: 'Maria Souza', 
      document: '987.654.321-11', 
      creditLimit: 100000, 
      currentDebt: 95000, 
      status: 'ACTIVE' 
    },
  ]);

  // Estados para o Modal de Pagamento
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  const formatBRL = (val: number) => 
    (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleOpenPayModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPayAmount(customer.currentDebt);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedCustomer) return;

    setCustomers(prev => prev.map(c => {
      if (c.id === selectedCustomer.id) {
        return { ...c, currentDebt: Math.max(0, c.currentDebt - payAmount) };
      }
      return c;
    }));

    alert(`Recebimento de ${formatBRL(payAmount)} confirmado para ${selectedCustomer.name}`);
    setIsPayModalOpen(false);
    setSelectedCustomer(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-blue-900 uppercase">Gestão de Crédito</h2>
              <p className="text-sm text-gray-500">Controle de limites e vendas em carteira (fiado)</p>
            </div>
            <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95">
              + NOVO CLIENTE
            </button>
          </div>

          {/* TABELA */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100 text-[10px] uppercase text-gray-400 font-black">
                  <th className="pb-3 px-2">Cliente</th>
                  <th className="pb-3">Documento</th>
                  <th className="pb-3 text-right">Limite Total</th>
                  <th className="pb-3 text-right">Dívida Atual</th>
                  <th className="pb-3 text-center w-48">Uso do Limite</th>
                  <th className="pb-3 text-right px-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => {
                  const usagePercent = Math.min((c.currentDebt / c.creditLimit) * 100, 100);
                  const isCritical = usagePercent > 80;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-4 px-2 font-bold text-gray-700">{c.name}</td>
                      <td className="py-4 text-xs font-mono text-gray-500">{c.document}</td>
                      <td className="py-4 text-right font-bold text-gray-600">{formatBRL(c.creditLimit)}</td>
                      <td className={`py-4 text-right font-black ${c.currentDebt > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {formatBRL(c.currentDebt)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200">
                            <div 
                              className={`h-full transition-all duration-500 ${isCritical ? 'bg-red-500' : 'bg-blue-500'}`} 
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-gray-400">{usagePercent.toFixed(0)}% Utilizado</span>
                        </div>
                      </td>
                      <td className="py-4 text-right px-2">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold uppercase">
                            Editar
                          </button>
                          <button 
                            onClick={() => handleOpenPayModal(c)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-xs font-bold uppercase"
                          >
                            Baixar Débito
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE RECEBIMENTO (FORA DA TABELA) */}
      {isPayModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 bg-blue-900 text-white">
              <p className="text-[10px] font-black uppercase opacity-70">Receber Pagamento</p>
              <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Dívida Atual</p>
                  <p className="text-xl font-black text-red-500">{formatBRL(selectedCustomer.currentDebt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Novo Saldo</p>
                  <p className="text-xl font-black text-blue-600">
                    {formatBRL(Math.max(0, selectedCustomer.currentDebt - payAmount))}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Valor Pago pelo Cliente</label>
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                   <MoneyInput
                    value={payAmount}
                    onChange={setPayAmount}
                    autoFocus
                    className="text-4xl font-black text-blue-900 bg-transparent outline-none w-full"
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsPayModalOpen(false);
                    setSelectedCustomer(null);
                  }}
                  className="py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleConfirmPayment}
                  className="py-3 bg-green-600 text-white rounded-xl font-black hover:bg-green-500 transition-all shadow-lg shadow-green-200 active:scale-95"
                >
                  CONFIRMAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}