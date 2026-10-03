import { z } from "zod";
import { isValidCnpj, onlyDigits } from "./document";

const phone = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((value) => value === "" || value.length === 10 || value.length === 11, "Telefone inválido")
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export const updateStoreSchema = z.object({
  tradeName: z.string().trim().min(2, "Informe o nome da loja"),
  address: z.string().trim().min(2, "Informe o endereço"),
  cnpj: z.string().trim().min(1, "Informe o CNPJ").transform(onlyDigits).refine(isValidCnpj, "CNPJ inválido"),
  phone,
  footer: z.string().trim().max(80, "A frase do cupom pode ter no máximo 80 caracteres"),
});

export const updatePrintSchema = z.object({
  printWidth: z.enum(["58mm", "80mm"]),
});
