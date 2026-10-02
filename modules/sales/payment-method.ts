import { PaymentMethod } from "@prisma/client";
import { AppError } from "@/modules/shared/errors";

const METHODS: Record<string, PaymentMethod> = {
  DINHEIRO: "MONEY",
  MONEY: "MONEY",
  PIX: "PIX",
  DEBITO: "DEBIT",
  DEBIT: "DEBIT",
  CREDITO: "CREDIT",
  CREDIT: "CREDIT",
  CARTEIRA: "WALLET",
  WALLET: "WALLET",
  OUTRO: "OTHER",
  OTHER: "OTHER",
};

export function mapPaymentMethod(method: string): PaymentMethod {
  const normalized = method
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  const mapped = METHODS[normalized];
  if (!mapped) {
    throw new AppError(`Forma de pagamento inválida: ${method}`, 400);
  }
  return mapped;
}

const LABELS: Record<PaymentMethod, string> = {
  MONEY: "DINHEIRO",
  PIX: "PIX",
  DEBIT: "DÉBITO",
  CREDIT: "CRÉDITO",
  WALLET: "CARTEIRA",
  OTHER: "OUTRO",
};

export function paymentMethodLabel(method: PaymentMethod) {
  return LABELS[method];
}
