import { z } from "zod";
import { isValidCpf, onlyDigits } from "./document";

const cpf = z
  .string()
  .trim()
  .min(1, "CPF é obrigatório")
  .transform(onlyDigits)
  .refine(isValidCpf, "CPF inválido");

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
  document: cpf,
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

export const receivePaymentSchema = z.object({
  amount: z.number().int().positive("Informe o valor recebido"),
  method: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO"]),
  note: z.string().trim().max(200).optional(),
});
