import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

// Prisma serializa Decimal como string no JSON. Aceita só literal numérico finito;
// string vazia e texto inválido continuam falhando, para não virar 0 em silêncio.
function finiteNumber<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return value;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }, schema);
}

export const createProductSchema = z.object({
  productName: z.string().trim().min(1, "Nome é obrigatório"),
  barCode: z.preprocess(emptyToNull, z.string().nullable().optional()),
  price: finiteNumber(z.number().int().positive("Preço de venda deve ser maior que zero")),
  costPrice: finiteNumber(z.number().int().nonnegative().optional()),
  stock: finiteNumber(z.number().nonnegative().optional()),
  unit: z.string().trim().min(1).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  price: finiteNumber(z.number().int().nonnegative()),
  costPrice: finiteNumber(z.number().int().nonnegative()),
  stock: finiteNumber(z.number().nonnegative()),
  barCode: z.preprocess(emptyToNull, z.string().nullable().optional()),
  unit: z
    .string()
    .trim()
    .min(1, "Unidade é obrigatória")
    .transform((value) => value.toLowerCase()),
});

export const setProductActiveSchema = z.object({
  isActive: z.boolean(),
});
