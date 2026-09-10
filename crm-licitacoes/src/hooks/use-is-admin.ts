"use client";

import { useSession } from "next-auth/react";

/** true quando o usuário autenticado é Administrador — usado para esconder botões de
 * exclusão na UI (a restrição de verdade é sempre no servidor, ver requireAdmin em
 * lib/rbac.ts; isso aqui só evita mostrar uma ação que o backend vai recusar). */
export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  return session?.user?.role === "ADMIN";
}
