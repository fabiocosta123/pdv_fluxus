import { z } from "zod";

export const createSaleSchema = z.object({
  cart: z
    .array(
      z.object({
        id: z.string().min(1, "Produto sem identificador"),
        quantity: z.number().positive("Quantidade deve ser maior que zero"),
      }),
    )
    .min(1, "Carrinho vazio"),
  payments: z
    .array(
      z.object({
        method: z.string().min(1, "Forma de pagamento obrigatória"),
        value: z.number().positive("Valor do pagamento deve ser maior que zero"),
      }),
    )
    .min(1, "Nenhum pagamento informado"),
  customerId: z.string().min(1).nullable().optional(),
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const clock = z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido");

export const saleHistorySchema = z.object({
  from: day,
  to: day,
  fromTime: clock,
  toTime: clock,
});

export const updateSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Produto sem identificador"),
        quantity: z.number().positive("Quantidade deve ser maior que zero"),
      }),
    )
    .min(1, "A venda precisa de um item"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
