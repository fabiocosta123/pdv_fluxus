import { Trash2, AlertTriangle } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
}

export const CartTable = ({
  cart,
  removeFromCart,
  activeId,
}: {
  cart: CartItem[];
  removeFromCart: (id: string) => void;
  activeId?: string | null;
}) => {
  const pinned =
    (activeId ? cart.find((item) => item.id === activeId) : undefined) ?? cart[cart.length - 1];
  const earlier = pinned ? cart.filter((item) => item.id !== pinned.id) : cart;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {pinned && (
        <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-2 lg:px-4">
          <table className="w-full table-fixed">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase text-gray-400">
                <th className="w-16 px-2 py-2">Item</th>
                <th className="w-1/2 px-2">Descrição</th>
                <th className="w-20 px-2 text-center">Qtd</th>
                <th className="hidden w-32 px-2 text-right sm:table-cell">Unit.</th>
                <th className="w-32 px-2 text-right">Total</th>
                <th className="w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              <CartRow
                item={pinned}
                index={cart.findIndex((line) => line.id === pinned.id)}
                pinned
                removeFromCart={removeFromCart}
              />
            </tbody>
          </table>
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto p-2 lg:p-4">
        {earlier.length > 0 && (
          <table className="w-full table-fixed">
            <tbody className="divide-y divide-gray-100">
              {earlier.map((item) => (
                <CartRow
                  key={item.id}
                  item={item}
                  index={cart.findIndex((line) => line.id === item.id)}
                  removeFromCart={removeFromCart}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

function CartRow({
  item,
  index,
  pinned = false,
  removeFromCart,
}: {
  item: CartItem;
  index: number;
  pinned?: boolean;
  removeFromCart: (id: string) => void;
}) {
  return (
    <tr className={`group text-sm font-bold lg:text-lg ${pinned ? "text-blue-950" : "hover:bg-gray-50"}`}>
      <td className="w-16 px-2 py-4 font-mono text-gray-400">{String(index + 1).padStart(3, "0")}</td>
      <td className="w-1/2 overflow-hidden px-2 py-4">
        <div className="flex flex-col truncate">
          <span className="truncate uppercase text-blue-900">{item.name}</span>
          {item.quantity > item.stock && (
            <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-red-500">
              <AlertTriangle size={12} /> ESTOQUE: {item.stock}
            </span>
          )}
        </div>
      </td>
      <td className="w-20 px-2 text-center font-mono text-gray-700">
        {item.quantity.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(item.quantity) ? 0 : 3 })}
      </td>
      <td className="hidden w-32 text-right font-mono text-gray-500 sm:table-cell">
        {(item.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </td>
      <td className="w-32 pr-4 text-right font-mono text-blue-700">
        {(item.subtotal / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </td>
      <td className="w-12 text-center">
        <button
          onClick={() => removeFromCart(item.id)}
          className={`p-2 text-gray-300 transition-colors hover:text-red-500 ${pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label={`Remover ${item.name}`}
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}
