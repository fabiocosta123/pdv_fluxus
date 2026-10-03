import type { UserRole } from "@prisma/client";

export type Area =
  | "pos"
  | "reports"
  | "inventory"
  | "finance"
  | "customers"
  | "settings"
  | "users";

const ACCESS: Record<UserRole, Area[]> = {
  OPERATOR: ["pos", "reports"],
  MANAGER: ["pos", "reports", "inventory", "finance", "customers", "settings"],
  OWNER: ["pos", "reports", "inventory", "finance", "customers", "settings", "users"],
};

export function can(role: UserRole, area: Area) {
  return ACCESS[role].includes(area);
}

export function areaForPath(pathname: string): Area | null {
  if (pathname === "/" || pathname.startsWith("/login")) return null;
  if (pathname.startsWith("/pdv")) return "pos";
  if (pathname.startsWith("/report")) return "reports";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/management/customer")) return "customers";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/users")) return "users";
  return null;
}

export function canAccessPath(role: UserRole, pathname: string) {
  const area = areaForPath(pathname);
  if (!area) return true;
  return can(role, area);
}
