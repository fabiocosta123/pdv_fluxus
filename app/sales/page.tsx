"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ReceiptPageStyle, SaleReceipt } from "@/app/components/SaleReceipt";
import { money } from "@/app/finance/format";
import { STORE_DEFAULTS } from "@/modules/settings/defaults";
import type { StoreSettings } from "@/modules/settings/types";

type HistoryItem = {
  name: string;
  quantity: number;
  priceAtSale: number;
  subtotal: number;
};

type Champion = {
  name: string;
  quantity: number;
  margin: number;
  profit: number;
};

type HistorySale = {
  id: string;
  status: "COMPLETED" | "CANCELED";
  total: number;
  createdAt: string;
  customerName: string | null;
  editable: boolean;
  items: HistoryItem[];
  payments: { method: string; value: number }[];
};

type SaleDetail = {
  id: string;
  status: "COMPLETED" | "CANCELED";
  total: number;
  totalPaid: number;
  change: number;
  createdAt: string;
  customer: { name: string; document: string } | null;
  items: {
    productId: string;
    name: string;
    quantity: number;
    priceAtSale: number;
    subtotal: number;
  }[];
  payments: { method: string; value: number }[];
};

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  barCode: string | null;
  isActive: boolean;
};

type EditLine = {
  productId: string;
  name: string;
  quantity: string;
  priceAtSale: number;
};

function storeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function when(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseQty(value: string) {
  const quantity = Number(value.replace(",", "."));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function qtyLabel(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 3,
    maximumFractionDigits: 3,
  });
}

function marginLabel(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function SalesPage() {
  const router = useRouter();
  const today = storeToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");
  const [sales, setSales] = useState<HistorySale[]>([]);
  const [champions, setChampions] = useState<{
    day: Champion | null;
    week: Champion | null;
    month: Champion | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreSettings>(STORE_DEFAULTS);
  const [receipt, setReceipt] = useState<SaleDetail | null>(null);
  const [voiding, setVoiding] = useState<HistorySale | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SaleDetail | null>(null);
  const [keptPrices, setKeptPrices] = useState<Record<string, number>>({});
  const [lines, setLines] = useState<EditLine[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (range: { from: string; to: string; fromTime: string; toTime: string }) => {
    setLoading(true);
    const params = new URLSearchParams(range);
    const response = await fetch(`/api/sales/history?${params}`);
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível carregar as vendas");
      return;
    }
    setSales(data.sales ?? []);
  }, []);

  useEffect(() => {
    void load({ from, to, fromTime, toTime });
    fetch("/api/sales/champions")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setChampions(data);
      })
      .catch(() => undefined);
    fetch("/api/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((settings) => {
        if (settings) setStore(settings);
      })
      .catch(() => undefined);
    // A lista abre no dia de hoje; os filtros seguintes partem do botão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];
    return products
      .filter(
        (product) =>
          product.isActive &&
          (product.name.toLowerCase().includes(term) ||
            (product.barCode ?? "").toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [products, search]);

  const editedTotal = lines.reduce((sum, line) => {
    const quantity = parseQty(line.quantity);
    return sum + (quantity ? Math.round(line.priceAtSale * quantity) : 0);
  }, 0);

  async function reprint(id: string) {
    const response = await fetch(`/api/sales/${id}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Não foi possível abrir a venda");
      return;
    }
    setReceipt(data);
    setTimeout(() => window.print(), 300);
  }

  async function openEdit(sale: HistorySale) {
    const [saleResponse, productResponse] = await Promise.all([
      fetch(`/api/sales/${sale.id}`),
      products.length ? Promise.resolve(null) : fetch("/api/products"),
    ]);
    const data = await saleResponse.json().catch(() => ({}));
    if (!saleResponse.ok) {
      toast.error(data.error || "Não foi possível abrir a venda");
      return;
    }
    if (productResponse) {
      const catalog = await productResponse.json().catch(() => []);
      if (productResponse.ok && Array.isArray(catalog)) setProducts(catalog);
    }
    setEditing(data);
    setKeptPrices(
      Object.fromEntries(
        data.items.map((item: SaleDetail["items"][number]) => [item.productId, item.priceAtSale]),
      ),
    );
    setLines(
      data.items.map((item: SaleDetail["items"][number]) => ({
        productId: item.productId,
        name: item.name,
        quantity: String(item.quantity),
        priceAtSale: item.priceAtSale,
      })),
    );
    setSearch("");
  }

  function addProduct(product: CatalogProduct) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        const quantity = parseQty(existing.quantity) ?? 0;
        return current.map((line) =>
          line.productId === product.id ? { ...line, quantity: String(quantity + 1) } : line,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          quantity: "1",
          priceAtSale: keptPrices[product.id] ?? product.price,
        },
      ];
    });
    setSearch("");
  }

  async function saveEdit() {
    if (!editing || saving) return;
    const items = lines.map((line) => ({ productId: line.productId, quantity: parseQty(line.quantity) }));
    if (items.some((item) => item.quantity == null)) {
      toast.error("Informe uma quantidade maior que zero");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/sales/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível salvar a venda");
      return;
    }
    toast.success("Venda atualizada. O troco foi recalculado.");
    setEditing(null);
    void load({ from, to, fromTime, toTime });
  }

  async function confirmVoid() {
    if (!voiding || voidingId) return;
    setVoidingId(voiding.id);
    const response = await fetch(`/api/sales/${voiding.id}/cancel`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setVoidingId(null);
    if (!response.ok) {
      toast.error(data.error || "Não foi possível estornar a venda");
      return;
    }
    toast.success("Venda estornada. O estoque voltou e o caixa deixou de contar essa venda.");
    setVoiding(null);
    void load({ from, to, fromTime, toTime });
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="p-2 rounded-xl hover:bg-gray-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-800">Vendas</h1>
          <p className="text-xs text-gray-400">
            Por padrão, as vendas de hoje. Estorno e edição só enquanto o caixa da venda estiver aberto.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <section className="grid md:grid-cols-3 gap-3">
          {(
            [
              ["Hoje", champions?.day],
              ["Esta semana", champions?.week],
              ["Este mês", champions?.month],
            ] as const
          ).map(([label, champion]) => (
            <article key={label} className="bg-white rounded-2xl border p-4">
              <p className="text-[10px] font-black uppercase text-sky-700">Campeão · {label}</p>
              {champions === null ? (
                <p className="mt-2 text-sm text-gray-400">Carregando...</p>
              ) : champion ? (
                <>
                  <p className="mt-1 font-black text-gray-800 uppercase truncate">{champion.name}</p>
                  <p className="text-sm text-gray-600">
                    {qtyLabel(champion.quantity)} vendidos · margem {marginLabel(champion.margin)}
                  </p>
                  <p className="text-xs text-gray-400">Lucro {money(champion.profit)}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-400">Nenhuma venda concluída.</p>
              )}
            </article>
          ))}
        </section>
        <p className="text-xs text-gray-400">
          O campeão é o produto com maior quantidade. A margem usa o preço da venda e o custo cadastrado agora.
        </p>

        <form
          className="bg-white rounded-2xl border p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void load({ from, to, fromTime, toTime });
          }}
        >
          <label className="text-[10px] font-black uppercase text-gray-400">
            De
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-bold text-gray-800"
            />
          </label>
          <label className="text-[10px] font-black uppercase text-gray-400">
            Até
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-bold text-gray-800"
            />
          </label>
          <label className="text-[10px] font-black uppercase text-gray-400">
            Horário
            <input
              type="time"
              value={fromTime}
              onChange={(event) => setFromTime(event.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-bold text-gray-800"
            />
          </label>
          <label className="text-[10px] font-black uppercase text-gray-400">
            Até
            <input
              type="time"
              value={toTime}
              onChange={(event) => setToTime(event.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-bold text-gray-800"
            />
          </label>
          <button
            type="submit"
            className="bg-sky-700 text-white font-black uppercase text-xs rounded-lg px-4 py-2.5"
          >
            Filtrar
          </button>
        </form>

        {loading && <p className="text-sm text-gray-400 text-center py-8">Carregando vendas...</p>}

        {!loading && sales.length === 0 && (
          <p className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
            Nenhuma venda nesse período.
          </p>
        )}

        {!loading &&
          sales.map((sale) => (
            <article
              key={sale.id}
              className={`bg-white rounded-2xl border p-4 ${sale.status === "CANCELED" ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-gray-800">{money(sale.total)}</p>
                  <p className="text-[10px] text-gray-400">
                    {when(sale.createdAt)}
                    {sale.customerName ? ` · ${sale.customerName}` : ""}
                  </p>
                </div>
                {sale.status === "CANCELED" && (
                  <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    Estornada
                  </span>
                )}
              </div>
              <table className="w-full table-fixed mt-3">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase font-bold text-left border-b">
                    <th className="w-14 py-2 px-2">Item</th>
                    <th className="px-2">Descrição</th>
                    <th className="w-16 text-center px-2">Qtd</th>
                    <th className="w-24 text-right hidden sm:table-cell px-2">Unit.</th>
                    <th className="w-28 text-right px-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sale.items.map((item, index) => (
                    <tr key={`${sale.id}-${index}`} className="text-sm font-bold">
                      <td className="py-3 px-2 font-mono text-gray-400">
                        {String(index + 1).padStart(3, "0")}
                      </td>
                      <td className="py-3 px-2 overflow-hidden">
                        <span className="block truncate uppercase text-blue-900">{item.name}</span>
                      </td>
                      <td className="text-center px-2 font-mono text-gray-700">{qtyLabel(item.quantity)}</td>
                      <td className="text-right hidden sm:table-cell font-mono text-gray-500">
                        {money(item.priceAtSale)}
                      </td>
                      <td className="text-right px-2 font-mono text-blue-700">{money(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] uppercase text-gray-400 mt-3">
                {sale.payments.map((payment) => `${payment.method} ${money(payment.value)}`).join(" · ")}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void reprint(sale.id)}
                  className="flex-1 border rounded-lg py-2 text-[10px] font-black uppercase text-gray-700 hover:border-sky-600"
                >
                  Impressão
                </button>
                <button
                  type="button"
                  disabled={!sale.editable}
                  title={sale.editable ? undefined : "Só com o caixa dessa venda aberto"}
                  onClick={() => void openEdit(sale)}
                  className="flex-1 border rounded-lg py-2 text-[10px] font-black uppercase text-gray-700 hover:border-sky-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Edição
                </button>
                <button
                  type="button"
                  disabled={!sale.editable}
                  title={sale.editable ? undefined : "Só com o caixa dessa venda aberto"}
                  onClick={() => setVoiding(sale)}
                  className="flex-1 border border-amber-200 bg-amber-50 rounded-lg py-2 text-[10px] font-black uppercase text-amber-800 hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Estorno
                </button>
              </div>
            </article>
          ))}
      </main>

      {voiding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-black text-gray-800">Estornar esta venda?</h2>
            <p className="text-sm text-gray-500 mt-2">
              {money(voiding.total)} de {when(voiding.createdAt)}. O estoque volta e o caixa deixa de contar o valor.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setVoiding(null)}
                className="flex-1 border rounded-lg py-2 text-xs font-black uppercase text-gray-600"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={voidingId === voiding.id}
                onClick={() => void confirmVoid()}
                className="flex-1 bg-amber-600 text-white rounded-lg py-2 text-xs font-black uppercase disabled:opacity-50"
              >
                {voidingId === voiding.id ? "Estornando..." : "Estornar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-40 p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-gray-800">Editar venda</h2>
                <p className="text-[10px] text-gray-400 uppercase">
                  Pagamentos ficam iguais. Outro valor recebido pede estorno e uma venda nova.
                </p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="text-2xl text-gray-400">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              {lines.map((line) => (
                <div key={line.productId} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{line.name}</p>
                    <p className="text-[10px] text-gray-400">{money(line.priceAtSale)} cada</p>
                  </div>
                  <input
                    value={line.quantity}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.productId === line.productId
                            ? { ...item, quantity: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="w-20 border rounded-lg px-2 py-2 text-sm font-bold text-right"
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLines((current) => current.filter((item) => item.productId !== line.productId))
                    }
                    className="text-[10px] font-black uppercase text-red-600 px-2"
                  >
                    Tirar
                  </button>
                </div>
              ))}

              <div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Adicionar produto"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                {matches.length > 0 && (
                  <div className="border rounded-lg mt-1 overflow-hidden">
                    {matches.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-3"
                      >
                        <span className="truncate">{product.name}</span>
                        <span className="font-bold shrink-0">{money(product.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span>Novo total</span>
                  <span className="font-black">{money(editedTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Já pago</span>
                  <span>{money(editing.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Troco</span>
                  <span>{money(Math.max(editing.totalPaid - editedTotal, 0))}</span>
                </div>
                <p className="text-[10px] uppercase text-gray-400 mt-2">
                  {editing.payments.map((payment) => payment.method).join(" · ")}
                </p>
              </div>

              <button
                type="button"
                disabled={saving || lines.length === 0}
                onClick={() => void saveEdit()}
                className="w-full bg-sky-700 text-white font-black uppercase text-xs rounded-lg py-3 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptPageStyle width={store.printWidth} />
      <SaleReceipt
        lastSale={
          receipt
            ? {
                id: receipt.id,
                total: receipt.total,
                createdAt: receipt.createdAt,
                change: receipt.change,
                status: receipt.status,
                cart: receipt.items,
                payments: receipt.payments,
                customer: receipt.customer ?? undefined,
              }
            : null
        }
        store={store}
        printWidth={store.printWidth}
      />
    </div>
  );
}
