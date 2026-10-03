import { z } from "zod";

export const createPixSchema = z.object({
  amount: z.number().int().min(35, "O PIX precisa ser de pelo menos R$ 0,35"),
  customerName: z.string().trim().max(80).optional(),
  document: z.string().trim().max(18).optional(),
});
