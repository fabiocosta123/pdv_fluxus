export type PrintWidthId = "58mm" | "80mm";

export type StoreSettings = {
  tradeName: string;
  address: string;
  cnpj: string;
  phone: string | null;
  footer: string;
  printWidth: PrintWidthId;
};
