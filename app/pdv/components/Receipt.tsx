export const Receipt = ({ lastSale }: { lastSale: any }) => {
  if (!lastSale) return null;

  return (
    <div id="receipt-print" className="hidden print:block font-mono text-[12px] leading-tight w-full">
      <div className="text-center mb-2 uppercase border-b border-black pb-2">
        <h2 className="font-bold text-[14px]">Fluxus</h2>
        <p>CNPJ: 00.000.000/0001-00</p>
        <p className="font-bold mt-1 text-[10px]">CUPOM NÃO FISCAL</p>
      </div>

      <div className="mb-2">
        <p>DATA: {new Date(lastSale.date).toLocaleString("pt-BR")}</p>
        <p>VENDA: #{String(lastSale.id).padStart(6, "0")}</p>
      </div>

      <table className="w-full mb-2 border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="w-[60%]">DESCRIÇÃO</th>
            <th className="text-right">QTDxUN</th>
            <th className="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {lastSale.cart.map((item: any, index: number) => (
            <tr key={index} className="border-b border-dotted border-black/20">
              <td className="py-1 uppercase">{item.name.substring(0, 18)}</td>
              <td className="text-right">{item.quantity}x{(item.price / 100).toFixed(2)}</td>
              <td className="text-right font-bold">{(item.subtotal / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black pt-1 space-y-1">
        <div className="flex justify-between font-bold text-[14px]">
          <span>TOTAL:</span>
          <span>{(lastSale.total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
        {lastSale.payments.map((p: any, i: number) => (
          <div key={i} className="flex justify-between text-[11px]">
            <span>{p.method}:</span>
            <span>{(p.value / 100).toFixed(2)}</span>
          </div>
        ))}
        {lastSale.change > 0 && (
          <div className="flex justify-between font-bold border-t border-dotted border-black pt-1">
            <span>TROCO:</span>
            <span>{(lastSale.change / 100).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="text-center mt-4 uppercase text-[10px]">
        <p>Obrigado pela preferência!</p>
        <p>Volte Sempre</p>
      </div>
    </div>
  );
};