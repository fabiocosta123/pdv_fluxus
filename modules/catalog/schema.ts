import { z } from "zod";
import { ICMS_CSTS, PIS_COFINS_CSTS, icmsUsesRate, pisCofinsUsesRate } from "./fiscal";

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

const icmsCst = z.enum(ICMS_CSTS.map((item) => item.value) as ["00", "20", "40", "41", "60"]);
const contributionCst = z.enum(
  PIS_COFINS_CSTS.map((item) => item.value) as ["01", "04", "06", "07", "08", "09", "49"],
);
const rate = finiteNumber(z.number().int().min(0, "Alíquota inválida").max(10000, "Alíquota inválida"));

const fiscalFields = {
  ncm: z.string().trim().regex(/^\d{8}$/, "NCM precisa ter 8 dígitos"),
  cest: z.preprocess(
    emptyToNull,
    z.string().regex(/^\d{7}$/, "CEST precisa ter 7 dígitos").nullable().optional(),
  ),
  cfop: z.string().trim().regex(/^\d{4}$/, "CFOP precisa ter 4 dígitos"),
  origin: z.number().int().min(0).max(8),
  icmsCst,
  icmsRate: rate,
  pisCst: contributionCst,
  pisRate: rate,
  cofinsCst: contributionCst,
  cofinsRate: rate,
};

function refineFiscal(
  data: {
    icmsCst: string;
    icmsRate: number;
    pisCst: string;
    pisRate: number;
    cofinsCst: string;
    cofinsRate: number;
  },
  ctx: z.RefinementCtx,
) {
  if (icmsUsesRate(data.icmsCst) && data.icmsRate <= 0) {
    ctx.addIssue({ code: "custom", message: "Informe a alíquota de ICMS", path: ["icmsRate"] });
  }
  if (pisCofinsUsesRate(data.pisCst) && data.pisRate <= 0) {
    ctx.addIssue({ code: "custom", message: "Informe a alíquota de PIS", path: ["pisRate"] });
  }
  if (pisCofinsUsesRate(data.cofinsCst) && data.cofinsRate <= 0) {
    ctx.addIssue({ code: "custom", message: "Informe a alíquota de COFINS", path: ["cofinsRate"] });
  }
}

export const createProductSchema = z
  .object({
    productName: z.string().trim().min(1, "Nome é obrigatório"),
    barCode: z.preprocess(emptyToNull, z.string().nullable().optional()),
    price: finiteNumber(z.number().int().positive("Preço de venda deve ser maior que zero")),
    costPrice: finiteNumber(z.number().int().nonnegative().optional()),
    stock: finiteNumber(z.number().nonnegative().optional()),
    unit: z.string().trim().min(1).optional(),
    supplierName: z.preprocess(emptyToNull, z.string().trim().max(80, "Nome do fornecedor longo demais").nullable().optional()),
    supplierVisitDays: z.preprocess(
      (value) => (value === "" || value == null ? null : value),
      finiteNumber(z.number().int().min(1, "Frequência inválida").max(90, "Frequência inválida").nullable().optional()),
    ),
    ...fiscalFields,
  })
  .superRefine(refineFiscal);

export const updateProductSchema = z
  .object({
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
    supplierName: z.preprocess(emptyToNull, z.string().trim().max(80, "Nome do fornecedor longo demais").nullable().optional()),
    supplierVisitDays: z.preprocess(
      (value) => (value === "" || value == null ? null : value),
      finiteNumber(z.number().int().min(1, "Frequência inválida").max(90, "Frequência inválida").nullable().optional()),
    ),
    ...fiscalFields,
  })
  .superRefine(refineFiscal);

export const setProductActiveSchema = z.object({
  isActive: z.boolean(),
});
