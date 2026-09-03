import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protege todas as rotas exceto assets estáticos, API do NextAuth e a página de login.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
