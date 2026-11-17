import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

function realDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function inclusiveDays(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export const purchaseQuerySchema = z
  .object({
    from: day.optional(),
    to: day.optional(),
  })
  .refine((data) => (!data.from || realDay(data.from)) && (!data.to || realDay(data.to)), "Data inválida")
  .refine((data) => Boolean(data.from) === Boolean(data.to), "Informe o início e o fim")
  .refine((data) => !data.from || !data.to || data.from <= data.to, "A data inicial passa da final")
  .refine((data) => !data.from || !data.to || inclusiveDays(data.from, data.to) <= 366, "O período pode ter no máximo um ano");
