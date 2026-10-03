import { z } from "zod";
import { EXPENSE_CATEGORIES, type ExpenseCategoryId } from "./labels";

const categoryIds = EXPENSE_CATEGORIES.map((item) => item.id) as [
  ExpenseCategoryId,
  ...ExpenseCategoryId[],
];

const dueDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vencimento inválido");
const payMethod = z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO"]);

export const createExpenseSchema = z
  .object({
    description: z.string().trim().min(2, "Informe a descrição"),
    category: z.enum(categoryIds),
    amount: z.number().int().positive("Informe o valor"),
    dueDate,
    note: z.string().trim().max(200).optional(),
    payNow: z.boolean().optional(),
    method: payMethod.optional(),
  })
  .refine((data) => !data.payNow || Boolean(data.method), "Informe como a despesa foi paga");

export const payExpenseSchema = z.object({
  method: payMethod,
});

export const financePeriodSchema = z.object({
  from: dueDate,
  to: dueDate,
});

export const payableListSchema = z.object({
  status: z.enum(["PENDING", "PAID", "ALL"]).default("PENDING"),
});
