import { z } from "zod";
import { isValidDocument, onlyDigits } from "./document";

const document = z
  .string()
  .trim()
  .min(1, "Informe o CPF ou CNPJ")
  .transform(onlyDigits)
  .refine(isValidDocument, "CPF ou CNPJ inválido");

const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida")
  .refine((value) => value <= new Date().toISOString().slice(0, 10), "Data de nascimento não pode ser futura")
  .nullable()
  .optional();

const phone = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((value) => value === "" || value.length === 10 || value.length === 11, "Telefone inválido")
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

const creditLimit = z.number().int().nonnegative("Limite não pode ser negativo").nullable().optional();

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  document,
  birthDate,
  phone,
  creditLimit,
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  birthDate,
  phone,
  creditLimit,
  status: z.enum(["ACTIVE", "BLOCKED"]),
});

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const receivePaymentSchema = z
  .object({
    amount: z.number().int().positive("Informe o valor da conta"),
    method: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO"]),
    note: z.string().trim().max(200).optional(),
    paidOn: calendarDate.optional(),
    interest: z.number().int().nonnegative("Juros inválido").optional(),
    discount: z.number().int().nonnegative("Desconto inválido").optional(),
  })
  .refine((data) => (data.discount ?? 0) <= data.amount, "Desconto maior que o valor da conta");
