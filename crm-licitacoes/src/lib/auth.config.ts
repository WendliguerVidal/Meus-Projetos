import type { NextAuthConfig } from "next-auth";

// Configuração "edge-safe" usada pelo middleware (sem acesso ao Prisma/bcrypt).
// Os providers reais (Credentials) são adicionados em src/lib/auth.ts.
export const authConfig = {
  // Confia no header `host` do request para montar callback URLs — necessário em
  // plataformas serverless (Vercel) onde a URL pública não é conhecida em build-time.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "USER";
        token.allowedStates = (user as { allowedStates?: string[] }).allowedStates ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
        session.user.allowedStates = (token.allowedStates as string[]) ?? [];
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
