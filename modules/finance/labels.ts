export const EXPENSE_CATEGORIES = [
  { id: "FORNECEDOR", label: "Fornecedor" },
  { id: "ALUGUEL", label: "Aluguel" },
  { id: "ENERGIA", label: "Energia" },
  { id: "AGUA", label: "Água" },
  { id: "INTERNET", label: "Internet" },
  { id: "SALARIOS", label: "Salários" },
  { id: "OUTROS", label: "Outros" },
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];

export function expenseCategoryLabel(category: string) {
  return EXPENSE_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}
