export type CountedValues = {
  DINHEIRO: number;
  DÉBITO: number;
  CRÉDITO: number;
  PIX: number;
  CARTEIRA: number;
};

export type CashierReport = {
  id: string;
  openingValue: number;
  totalAporte: number;
  totalSangria: number;
  cashExpenses: number;
  salesByMethod: Record<string, number>;
  totalSold: number;
  moneyExpected: number;
  countedValues: CountedValues;
  differences: CountedValues;
  closedAt: string;
};

export type OpenCashierSession = {
  id: string;
  status: "OPEN";
  openingValue: number;
  openedAt: string;
};
