export const PRODUCT_UNITS = [
  { value: "un", label: "UNIDADE (UN)" },
  { value: "kg", label: "QUILOGRAMA (KG)" },
  { value: "lt", label: "LITRO (LT)" },
  { value: "pc", label: "PACOTE (PC)" },
  { value: "cx", label: "CAIXA (CX)" },
] as const;

export function normalizeUnit(value: unknown) {
  const unit = String(value ?? "").trim().toLowerCase();
  return unit || "un";
}
