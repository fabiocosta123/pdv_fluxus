import { LedgerEntryType, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapPaymentMethod, paymentMethodLabel } from "@/modules/sales/payment-method";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import {
  createCustomerSchema,
  receivePaymentSchema,
  updateCustomerSchema,
} from "./schema";
import type {
  CustomerDetail,
  CustomerLedgerEntry,
  CustomerPurchase,
  CustomerRecord,
} from "./types";

type CustomerRow = {
  id: string;
  name: string;
  document: string | null;
  birthDate: Date | null;
  phone: string | null;
  creditLimit: number | null;
  currentDebt: number;
  status: "ACTIVE" | "BLOCKED";
};

const STORE_TIMEZONE = "America/Sao_Paulo";

function dateOnly(value: Date | null) {
  if (!value) return null;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIMEZONE }).format(new Date());
}

function utcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function storeDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIMEZONE }).format(value);
}

type AccountEntry = {
  createdAt: Date;
  balanceAfter: number;
  type: "CHARGE" | "PAYMENT";
  dueDate: Date | null;
};

export function openAccountDates(entries: AccountEntry[]) {
  let clearedAt: Date | null = null;
  for (const entry of entries) {
    if (entry.balanceAfter === 0) clearedAt = entry.createdAt;
  }
  const open = entries.filter((entry) => !clearedAt || entry.createdAt > clearedAt);
  const first = open[0] ?? entries.at(-1);
  const charge = open.find((entry) => entry.type === "CHARGE") ?? first;
  return {
    since: first ? storeDay(first.createdAt) : null,
    dueDate: charge?.dueDate ? dateOnly(charge.dueDate) : charge ? storeDay(charge.createdAt) : null,
  };
}

function toRecord(customer: CustomerRow): CustomerRecord {
  return {
    id: customer.id,
    name: customer.name,
    document: customer.document ?? "",
    birthDate: dateOnly(customer.birthDate),
    phone: customer.phone,
    creditLimit: customer.creditLimit,
    currentDebt: customer.currentDebt,
    availableCredit:
      customer.creditLimit == null ? null : customer.creditLimit - customer.currentDebt,
    status: customer.status,
  };
}

function parseBirthDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function listCustomers(query: string) {
  const term = query.trim();
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
  if (!term) return customers.map(toRecord);

  const folded = fold(term);
  const digits = term.replace(/\D/g, "");

  return customers
    .filter((customer) => {
      const name = fold(customer.name);
      const document = (customer.document ?? "").replace(/\D/g, "");
      return name.includes(folded) || (digits.length > 0 && document.includes(digits));
    })
    .sort(
      (a, b) =>
        Number(!fold(a.name).startsWith(folded)) - Number(!fold(b.name).startsWith(folded)) ||
        a.name.localeCompare(b.name, "pt-BR"),
    )
    .map(toRecord);
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      ledger: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { settledBy: { select: { name: true } } },
      },
      sales: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { payments: { select: { method: true, value: true } } },
      },
    },
  });
  if (!customer) throw new AppError("Cliente não encontrado", 404);

  const ledger: CustomerLedgerEntry[] = customer.ledger.map((entry) => ({
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    method: entry.method ? paymentMethodLabel(entry.method) : null,
    note: entry.note,
    saleId: entry.saleId,
    createdAt: entry.createdAt.toISOString(),
    dueDate: dateOnly(entry.dueDate),
    paidOn: dateOnly(entry.paidOn),
    interest: entry.interest,
    discount: entry.discount,
    settledBy: entry.settledBy?.name ?? null,
  }));

  const purchases: CustomerPurchase[] = customer.sales.map((sale) => ({
    id: sale.id,
    total: sale.total,
    createdAt: sale.createdAt.toISOString(),
    payments: sale.payments.map((payment) => ({
      method: paymentMethodLabel(payment.method),
      value: payment.value,
    })),
  }));

  return { ...toRecord(customer), ledger, purchases };
}

export async function createCustomer(input: unknown) {
  const data = parse(createCustomerSchema, input);

  try {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        document: data.document,
        birthDate: parseBirthDate(data.birthDate),
        phone: data.phone ?? null,
        creditLimit: data.creditLimit ?? null,
      },
    });
    return toRecord(customer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CPF ou CNPJ já cadastrado", 409);
    }
    throw error;
  }
}

export async function updateCustomer(id: string, input: unknown) {
  const data = parse(updateCustomerSchema, input);
  await getCustomer(id);

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      birthDate: parseBirthDate(data.birthDate),
      phone: data.phone ?? null,
      creditLimit: data.creditLimit ?? null,
      status: data.status,
    },
  });

  return toRecord(customer);
}

export async function receiveCustomerPayment(
  customerId: string,
  input: unknown,
  context: { userId: string; requireCashier?: boolean } = { userId: "", requireCashier: true },
) {
  const data = parse(receivePaymentSchema, input);
  const method = mapPaymentMethod(data.method);
  const interest = data.interest ?? 0;
  const discount = data.discount ?? 0;
  const paidOn = data.paidOn || storeToday();

  return prisma.$transaction(async (tx) => {
    const session = await tx.cashierSession.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
    });
    if (context.requireCashier !== false && !session) {
      throw new AppError("Abra o caixa para receber o débito", 409);
    }

    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError("Cliente não encontrado", 404);
    if (data.amount > customer.currentDebt) {
      throw new AppError("Valor maior que a dívida atual", 400);
    }

    const history = await tx.customerLedgerEntry.findMany({
      where: { customerId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, balanceAfter: true, type: true, dueDate: true },
    });
    const account = openAccountDates(history);

    const updated = await tx.customer.updateMany({
      where: { id: customerId, currentDebt: { gte: data.amount } },
      data: { currentDebt: { decrement: data.amount } },
    });
    if (updated.count !== 1) {
      throw new AppError("Não foi possível baixar a dívida", 409);
    }

    const balanceAfter = customer.currentDebt - data.amount;
    const entry = await tx.customerLedgerEntry.create({
      data: {
        customerId,
        type: LedgerEntryType.PAYMENT,
        amount: data.amount,
        balanceAfter,
        method,
        note: data.note || null,
        cashierSessionId: session?.id ?? null,
        dueDate: account.dueDate ? utcDate(account.dueDate) : null,
        paidOn: utcDate(paidOn),
        interest,
        discount,
        settledById: context.userId || null,
      },
    });

    const availableCredit =
      customer.creditLimit == null ? null : customer.creditLimit - balanceAfter;

    return {
      id: entry.id,
      balanceAfter,
      availableCredit,
      amount: data.amount,
      interest,
      discount,
      received: data.amount + interest - discount,
      method: paymentMethodLabel(method),
    };
  });
}

export async function chargeCustomerWallet(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    amount: number;
    saleId: string;
    cashierSessionId: string;
  },
) {
  if (input.amount <= 0) return;

  const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new AppError("Cliente não encontrado", 404);
  if (customer.status !== "ACTIVE") {
    throw new AppError("Cliente bloqueado para venda em carteira", 409);
  }
  if (customer.creditLimit == null) {
    throw new AppError("Cliente sem limite de crédito", 409);
  }

  const available = customer.creditLimit - customer.currentDebt;
  if (input.amount > available) {
    throw new AppError("Limite de crédito insuficiente", 409);
  }

  const updated = await tx.customer.updateMany({
    where: {
      id: customer.id,
      status: "ACTIVE",
      currentDebt: { lte: customer.creditLimit - input.amount },
    },
    data: { currentDebt: { increment: input.amount } },
  });
  if (updated.count !== 1) {
    throw new AppError("Limite de crédito insuficiente", 409);
  }

  await tx.customerLedgerEntry.create({
    data: {
      customerId: customer.id,
      type: LedgerEntryType.CHARGE,
      amount: input.amount,
      balanceAfter: customer.currentDebt + input.amount,
      method: PaymentMethod.WALLET,
      saleId: input.saleId,
      cashierSessionId: input.cashierSessionId,
      dueDate: utcDate(storeToday()),
    },
  });
}
