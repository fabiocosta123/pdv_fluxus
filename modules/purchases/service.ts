import { SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { visitLabel } from "@/modules/catalog/supplier";
import { normalizeUnit } from "@/modules/catalog/units";

const LOOKBACK_DAYS = 28;
const REORDER_POINT = 3;
const DEFAULT_VISIT_DAYS = 7;
const STORE_TIMEZONE = "America/Sao_Paulo";

function storeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIMEZONE }).format(new Date());
}

function shiftDay(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

const DISCRETE_UNITS = new Set(["un", "pc", "cx"]);

function roundUpQty(value: number) {
  return Math.ceil(Number((value * 1000).toFixed(6)) - 1e-9) / 1000;
}

function suggestQuantity(needed: number, unit: string) {
  const amount = needed > 0 ? needed : 1;
  if (DISCRETE_UNITS.has(normalizeUnit(unit))) {
    return Math.max(1, Math.ceil(amount - 1e-9));
  }
  return roundUpQty(amount);
}

export type PurchaseSuggestion = {
  supplierName: string;
  productId: string;
  name: string;
  unit: string;
  stock: number;
  sold: number;
  weekly: number;
  visitDays: number;
  visitLabel: string;
  assumedVisit: boolean;
  quantity: number;
  cost: number;
  reason: string;
};

export type PurchaseSupplier = {
  name: string;
  cost: number;
  items: PurchaseSuggestion[];
};

export async function suggestPurchases() {
  const today = storeToday();
  const from = shiftDay(today, -(LOOKBACK_DAYS - 1));
  const start = new Date(`${from}T00:00:00.000-03:00`);
  const end = new Date(`${today}T23:59:59.999-03:00`);

  const [products, sales] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        unit: true,
        stock: true,
        costPrice: true,
        supplierName: true,
        supplierVisitDays: true,
      },
    }),
    prisma.saleItem.findMany({
      where: { sale: { status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end } } },
      select: { productId: true, quantity: true },
    }),
  ]);

  const soldByProduct = new Map<string, number>();
  for (const sale of sales) {
    soldByProduct.set(sale.productId, (soldByProduct.get(sale.productId) ?? 0) + Number(sale.quantity));
  }

  const suggestions: PurchaseSuggestion[] = [];
  for (const product of products) {
    const stock = Number(product.stock);
    const sold = soldByProduct.get(product.id) ?? 0;
    const daily = sold / LOOKBACK_DAYS;
    const assumedVisit = product.supplierVisitDays == null;
    const visitDays = product.supplierVisitDays ?? DEFAULT_VISIT_DAYS;
    const demand = daily * visitDays;
    const projected = stock - demand;
    if (stock > REORDER_POINT && projected > REORDER_POINT) continue;

    const needed = demand + REORDER_POINT - stock;
    const quantity = suggestQuantity(needed, product.unit);
    const weekly = Math.round(daily * 7 * 1000) / 1000;
    suggestions.push({
      supplierName: product.supplierName?.trim() || "Sem fornecedor",
      productId: product.id,
      name: product.name,
      unit: product.unit,
      stock,
      sold,
      weekly,
      visitDays,
      visitLabel: assumedVisit ? "Toda semana" : visitLabel(visitDays),
      assumedVisit,
      quantity,
      cost: Math.round(Number(product.costPrice) * quantity),
      reason:
        stock <= REORDER_POINT
          ? "Estoque em 3 ou menos."
          : "O que tem acaba antes da próxima visita.",
    });
  }

  const grouped = new Map<string, PurchaseSuggestion[]>();
  for (const item of suggestions) {
    const current = grouped.get(item.supplierName) ?? [];
    current.push(item);
    grouped.set(item.supplierName, current);
  }

  const suppliers: PurchaseSupplier[] = [...grouped.entries()]
    .map(([name, items]) => ({
      name,
      cost: items.reduce((sum, item) => sum + item.cost, 0),
      items: items.sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    }))
    .sort((left, right) => {
      if (left.name === "Sem fornecedor") return 1;
      if (right.name === "Sem fornecedor") return -1;
      return left.name.localeCompare(right.name, "pt-BR");
    });

  return {
    lookbackDays: LOOKBACK_DAYS,
    reorderPoint: REORDER_POINT,
    totalCost: suppliers.reduce((sum, supplier) => sum + supplier.cost, 0),
    suppliers,
  };
}
