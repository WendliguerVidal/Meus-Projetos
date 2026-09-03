import "server-only";
import { auth } from "./auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "USER";
  allowedStates: string[];
};

/** Retorna o usuário autenticado ou lança erro. Use em Server Actions/Route Handlers. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Não autenticado");
  }
  return session.user as SessionUser;
}

/** true se o usuário pode acessar registros do estado (UF) informado. */
export function canAccessState(user: SessionUser, state: string): boolean {
  if (user.role === "ADMIN") return true;
  return user.allowedStates.includes(state);
}

/** Lança erro se o usuário não puder acessar o estado informado. */
export function assertCanAccessState(user: SessionUser, state: string): void {
  if (!canAccessState(user, state)) {
    throw new Error(`Acesso negado: você não tem permissão para o estado ${state}.`);
  }
}

/** Cláusula Prisma `where` para restringir Deals aos estados permitidos do usuário. */
export function stateScopeWhere(user: SessionUser) {
  if (user.role === "ADMIN") return {};
  return { state: { in: user.allowedStates } };
}

export function requireAdmin(user: SessionUser): void {
  if (user.role !== "ADMIN") {
    throw new Error("Acesso negado: ação restrita a administradores.");
  }
}
