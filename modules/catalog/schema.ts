import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const createProductSchema = z.object({
  productName: z.string().trim().min(1, "Nome é obrigatório"),
  barCode: z.preprocess(emptyToNull, z.string().nullable().optional()),
  price: z.number().int().positive("Preço de venda deve ser maior que zero"),
  costPrice: z.number().int().nonnegative().optional(),
  stock: z.number().nonnegative().optional(),
  unit: z.string().trim().min(1).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  price: z.number().int().nonnegative(),
  costPrice: z.number().int().nonnegative(),
  stock: z.number().nonnegative(),
  barCode: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const setProductActiveSchema = z.object({
  isActive: z.boolean(),
});
