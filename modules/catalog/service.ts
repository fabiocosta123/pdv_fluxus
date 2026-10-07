import { prisma } from "@/lib/prisma";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import {
  createProductSchema,
  setProductActiveSchema,
  updateProductSchema,
} from "./schema";

export async function listProducts() {
  return prisma.product.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Produto não encontrado", 404);
  return product;
}

export async function searchProducts(term: string) {
  const searchInput = decodeURIComponent(term).trim();
  if (!searchInput) return [];

  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { barCode: searchInput },
        {
          name: {
            contains: searchInput,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(input: unknown) {
  const data = parse(createProductSchema, input);

  return prisma.product.create({
    data: {
      name: data.productName,
      barCode: data.barCode ?? null,
      price: data.price,
      costPrice: data.costPrice ?? 0,
      stock: data.stock ?? 0,
      unit: data.unit?.toLowerCase() || "un",
      isActive: true,
    },
  });
}

export async function updateProduct(id: string, input: unknown) {
  const data = parse(updateProductSchema, input);
  await getProduct(id);

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      price: data.price,
      costPrice: data.costPrice,
      stock: data.stock,
      barCode: data.barCode ?? null,
      unit: data.unit,
    },
  });
}

export async function setProductActive(id: string, input: unknown) {
  const data = parse(setProductActiveSchema, input);
  await getProduct(id);

  return prisma.product.update({
    where: { id },
    data: { isActive: data.isActive },
  });
}
