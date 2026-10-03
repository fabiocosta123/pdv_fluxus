export const ROLE_LABELS = {
  OPERATOR: "Operador",
  MANAGER: "Gerente",
  OWNER: "Proprietário",
} as const;

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: keyof typeof ROLE_LABELS;
  roleLabel: string;
  active: boolean;
};
