import { PrintWidth } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parse } from "@/modules/shared/validation";
import { formatCnpj, formatPhone } from "./document";
import { updatePrintSchema, updateStoreSchema } from "./schema";
import type { PrintWidthId, StoreSettings } from "./types";

const STORE_ID = "store";

const WIDTH_TO_API: Record<PrintWidth, PrintWidthId> = {
  MM58: "58mm",
  MM80: "80mm",
};

const WIDTH_TO_DB: Record<PrintWidthId, PrintWidth> = {
  "58mm": PrintWidth.MM58,
  "80mm": PrintWidth.MM80,
};

function toSettings(row: {
  tradeName: string;
  address: string;
  cnpj: string;
  phone: string | null;
  footer: string;
  printWidth: PrintWidth;
}): StoreSettings {
  return {
    tradeName: row.tradeName,
    address: row.address,
    cnpj: formatCnpj(row.cnpj),
    phone: formatPhone(row.phone),
    footer: row.footer,
    printWidth: WIDTH_TO_API[row.printWidth],
  };
}

export async function getSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSettings.upsert({
    where: { id: STORE_ID },
    update: {},
    create: { id: STORE_ID },
  });
  return toSettings(row);
}

export async function updateStore(input: unknown): Promise<StoreSettings> {
  const data = parse(updateStoreSchema, input);
  const row = await prisma.storeSettings.upsert({
    where: { id: STORE_ID },
    update: {
      tradeName: data.tradeName,
      address: data.address,
      cnpj: data.cnpj,
      phone: data.phone ?? null,
      footer: data.footer,
    },
    create: {
      id: STORE_ID,
      tradeName: data.tradeName,
      address: data.address,
      cnpj: data.cnpj,
      phone: data.phone ?? null,
      footer: data.footer,
    },
  });
  return toSettings(row);
}

export async function updatePrint(input: unknown): Promise<StoreSettings> {
  const data = parse(updatePrintSchema, input);
  const row = await prisma.storeSettings.upsert({
    where: { id: STORE_ID },
    update: { printWidth: WIDTH_TO_DB[data.printWidth] },
    create: { id: STORE_ID, printWidth: WIDTH_TO_DB[data.printWidth] },
  });
  return toSettings(row);
}
