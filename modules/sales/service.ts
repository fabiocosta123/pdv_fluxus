import { LedgerEntryType, PaymentMethod, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chargeCustomerWallet } from "@/modules/customers/service";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import { mapPaymentMethod, paymentMethodLabel } from "./payment-method";
import { createSaleSchema, saleHistorySchema, updateSaleSchema } from "./schema";

function lineSubtotal(priceCents: number, quantity: number) {
  return Math.round(priceCents * quantity);
}

export async function createSale(input: unknown) {
  const data = parse(createSaleSchema, input);

  const quantities = new Map<string, number>();
  for (const item of data.cart) {
    quantities.set(item.id, (quantities.get(item.id) ?? 0) + item.quantity);
  }

  const totalPaid = data.payments.reduce((sum, payment) => sum + payment.value, 0);

  return prisma.$transaction(async (tx) => {
    const lines: {
      productId: string;
      name: string;
      quantity: number;
      priceAtSale: number;
      subtotal: number;
    }[] = [];

    for (const [productId, quantity] of quantities) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, price: true, isActive: true },
      });

      if (!product || !product.isActive) {
        throw new AppError("Produto não encontrado ou inativo", 404);
      }

      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          isActive: true,
        },
        data: {
          stock: { decrement: quantity },
        },
      });

      if (updated.count !== 1) {
        throw new AppError("Produto não encontrado ou inativo", 404);
      }

      lines.push({
        productId: product.id,
        name: product.name,
        quantity,
        priceAtSale: product.price,
        subtotal: lineSubtotal(product.price, quantity),
      });
    }

    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    if (totalPaid < total) {
      throw new AppError("Pagamento insuficiente", 400);
    }

    const payments = data.payments.map((payment) => ({
      method: mapPaymentMethod(payment.method),
      value: payment.value,
    }));
    const walletTotal = payments
      .filter((payment) => payment.method === "WALLET")
      .reduce((sum, payment) => sum + payment.value, 0);
    const change = totalPaid - total;
    if (change > totalPaid - walletTotal) {
      throw new AppError("Carteira não gera troco", 400);
    }
    if (walletTotal > 0 && !data.customerId) {
      throw new AppError("Selecione um cliente para vender em carteira", 400);
    }

    const session = await tx.cashierSession.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
    });
    if (!session) {
      throw new AppError("Caixa fechado. Abra o caixa antes de vender.", 409);
    }

    if (data.customerId) {
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
        select: { id: true },
      });
      if (!customer) throw new AppError("Cliente não encontrado", 404);
    }

    const sale = await tx.sale.create({
      data: {
        total,
        totalPaid,
        change,
        status: SaleStatus.COMPLETED,
        customerId: data.customerId ?? null,
        cashierSessionId: session.id,
        items: { create: lines },
        payments: {
          create: payments.map((payment) => ({
            method: payment.method,
            amount: payment.value,
            value: payment.value,
          })),
        },
      },
    });

    if (walletTotal > 0 && data.customerId) {
      await chargeCustomerWallet(tx, {
        customerId: data.customerId,
        amount: walletTotal,
        saleId: sale.id,
        cashierSessionId: session.id,
      });
    }

    return sale;
  });
}

export async function listOpenSales() {
  const session = await prisma.cashierSession.findFirst({
    where: { status: "OPEN" },
    select: { id: true },
  });
  if (!session) return [];

  const sales = await prisma.sale.findMany({
    where: { cashierSessionId: session.id, status: SaleStatus.COMPLETED },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      items: { select: { name: true, quantity: true, subtotal: true } },
      payments: { select: { method: true, value: true } },
      customer: { select: { name: true } },
    },
  });

  return sales.map((sale) => ({
    id: sale.id,
    total: sale.total,
    createdAt: sale.createdAt,
    customerName: sale.customer?.name ?? null,
    items: sale.items.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      subtotal: item.subtotal,
    })),
    payments: sale.payments.map((payment) => ({
      method: paymentMethodLabel(payment.method),
      value: payment.value,
    })),
  }));
}

export async function cancelSale(id: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        cashierSession: { select: { id: true, status: true } },
      },
    });

    if (!sale || sale.status !== SaleStatus.COMPLETED) {
      throw new AppError("Venda não encontrada", 404);
    }
    const session = sale.cashierSession;
    if (!session || session.status !== "OPEN") {
      throw new AppError("Só é possível estornar venda do caixa aberto", 409);
    }

    const canceled = await tx.sale.updateMany({
      where: { id: sale.id, status: SaleStatus.COMPLETED },
      data: { status: SaleStatus.CANCELED },
    });
    if (canceled.count !== 1) {
      throw new AppError("Essa venda já foi estornada", 409);
    }

    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const walletTotal = sale.payments
      .filter((payment) => payment.method === PaymentMethod.WALLET)
      .reduce((sum, payment) => sum + payment.value, 0);

    if (walletTotal > 0 && sale.customerId) {
      const customer = await tx.customer.findUnique({ where: { id: sale.customerId } });
      if (!customer || customer.currentDebt < walletTotal) {
        throw new AppError("O fiado dessa venda já foi recebido", 409);
      }

      const updated = await tx.customer.updateMany({
        where: { id: customer.id, currentDebt: { gte: walletTotal } },
        data: { currentDebt: { decrement: walletTotal } },
      });
      if (updated.count !== 1) {
        throw new AppError("Não foi possível estornar o fiado", 409);
      }

      await tx.customerLedgerEntry.create({
        data: {
          customerId: customer.id,
          type: LedgerEntryType.PAYMENT,
          amount: walletTotal,
          balanceAfter: customer.currentDebt - walletTotal,
          method: PaymentMethod.WALLET,
          note: "Estorno da venda",
          cashierSessionId: session.id,
        },
      });
    }

    return { id: sale.id, status: SaleStatus.CANCELED };
  });
}

const STORE_TIMEZONE = "America/Sao_Paulo";

function storeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIMEZONE }).format(new Date());
}

function historyBounds(from: string, to: string, fromTime: string, toTime: string) {
  return {
    start: new Date(`${from}T${fromTime}:00.000-03:00`),
    end: new Date(`${to}T${toTime}:59.999-03:00`),
  };
}

function saleEditable(status: SaleStatus, cashierStatus: "OPEN" | "CLOSED" | null) {
  return status === SaleStatus.COMPLETED && cashierStatus === "OPEN";
}

function shiftDay(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

type Champion = {
  name: string;
  quantity: number;
  margin: number;
  profit: number;
};

async function championBetween(from: string, to: string): Promise<Champion | null> {
  const { start, end } = historyBounds(from, to, "00:00", "23:59");
  const items = await prisma.saleItem.findMany({
    where: { sale: { status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end } } },
    select: {
      productId: true,
      name: true,
      quantity: true,
      subtotal: true,
      product: { select: { name: true, costPrice: true } },
    },
  });

  const grouped = new Map<string, { name: string; quantity: number; revenue: number; cost: number }>();
  for (const item of items) {
    const quantity = Number(item.quantity);
    const current = grouped.get(item.productId) ?? {
      name: item.product.name || item.name,
      quantity: 0,
      revenue: 0,
      cost: 0,
    };
    current.quantity += quantity;
    current.revenue += item.subtotal;
    current.cost += Math.round(Number(item.product.costPrice) * quantity);
    grouped.set(item.productId, current);
  }

  let best: Champion | null = null;
  for (const row of grouped.values()) {
    const profit = row.revenue - row.cost;
    const margin = row.revenue > 0 ? Math.round((profit / row.revenue) * 1000) / 10 : 0;
    if (
      !best ||
      row.quantity > best.quantity ||
      (row.quantity === best.quantity && profit > best.profit)
    ) {
      best = { name: row.name, quantity: row.quantity, margin, profit };
    }
  }
  return best;
}

export async function listChampions() {
  const today = storeToday();
  const weekStart = shiftDay(today, -((new Date(`${today}T12:00:00.000Z`).getUTCDay() + 6) % 7));
  const monthStart = `${today.slice(0, 8)}01`;
  const [day, week, month] = await Promise.all([
    championBetween(today, today),
    championBetween(weekStart, today),
    championBetween(monthStart, today),
  ]);
  return { day, week, month };
}

export async function listSales(input: {
  from?: string | null;
  to?: string | null;
  fromTime?: string | null;
  toTime?: string | null;
}) {
  const today = storeToday();
  const data = parse(saleHistorySchema, {
    from: input.from || today,
    to: input.to || today,
    fromTime: input.fromTime || "00:00",
    toTime: input.toTime || "23:59",
  });
  if (data.from > data.to || (data.from === data.to && data.fromTime > data.toTime)) {
    throw new AppError("O início do período é maior que o fim", 400);
  }

  const { start, end } = historyBounds(data.from, data.to, data.fromTime, data.toTime);
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: { name: true, quantity: true, priceAtSale: true, subtotal: true },
        orderBy: { id: "asc" },
      },
      payments: { select: { method: true, value: true } },
      customer: { select: { name: true } },
      cashierSession: { select: { status: true } },
    },
  });

  return {
    from: data.from,
    to: data.to,
    fromTime: data.fromTime,
    toTime: data.toTime,
    sales: sales.map((sale) => ({
      id: sale.id,
      status: sale.status,
      total: sale.total,
      createdAt: sale.createdAt.toISOString(),
      customerName: sale.customer?.name ?? null,
      editable: saleEditable(sale.status, sale.cashierSession?.status ?? null),
      items: sale.items.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        priceAtSale: item.priceAtSale,
        subtotal: item.subtotal,
      })),
      payments: sale.payments.map((payment) => ({
        method: paymentMethodLabel(payment.method),
        value: payment.value,
      })),
    })),
  };
}

export async function getSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      customer: { select: { name: true, document: true } },
      cashierSession: { select: { status: true } },
    },
  });
  if (!sale) throw new AppError("Venda não encontrada", 404);

  return {
    id: sale.id,
    status: sale.status,
    total: sale.total,
    totalPaid: sale.totalPaid,
    change: sale.change,
    createdAt: sale.createdAt.toISOString(),
    editable: saleEditable(sale.status, sale.cashierSession?.status ?? null),
    customer: sale.customer
      ? { name: sale.customer.name, document: sale.customer.document ?? "" }
      : null,
    items: sale.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: Number(item.quantity),
      priceAtSale: item.priceAtSale,
      subtotal: item.subtotal,
    })),
    payments: sale.payments.map((payment) => ({
      method: paymentMethodLabel(payment.method),
      value: payment.value,
    })),
  };
}

export async function updateSale(id: string, input: unknown) {
  const data = parse(updateSaleSchema, input);
  const requested = new Map<string, number>();
  for (const item of data.items) {
    requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        cashierSession: { select: { status: true } },
      },
    });
    if (!sale || sale.status !== SaleStatus.COMPLETED) {
      throw new AppError("Venda não encontrada", 404);
    }
    if (sale.cashierSession?.status !== "OPEN") {
      throw new AppError("Só é possível editar venda do caixa aberto", 409);
    }

    const previousQty = new Map<string, number>();
    const previousPrice = new Map<string, number>();
    for (const item of sale.items) {
      previousQty.set(item.productId, (previousQty.get(item.productId) ?? 0) + Number(item.quantity));
      if (!previousPrice.has(item.productId)) previousPrice.set(item.productId, item.priceAtSale);
    }

    const lines: {
      productId: string;
      name: string;
      quantity: number;
      priceAtSale: number;
      subtotal: number;
    }[] = [];

    for (const [productId, quantity] of requested) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, price: true, isActive: true },
      });
      if (!product) throw new AppError("Produto não encontrado", 404);
      const previous = previousQty.get(productId) ?? 0;
      if (quantity > previous && !product.isActive) {
        throw new AppError("Produto não encontrado ou inativo", 404);
      }
      const priceAtSale = previousPrice.get(productId) ?? product.price;
      lines.push({
        productId,
        name: product.name,
        quantity,
        priceAtSale,
        subtotal: lineSubtotal(priceAtSale, quantity),
      });
    }

    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    if (total > sale.totalPaid) {
      throw new AppError("O novo total passa do valor já pago. Estorne e faça outra venda.", 400);
    }
    const change = sale.totalPaid - total;
    const walletTotal = sale.payments
      .filter((payment) => payment.method === PaymentMethod.WALLET)
      .reduce((sum, payment) => sum + payment.value, 0);
    if (change > sale.totalPaid - walletTotal) {
      throw new AppError("Carteira não gera troco", 400);
    }

    const productIds = new Set([...previousQty.keys(), ...requested.keys()]);
    for (const productId of productIds) {
      const delta = (previousQty.get(productId) ?? 0) - (requested.get(productId) ?? 0);
      if (delta === 0) continue;
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: delta } },
      });
    }

    await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
    await tx.saleItem.createMany({
      data: lines.map((line) => ({ ...line, saleId: sale.id })),
    });
    const saved = await tx.sale.updateMany({
      where: { id: sale.id, status: SaleStatus.COMPLETED },
      data: { total, change },
    });
    if (saved.count !== 1) throw new AppError("Essa venda já foi estornada", 409);
  });

  return getSale(id);
}
