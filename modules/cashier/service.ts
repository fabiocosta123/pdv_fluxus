import {
  CashMovementType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paymentMethodLabel } from "@/modules/sales/payment-method";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import {
  cashMovementSchema,
  closeCashierSchema,
  openCashierSchema,
} from "./schema";
import type { CashierReport, CountedValues, OpenCashierSession } from "./types";

type CashierDb = Prisma.TransactionClient | PrismaClient;

const sessionInclude = {
  movements: true,
  sales: {
    where: { status: "COMPLETED" as const },
    include: { payments: true },
  },
  ledgerEntries: {
    where: { type: "PAYMENT" as const },
  },
  expenses: {
    where: { status: "PAID" as const, method: "MONEY" as const },
  },
} satisfies Prisma.CashierSessionInclude;

type SessionWithRelations = Prisma.CashierSessionGetPayload<{
  include: typeof sessionInclude;
}>;

function emptyCounted(): CountedValues {
  return { DINHEIRO: 0, DÉBITO: 0, CRÉDITO: 0, PIX: 0, CARTEIRA: 0 };
}

function summarize(session: SessionWithRelations) {
  const salesByMethod: Record<string, number> = {};
  let changeTotal = 0;

  for (const sale of session.sales) {
    changeTotal += sale.change;
    for (const payment of sale.payments) {
      const label = paymentMethodLabel(payment.method);
      salesByMethod[label] = (salesByMethod[label] ?? 0) + payment.value;
    }
  }

  for (const entry of session.ledgerEntries) {
    if (!entry.method || entry.method === "WALLET") continue;
    const label = paymentMethodLabel(entry.method);
    salesByMethod[label] = (salesByMethod[label] ?? 0) + entry.amount;
  }

  const totalAporte = session.movements
    .filter((movement) => movement.type === CashMovementType.SUPPLY)
    .reduce((sum, movement) => sum + movement.amount, 0);

  const totalSangria = session.movements
    .filter((movement) => movement.type === CashMovementType.WITHDRAWAL)
    .reduce((sum, movement) => sum + movement.amount, 0);

  const totalSold = Object.values(salesByMethod).reduce((sum, value) => sum + value, 0);
  const cashExpenses = session.expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const moneyExpected =
    session.openingValue +
    (salesByMethod.DINHEIRO ?? 0) -
    changeTotal +
    totalAporte -
    totalSangria -
    cashExpenses;

  return {
    openingValue: session.openingValue,
    totalAporte,
    totalSangria,
    cashExpenses,
    salesByMethod,
    totalSold,
    moneyExpected,
  };
}

function toReport(session: SessionWithRelations): CashierReport {
  const summary = summarize(session);
  const countedValues: CountedValues = {
    DINHEIRO: session.countedMoney ?? 0,
    DÉBITO: session.countedDebit ?? 0,
    CRÉDITO: session.countedCredit ?? 0,
    PIX: session.countedPix ?? 0,
    CARTEIRA: session.countedWallet ?? 0,
  };

  return {
    id: session.id,
    ...summary,
    countedValues,
    differences: {
      DINHEIRO: countedValues.DINHEIRO - summary.moneyExpected,
      DÉBITO: countedValues.DÉBITO - (summary.salesByMethod.DÉBITO ?? 0),
      CRÉDITO: countedValues.CRÉDITO - (summary.salesByMethod.CRÉDITO ?? 0),
      PIX: countedValues.PIX - (summary.salesByMethod.PIX ?? 0),
      CARTEIRA: countedValues.CARTEIRA - (summary.salesByMethod.CARTEIRA ?? 0),
    },
    closedAt: (session.closedAt ?? session.openedAt).toISOString(),
  };
}

async function loadSession(id: string, db: CashierDb) {
  const session = await db.cashierSession.findUnique({
    where: { id },
    include: sessionInclude,
  });
  if (!session) throw new AppError("Caixa não encontrado", 404);
  return session;
}

export async function getOpenSession(): Promise<OpenCashierSession | null> {
  const session = await prisma.cashierSession.findFirst({
    where: { status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
  if (!session) return null;

  return {
    id: session.id,
    status: "OPEN",
    openingValue: session.openingValue,
    openedAt: session.openedAt.toISOString(),
  };
}

export async function openCashier(input: unknown): Promise<OpenCashierSession> {
  const data = parse(openCashierSchema, input);

  try {
    const session = await prisma.$transaction(async (tx) => {
      const alreadyOpen = await tx.cashierSession.findFirst({
        where: { status: "OPEN" },
        select: { id: true },
      });
      if (alreadyOpen) {
        throw new AppError("Já existe um caixa aberto", 409);
      }

      return tx.cashierSession.create({
        data: { openingValue: data.openingValue },
      });
    });

    return {
      id: session.id,
      status: "OPEN",
      openingValue: session.openingValue,
      openedAt: session.openedAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Já existe um caixa aberto", 409);
    }
    throw error;
  }
}

export async function registerMovement(input: unknown) {
  const data = parse(cashMovementSchema, input);
  const type =
    data.type === "APORTE"
      ? CashMovementType.SUPPLY
      : CashMovementType.WITHDRAWAL;

  return prisma.$transaction(async (tx) => {
    const open = await tx.cashierSession.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
    });
    if (!open) throw new AppError("Caixa fechado", 409);

    if (type === CashMovementType.WITHDRAWAL) {
      const session = await loadSession(open.id, tx);
      const { moneyExpected } = summarize(session);
      if (data.value > moneyExpected) {
        throw new AppError("Sangria maior que o dinheiro esperado no caixa", 409);
      }
    }

    return tx.cashMovement.create({
      data: {
        sessionId: open.id,
        type,
        amount: data.value,
        note: data.note || null,
      },
    });
  });
}

export async function closeCashier(input: unknown): Promise<CashierReport> {
  const data = parse(closeCashierSchema, input);

  return prisma.$transaction(async (tx) => {
    const open = await tx.cashierSession.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
    });
    if (!open) throw new AppError("Não há caixa aberto para fechar", 409);

    await tx.cashierSession.update({
      where: { id: open.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        countedMoney: data.countedMoney ?? 0,
        countedDebit: data.countedDebit ?? 0,
        countedCredit: data.countedCredit ?? 0,
        countedPix: data.countedPix ?? 0,
        countedWallet: data.countedWallet ?? 0,
      },
    });

    return toReport(await loadSession(open.id, tx));
  });
}

export async function listClosedSessions(): Promise<CashierReport[]> {
  const sessions = await prisma.cashierSession.findMany({
    where: { status: "CLOSED" },
    include: sessionInclude,
    orderBy: { closedAt: "desc" },
  });

  return sessions.map(toReport);
}
