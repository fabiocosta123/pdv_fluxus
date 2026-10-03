import { ExpenseStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapPaymentMethod, paymentMethodLabel } from "@/modules/sales/payment-method";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import { openAccountDates, receiveCustomerPayment } from "@/modules/customers/service";
import { expenseCategoryLabel } from "./labels";
import {
  createExpenseSchema,
  financePeriodSchema,
  payExpenseSchema,
  payableListSchema,
  receivableListSchema,
  settleReceivableSchema,
} from "./schema";
import type {
  FinanceDueDay,
  FinanceExpense,
  FinanceReceipt,
  FinanceReceivable,
  FinanceSummary,
} from "./types";

const STORE_TIMEZONE = "America/Sao_Paulo";

function storeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIMEZONE }).format(new Date());
}

function periodBounds(from: string, to: string) {
  return {
    start: new Date(`${from}T00:00:00.000-03:00`),
    end: new Date(`${to}T23:59:59.999-03:00`),
  };
}

function dateOnly(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addAmount(target: Record<string, number>, method: PaymentMethod | null, amount: number) {
  if (!method || method === "WALLET") return;
  const label = paymentMethodLabel(method);
  target[label] = (target[label] ?? 0) + amount;
}

type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount: number;
  dueDate: Date;
  status: "PENDING" | "PAID";
  method: PaymentMethod | null;
  paidAt: Date | null;
  note: string | null;
};

function toExpense(expense: ExpenseRow): FinanceExpense {
  return {
    id: expense.id,
    description: expense.description,
    category: expense.category,
    categoryLabel: expenseCategoryLabel(expense.category),
    amount: expense.amount,
    dueDate: dateOnly(expense.dueDate),
    status: expense.status,
    method: expense.method ? paymentMethodLabel(expense.method) : null,
    paidAt: expense.paidAt?.toISOString() ?? null,
    note: expense.note,
  };
}


function dueDays(expenses: { dueDate: Date; amount: number }[]): FinanceDueDay[] {
  const grouped = new Map<string, { amount: number; count: number }>();
  for (const expense of expenses) {
    const date = dateOnly(expense.dueDate);
    const current = grouped.get(date) ?? { amount: 0, count: 0 };
    current.amount += expense.amount;
    current.count += 1;
    grouped.set(date, current);
  }

  return [...grouped.entries()]
    .map(([date, value]) => ({ date, amount: value.amount, count: value.count }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function tightest(days: FinanceDueDay[]) {
  return days.reduce<FinanceDueDay | null>((best, day) => {
    if (!best || day.amount > best.amount || (day.amount === best.amount && day.date < best.date)) {
      return day;
    }
    return best;
  }, null);
}

async function settle(
  tx: Prisma.TransactionClient,
  expenseId: string,
  methodInput: string,
) {
  const expense = await tx.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new AppError("Despesa não encontrada", 404);
  if (expense.status === ExpenseStatus.PAID) {
    throw new AppError("Despesa já está paga", 409);
  }

  const method = mapPaymentMethod(methodInput);
  if (method === PaymentMethod.WALLET) {
    throw new AppError("Despesa não se paga em carteira", 400);
  }

  return tx.expense.update({
    where: { id: expenseId },
    data: {
      status: ExpenseStatus.PAID,
      method,
      paidAt: new Date(),
    },
  });
}

export async function getFinanceSummary(fromInput?: string | null, toInput?: string | null): Promise<FinanceSummary> {
  const today = storeToday();
  const data = parse(financePeriodSchema, {
    from: fromInput || `${today.slice(0, 8)}01`,
    to: toInput || today,
  });
  if (data.from > data.to) throw new AppError("A data inicial é maior que a final", 400);

  const { start, end } = periodBounds(data.from, data.to);

  const [payments, receipts, walletPayments, paidInPeriod, pendingExpenses, debtors] = await Promise.all([
    prisma.payment.findMany({
      where: {
        method: { not: PaymentMethod.WALLET },
        sale: { status: "COMPLETED", createdAt: { gte: start, lte: end } },
      },
      select: { method: true, value: true },
    }),
    prisma.customerLedgerEntry.findMany({
      where: {
        type: "PAYMENT",
        OR: [
          {
            paidOn: {
              gte: new Date(`${data.from}T00:00:00.000Z`),
              lte: new Date(`${data.to}T00:00:00.000Z`),
            },
          },
          { paidOn: null, createdAt: { gte: start, lte: end } },
        ],
      },
      select: { method: true, amount: true, interest: true, discount: true },
    }),
    prisma.payment.findMany({
      where: {
        method: PaymentMethod.WALLET,
        sale: { status: "COMPLETED", createdAt: { gte: start, lte: end } },
      },
      select: { value: true },
    }),
    prisma.expense.aggregate({
      where: { status: ExpenseStatus.PAID, paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { status: ExpenseStatus.PENDING },
      select: { amount: true, dueDate: true },
    }),
    prisma.customer.aggregate({
      where: { currentDebt: { gt: 0 } },
      _sum: { currentDebt: true },
      _count: { _all: true },
    }),
  ]);

  const inflowByMethod: Record<string, number> = {};
  for (const payment of payments) addAmount(inflowByMethod, payment.method, payment.value);
  for (const receipt of receipts) {
    addAmount(inflowByMethod, receipt.method, receipt.amount + receipt.interest - receipt.discount);
  }

  const days = dueDays(pendingExpenses);
  const overdue = days.filter((day) => day.date < today);

  return {
    today,
    from: data.from,
    to: data.to,
    inflowByMethod,
    inflowTotal: Object.values(inflowByMethod).reduce((sum, value) => sum + value, 0),
    walletSold: walletPayments.reduce((sum, payment) => sum + payment.value, 0),
    expensePaid: paidInPeriod._sum.amount ?? 0,
    receivablesTotal: debtors._sum.currentDebt ?? 0,
    receivablesCount: debtors._count._all,
    payablesTotal: pendingExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    payablesCount: pendingExpenses.length,
    overdueTotal: overdue.reduce((sum, day) => sum + day.amount, 0),
    overdueCount: overdue.reduce((sum, day) => sum + day.count, 0),
    tightDay: tightest(days),
    upcoming: days.filter((day) => day.date >= today).slice(0, 5),
  };
}

export async function listPayables(statusInput?: string | null): Promise<FinanceExpense[]> {
  const { status } = parse(payableListSchema, { status: statusInput || "PENDING" });
  const expenses = await prisma.expense.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: status === "PAID" ? { paidAt: "desc" } : { dueDate: "asc" },
  });
  return expenses.map(toExpense);
}

export async function listReceivables(): Promise<FinanceReceivable[]> {
  const debtors = await prisma.customer.findMany({
    where: { currentDebt: { gt: 0 } },
    orderBy: { currentDebt: "desc" },
    include: {
      ledger: {
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, balanceAfter: true, type: true, dueDate: true },
      },
    },
  });

  return debtors.map((customer) => {
    const account = openAccountDates(customer.ledger);
    return {
      customerId: customer.id,
      name: customer.name,
      document: customer.document ?? "",
      amount: customer.currentDebt,
      since: account.since,
      dueDate: account.dueDate,
      creditLimit: customer.creditLimit,
      availableCredit:
        customer.creditLimit == null ? null : customer.creditLimit - customer.currentDebt,
    };
  });
}

export async function listReceipts(): Promise<FinanceReceipt[]> {
  const entries = await prisma.customerLedgerEntry.findMany({
    where: { type: "PAYMENT" },
    orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
    include: {
      customer: { select: { id: true, name: true, document: true } },
      settledBy: { select: { name: true } },
    },
    take: 200,
  });

  return entries.map((entry) => ({
    id: entry.id,
    customerId: entry.customer.id,
    name: entry.customer.name,
    document: entry.customer.document ?? "",
    amount: entry.amount,
    interest: entry.interest,
    discount: entry.discount,
    received: entry.amount + entry.interest - entry.discount,
    dueDate: entry.dueDate ? dateOnly(entry.dueDate) : null,
    paidOn: entry.paidOn ? dateOnly(entry.paidOn) : null,
    method: entry.method ? paymentMethodLabel(entry.method) : null,
    settledBy: entry.settledBy?.name ?? null,
  }));
}

export async function listReceivableView(statusInput?: string | null) {
  const { status } = parse(receivableListSchema, { status: statusInput || "OPEN" });
  if (status === "PAID") return listReceipts();
  return listReceivables();
}

export async function settleReceivable(customerId: string, input: unknown, userId: string) {
  const data = parse(settleReceivableSchema, input);
  return receiveCustomerPayment(customerId, data, { userId, requireCashier: false });
}

export async function createExpense(input: unknown) {
  const data = parse(createExpenseSchema, input);

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        description: data.description,
        category: data.category,
        amount: data.amount,
        dueDate: new Date(`${data.dueDate}T00:00:00.000Z`),
        note: data.note || null,
      },
    });

    const saved = data.payNow && data.method
      ? await settle(tx, expense.id, data.method)
      : expense;

    return toExpense(saved);
  });
}

export async function payExpense(id: string, input: unknown) {
  const data = parse(payExpenseSchema, input);
  const saved = await prisma.$transaction((tx) => settle(tx, id, data.method));
  return toExpense(saved);
}

export async function deleteExpense(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { cashierSession: { select: { status: true } } },
  });
  if (!expense) throw new AppError("Despesa não encontrada", 404);
  if (expense.cashierSession?.status === "CLOSED") {
    throw new AppError("Despesa ligada a um caixa já fechado", 409);
  }

  await prisma.expense.delete({ where: { id } });
}
