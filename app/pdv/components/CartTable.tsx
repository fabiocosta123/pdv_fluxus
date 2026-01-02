import { Trash2, AlertTriangle } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
}

export const CartTable = ({ cart, removeFromCart }: { cart: CartItem[], removeFromCart: (id: string) => void }) => {
  return (
    <div className="flex-1 overflow-auto p-2 lg:p-4 scrollbar-thin">
      <table className="w-full table-fixed">
        <thead>
          <tr className="text-[10px] text-gray-400 uppercase font-bold text-left border-b">
            <th className="w-16 py-2 px-2">Item</th>
            <th className="w-1/2 px-2">Descrição</th>
            <th className="w-20 text-center px-2">Qtd</th>
            <th className="w-32 text-right hidden sm:table-cell px-2">Unit.</th>
            <th className="w-32 text-right px-2">Total</th>
            <th className="w-12 text-center"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cart.map((item, index) => (
            <tr key={item.id} className="text-sm lg:text-lg font-bold hover:bg-gray-50 group">
              <td className="py-4 px-2 font-mono text-gray-400">
                {String(index + 1).padStart(3, "0")}
              </td>
              <td className="py-4 px-2 overflow-hidden">
                <div className="flex flex-col truncate">
                  <span className="uppercase text-blue-900 truncate">{item.name}</span>
                  {item.quantity > item.stock && (
                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} /> ESTOQUE: {item.stock}
                    </span>
                  )}
                </div>
              </td>
              <td className="text-center px-2 text-gray-700 font-mono">
                {item.quantity.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(item.quantity) ? 0 : 3 })}
              </td>
              <td className="text-right hidden sm:table-cell text-gray-500 font-mono">
                {(item.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
              <td className="text-right text-blue-700 font-mono pr-4">
                {(item.subtotal / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
              <td className="text-center w-10">
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};