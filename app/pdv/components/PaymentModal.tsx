import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MoneyInput } from "../../components/MoneyInput";
import { formatDocument, onlyDigits } from "@/modules/customers/document";
import type { CustomerRecord } from "@/modules/customers/types";

interface PaymentModalProps {
  total: number;
  remaingBalance: number;
  change: number;
  payments: { method: string; value: number }[];
  paymentInputValue: number;
  customer: CustomerRecord | null;
  setCustomer: (customer: CustomerRecord | null) => void;
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
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CustomerRecord[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lookupTerm, setLookupTerm] = useState("");
  const [pix, setPix] = useState<{
    id: string;
    payload: string;
    qrCode: string;
    expiresAt: string | null;
    amount: number;
    sandbox: boolean;
  } | null>(null);
  const [creatingPix, setCreatingPix] = useState(false);
  const settledPix = useRef<string | null>(null);
  const walletUsed = payments
    .filter((payment) => payment.method === "CARTEIRA")
    .reduce((sum, payment) => sum + payment.value, 0);
  const availableNow =
    customer?.availableCredit == null ? null : customer.availableCredit - walletUsed;

  useEffect(() => {
    const query = term.trim();
    if (!query) {
      setResults([]);
      setLookupTerm("");
      return;
    }
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      setResults(await response.json());
      setLookupTerm(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [term]);

  function customerLabel(item: CustomerRecord) {
    const document = onlyDigits(item.document);
    return document ? `${item.name} - ${document}` : item.name;
  }

  function chooseCustomer(item: CustomerRecord) {
    setCustomer(item);
    setTerm("");
    setResults([]);
    setLookupTerm("");
    setHighlightedIndex(-1);
  }

  function addWallet() {
    if (!customer) {
      toast.error("Selecione um cliente cadastrado");
      return;
    }
    if (availableNow == null) {
      toast.error("Cliente sem limite de crédito");
      return;
    }
    const amount = Math.min(paymentInputValue, remaingBalance);
    if (amount <= 0) return;
    if (amount > availableNow) {
      toast.error("Limite disponível insuficiente");
      return;
    }
    if (paymentInputValue > remaingBalance) {
      toast.info("Carteira não gera troco. Lancei só o saldo da venda.");
    }
    handleAddPayment("CARTEIRA", amount);
  }

  function settlePix(chargeId: string, amount: number) {
    if (settledPix.current === chargeId) return;
    settledPix.current = chargeId;
    handleAddPayment("PIX", amount);
    setPix(null);
    toast.success("PIX recebido");
  }

  async function startPix() {
    if (creatingPix || pix) return;
    const requested = paymentInputValue > 0 ? paymentInputValue : remaingBalance;
    const amount = Math.min(requested, remaingBalance);
    if (amount <= 0) {
      toast.error("Informe o valor do PIX");
      return;
    }
    if (requested > remaingBalance) {
      toast.info("PIX não gera troco. O QR Code sai no saldo da venda.");
    }

    setCreatingPix(true);
    const response = await fetch("/api/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        customerName: customer?.name,
        document: customer?.document,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setCreatingPix(false);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível gerar o PIX");
      return;
    }
    settledPix.current = null;
    setPix(data);
  }

  async function simulatePix() {
    if (!pix) return;
    const response = await fetch(`/api/pix/${pix.id}/simulate`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível simular o pagamento");
      return;
    }
    settlePix(pix.id, pix.amount);
  }

  useEffect(() => {
    if (!pix) return;
    let active = true;
    const tick = async () => {
      const response = await fetch(`/api/pix/${pix.id}`);
      const data = await response.json().catch(() => ({}));
      if (!active || !response.ok || !data.paid) return;
      settlePix(pix.id, pix.amount);
    };
    const timer = setInterval(() => {
      void tick();
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pix]);

  useEffect(() => {
    if (!pix) return;
    const onKey = (event: KeyboardEvent) => {
      if (!["Escape", "F1", "F2", "F3", "F4"].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") setPix(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pix]);
  
  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F4") {
        e.preventDefault();
        void startPix();
      }
      if (e.key === "F6") {
        e.preventDefault();
        addWallet();
      }
      if (e.key === "Enter" && remaingBalance <= 0) {
        e.preventDefault();
        onFinalize();
      }
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [remaingBalance, onFinalize, onClose, addWallet, startPix]);

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
              <p className="text-[10px] font-bold text-gray-400 uppercase">Cliente cadastrado</p>
              {customer ? (
                <div className="flex justify-between gap-2 items-start">
                  <div>
                    <p className="font-bold text-sm">{customer.name}</p>
                    <p className="text-xs font-mono text-gray-500">{formatDocument(customer.document)}</p>
                    <p className="text-xs text-blue-700 font-bold">
                      Disponível: {availableNow == null ? "sem limite" : formatCurrency(availableNow)}
                    </p>
                  </div>
                  <button type="button" onClick={() => setCustomer(null)} className="text-xs font-bold text-red-500">
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Nome, CPF ou CNPJ"
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={term}
                    onChange={(event) => {
                      setTerm(event.target.value);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={(event) => {
                      if (results.length === 0) return;
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setHighlightedIndex((current) => (current + 1) % results.length);
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setHighlightedIndex((current) =>
                          current <= 0 ? results.length - 1 : current - 1,
                        );
                      } else if (event.key === "Enter") {
                        event.preventDefault();
                        if (results.length === 1) chooseCustomer(results[0]);
                        else if (highlightedIndex >= 0 && results[highlightedIndex]) {
                          chooseCustomer(results[highlightedIndex]);
                        } else {
                          toast.error("Há mais de um cliente. Escolha pelo CPF ou CNPJ.");
                        }
                      }
                    }}
                  />
                  {results.length > 0 && (
                    <ul className="bg-white border rounded-lg max-h-48 overflow-y-auto">
                      {results.map((item, index) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm font-bold ${
                              index === highlightedIndex ? "bg-blue-50" : "hover:bg-blue-50"
                            }`}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              chooseCustomer(item);
                            }}
                          >
                            {customerLabel(item)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {term.trim().length > 0 && lookupTerm === term.trim() && results.length === 0 && (
                    <p className="text-xs text-gray-400">Nenhum cliente encontrado.</p>
                  )}
                </>
              )}
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
              <button
                type="button"
                onClick={addWallet}
                className="col-span-2 bg-indigo-600 text-white py-2.5 px-3 rounded-lg font-bold text-xs flex justify-between items-center"
              >
                <span>CARTEIRA</span>
                <span className="bg-indigo-500 text-white px-1.5 py-0.5 rounded text-[9px]">F6</span>
              </button>
              {["DINHEIRO", "DÉBITO", "CRÉDITO", "PIX"].map((method, i) => (
                <button
                  key={method}
                  onClick={() => {
                    if (method === "PIX") void startPix();
                    else handleAddPayment(method, paymentInputValue);
                  }}
                  disabled={method === "PIX" && creatingPix}
                  className="bg-white py-2.5 px-3 rounded-lg font-bold text-xs border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all flex justify-between items-center group"
                >
                  <span className="group-hover:text-blue-700">{method}</span>
                  <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px]">F{i+1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {pix && (
          <div className="mx-5 mb-4 p-4 border-2 border-blue-200 rounded-2xl bg-blue-50 text-center space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase text-blue-600">Aguardando PIX</p>
              <p className="text-2xl font-black text-blue-900">{formatCurrency(pix.amount)}</p>
              {pix.expiresAt && (
                <p className="text-xs text-gray-500">
                  Válido até {new Date(pix.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <img src={pix.qrCode} alt="QR Code PIX" className="mx-auto w-56 h-56 bg-white p-2 rounded-xl" />
            <p className="text-[10px] text-gray-500 break-all">{pix.payload}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(pix.payload);
                  toast.success("Código PIX copiado");
                }}
                className="flex-1 py-2 rounded-xl bg-white border font-bold text-sm"
              >
                Copiar código
              </button>
              {pix.sandbox && (
                <button type="button" onClick={() => void simulatePix()} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">
                  Simular pagamento
                </button>
              )}
              <button type="button" onClick={() => setPix(null)} className="flex-1 py-2 rounded-xl bg-gray-100 font-bold text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}

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