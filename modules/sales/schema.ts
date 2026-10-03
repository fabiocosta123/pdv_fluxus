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

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
