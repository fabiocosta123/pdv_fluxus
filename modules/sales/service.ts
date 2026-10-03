import { SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chargeCustomerWallet } from "@/modules/customers/service";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import { mapPaymentMethod } from "./payment-method";
import { createSaleSchema } from "./schema";

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
