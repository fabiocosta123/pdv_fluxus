export function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function showDate(value: string | null) {
  if (!value) return "—";
  const day = value.slice(0, 10);
  return day.split("-").reverse().join("/");
}
