export type CustomerStatus = "ACTIVE" | "BLOCKED";

export type CustomerRecord = {
  id: string;
  name: string;
  document: string;
  birthDate: string | null;
  phone: string | null;
  creditLimit: number | null;
  currentDebt: number;
  availableCredit: number | null;
  status: CustomerStatus;
};

export type CustomerLedgerEntry = {
  id: string;
  type: "CHARGE" | "PAYMENT";
  amount: number;
  balanceAfter: number;
  method: string | null;
  note: string | null;
  saleId: string | null;
  createdAt: string;
};

export type CustomerPurchase = {
  id: string;
  total: number;
  createdAt: string;
  payments: { method: string; value: number }[];
};

export type CustomerDetail = CustomerRecord & {
  ledger: CustomerLedgerEntry[];
  purchases: CustomerPurchase[];
};
