// components/Receipt.tsx
interface ReceiptProps {
  lastSale: {
    id: string;
    total: number;
    cart: any[];
    payments: any[];
    createdAt: string;
    change?: number;
    customer?: {
      name: string;
      document: string;
    };
  } | null;
}

export const Receipt = ({ lastSale }: ReceiptProps) => {
  if (!lastSale) return null;

  return (
    <div className="print-area font-mono text-[12px] leading-tight text-black p-2 w-[72mm]">
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h2 className="text-sm font-bold uppercase">Nome da Sua Empresa</h2>
        <p className="text-[10px]">Rua das Vendas, 100 - Centro</p>
        <p className="text-[10px]">CNPJ: 00.000.000/0001-00</p>
      </div>

      <div className="mb-2 text-[10px]">
        <p>DATA: {new Date(lastSale.createdAt).toLocaleString("pt-BR")}</p>
        <p>PEDIDO: #{lastSale.id.toString().slice(-6).toUpperCase()}</p>
      </div>

      {/* Dentro do Receipt.tsx */}
      {lastSale.customer?.name || lastSale.customer?.document ? (
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px]">
          <p className="font-bold">CLIENTE:</p>
          {lastSale.customer.name && (
            <p>NOME: {lastSale.customer.name.toUpperCase()}</p>
          )}
          {lastSale.customer.document && (
            <p>CPF/CNPJ: {lastSale.customer.document}</p>
          )}
        </div>
      ) : null}

      <table className="w-full mb-2">
        <thead>
          <tr className="border-b border-black text-left text-[10px]">
            <th className="pb-1">DESC</th>
            <th className="pb-1 text-center">QTD</th>
            <th className="pb-1 text-right">VALOR</th>
          </tr>
        </thead>
        <tbody className="text-[10px]">
          {lastSale.cart.map((item: any, i: number) => (
            <tr key={i}>
              <td className="py-1">{item.name.substring(0, 18)}</td>
              <td className="py-1 text-center">{item.quantity.toFixed(2)}</td>
              <td className="py-1 text-right">
                {(item.subtotal / 100).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black pt-1 space-y-1">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>
            {(lastSale.total / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        {lastSale.payments.map((p: any, i: number) => (
          <div key={i} className="flex justify-between text-[10px]">
            <span>{p.method}:</span>
            <span>{(p.value / 100).toFixed(2)}</span>
          </div>
        ))}

        {lastSale.change && lastSale.change > 0 && (
          <div className="flex justify-between text-[10px] italic">
            <span>TROCO:</span>
            <span>{(lastSale.change / 100).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-[10px] border-t border-dashed border-black pt-2 uppercase">
        <p>Cupom Não Fiscal</p>
        <p>Obrigado pela preferência!</p>
      </div>
    </div>
  );
};
