import { z } from "zod";

const username = z
  .string()
  .trim()
  .min(3, "O usuário precisa ter pelo menos 3 caracteres")
  .max(30)
  .regex(/^[a-zA-Z0-9._-]+$/, "Use letras, números, ponto, _ ou -")
  .transform((value) => value.toLowerCase());

const password = z.string().min(6, "A senha precisa ter pelo menos 6 caracteres");
const role = z.enum(["OPERATOR", "MANAGER", "OWNER"]);

export const setupSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  username,
  password,
});

export const loginSchema = z.object({
  username,
  password: z.string().min(1, "Informe a senha"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  username,
  password,
  role,
});

export const updateUserSchema = z.object({
  role: role.optional(),
  active: z.boolean().optional(),
  password: z.string().trim().min(6, "A senha precisa ter pelo menos 6 caracteres").optional(),
}).refine((data) => data.role !== undefined || data.active !== undefined || Boolean(data.password), "Nada para salvar");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: password,
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação não confere com a nova senha",
    path: ["confirmPassword"],
  });
