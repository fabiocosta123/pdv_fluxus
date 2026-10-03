export type FinanceExpense = {
  id: string;
  description: string;
  category: string;
  categoryLabel: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID";
  method: string | null;
  paidAt: string | null;
  note: string | null;
};

export type FinanceReceivable = {
  customerId: string;
  name: string;
  document: string;
  amount: number;
  since: string | null;
  dueDate: string | null;
  creditLimit: number | null;
  availableCredit: number | null;
};

export type FinanceReceipt = {
  id: string;
  customerId: string;
  name: string;
  document: string;
  amount: number;
  interest: number;
  discount: number;
  received: number;
  dueDate: string | null;
  paidOn: string | null;
  method: string | null;
  settledBy: string | null;
};

export type FinanceDueDay = {
  date: string;
  amount: number;
  count: number;
};

export type FinanceSummary = {
  today: string;
  from: string;
  to: string;
  inflowByMethod: Record<string, number>;
  inflowTotal: number;
  walletSold: number;
  expensePaid: number;
  receivablesTotal: number;
  receivablesCount: number;
  payablesTotal: number;
  payablesCount: number;
  overdueTotal: number;
  overdueCount: number;
  tightDay: FinanceDueDay | null;
  upcoming: FinanceDueDay[];
};
