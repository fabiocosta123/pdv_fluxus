export const FISCAL_ORIGINS = [
  { value: 0, label: "0 — Nacional" },
  { value: 1, label: "1 — Estrangeira, importação direta" },
  { value: 2, label: "2 — Estrangeira, adquirida no mercado interno" },
  { value: 3, label: "3 — Nacional, conteúdo importado acima de 40%" },
  { value: 4, label: "4 — Nacional, produção básica" },
  { value: 5, label: "5 — Nacional, conteúdo importado até 40%" },
  { value: 6, label: "6 — Estrangeira, importação direta, sem similar" },
  { value: 7, label: "7 — Estrangeira, mercado interno, sem similar" },
  { value: 8, label: "8 — Nacional, conteúdo importado acima de 70%" },
] as const;

export const ICMS_CSTS = [
  { value: "00", label: "00 — Tributada integralmente" },
  { value: "20", label: "20 — Com redução de base" },
  { value: "40", label: "40 — Isenta" },
  { value: "41", label: "41 — Não tributada" },
  { value: "60", label: "60 — ICMS cobrado por substituição" },
] as const;

export const PIS_COFINS_CSTS = [
  { value: "01", label: "01 — Tributável, alíquota básica" },
  { value: "04", label: "04 — Tributável, monofásica" },
  { value: "06", label: "06 — Tributável, alíquota zero" },
  { value: "07", label: "07 — Isenta" },
  { value: "08", label: "08 — Sem incidência" },
  { value: "09", label: "09 — Com suspensão" },
  { value: "49", label: "49 — Outras saídas" },
] as const;

const ICMS_WITH_RATE = new Set(["00", "20"]);
const PIS_COFINS_WITH_RATE = new Set(["01", "49"]);

export function icmsUsesRate(cst: string) {
  return ICMS_WITH_RATE.has(cst);
}

export function pisCofinsUsesRate(cst: string) {
  return PIS_COFINS_WITH_RATE.has(cst);
}

export function formatPercent(basisPoints: number) {
  return (basisPoints / 100).toFixed(2).replace(".", ",");
}

export function readPercent(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const basisPoints = Math.round(Number(normalized) * 100);
  if (basisPoints > 10000) return null;
  return basisPoints;
}
