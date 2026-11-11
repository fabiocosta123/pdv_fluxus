export const SUPPLIER_VISITS = [
  { days: 1, label: "Todo dia" },
  { days: 7, label: "Toda semana" },
  { days: 15, label: "A cada 15 dias" },
  { days: 30, label: "Todo mês" },
] as const;

export function visitLabel(days: number | null | undefined) {
  if (!days) return "Não informada";
  return SUPPLIER_VISITS.find((item) => item.days === days)?.label ?? `A cada ${days} dias`;
}
