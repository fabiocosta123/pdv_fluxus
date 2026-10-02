import { z } from "zod";

export const openCashierSchema = z.object({
  openingValue: z
    .number()
    .int()
    .nonnegative("Valor de abertura não pode ser negativo"),
});

export const cashMovementSchema = z.object({
  type: z.enum(["SANGRIA", "APORTE"]),
  value: z.number().int().positive("Informe um valor maior que zero"),
  note: z.string().trim().max(200).optional(),
});

export const closeCashierSchema = z.object({
  countedMoney: z.number().int().nonnegative().optional(),
  countedDebit: z.number().int().nonnegative().optional(),
  countedCredit: z.number().int().nonnegative().optional(),
  countedPix: z.number().int().nonnegative().optional(),
});
