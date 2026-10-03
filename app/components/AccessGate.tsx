"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { canAccessPath } from "@/modules/auth/access";
import type { AuthUser } from "@/modules/auth/types";

const AuthContext = createContext<AuthUser | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(pathname === "/login");

  useEffect(() => {
    if (pathname === "/login") {
      setReady(true);
      return;
    }

    let active = true;
    setReady(false);
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        const current: AuthUser = await response.json();
        if (!canAccessPath(current.role, pathname)) {
          toast.error("Sem permissão para esta função");
          router.replace("/");
          return;
        }
        setUser(current);
        setReady(true);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (pathname === "/login") return children;
  if (!ready || !user) return null;
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
