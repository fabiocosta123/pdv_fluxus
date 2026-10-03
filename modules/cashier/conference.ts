import type { CashierReport } from "./types";

export const CONFERENCE_METHODS = ["DINHEIRO", "DÉBITO", "CRÉDITO", "PIX", "CARTEIRA"] as const;

export type ConferenceMethod = (typeof CONFERENCE_METHODS)[number];

export function expectedAmount(report: CashierReport, method: ConferenceMethod) {
  if (method === "DINHEIRO") return report.moneyExpected;
  return report.salesByMethod[method] ?? 0;
}

export function brokenMethods(report: CashierReport) {
  return CONFERENCE_METHODS.filter((method) => report.differences[method] !== 0);
}

export function cashDrawerLines(report: CashierReport) {
  const cashSales = report.salesByMethod.DINHEIRO ?? 0;
  const change =
    report.openingValue +
    cashSales +
    report.totalAporte -
    report.totalSangria -
    report.cashExpenses -
    report.moneyExpected;

  return [
    { label: "Abertura", value: report.openingValue },
    { label: "Entradas em dinheiro", value: cashSales },
    { label: "Aportes", value: report.totalAporte },
    { label: "Sangrias", value: -report.totalSangria },
    { label: "Despesas em dinheiro", value: -report.cashExpenses },
    { label: "Troco devolvido", value: -change },
  ].filter((line) => line.label === "Abertura" || line.label === "Entradas em dinheiro" || line.value !== 0);
}

export function differenceLabel(cents: number) {
  if (cents < 0) return "Falta";
  if (cents > 0) return "Sobra";
  return "OK";
}
