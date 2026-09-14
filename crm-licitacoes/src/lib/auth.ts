import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";
import { parseAllowedStates } from "./utils";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Sobrescreve o `jwt` "edge-safe" de auth.config.ts (usado pelo middleware, sem
    // acesso ao Prisma): aqui, além de gravar o perfil no login, recarregamos do banco
    // a cada verificação de sessão. Sem isso, o token guarda o perfil (role/estados
    // permitidos) exatamente como estava no momento do login — se um Administrador
    // muda o perfil de alguém depois, essa pessoa continua com as permissões antigas
    // "congeladas" na sessão já aberta até deslogar e logar de novo (foi o que
    // aconteceu: perfil alterado no banco, mas sem poder excluir, porque a sessão
    // ainda carregava o perfil anterior). Recarregar aqui garante que a mudança feita
    // pelo Administrador valha já na próxima requisição dessa pessoa, sem precisar
    // pedir para ela deslogar.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "USER";
        token.allowedStates = (user as { allowedStates?: string[] }).allowedStates ?? [];
      }
      if (token.id) {
        // Se o usuário foi excluído nesse meio-tempo, não há nada a atualizar — mantém
        // o token como está (o middleware, que roda em edge e não acessa o Prisma,
        // seguirá tratando essa sessão como válida de qualquer forma; invalidar a
        // sessão só aqui, sem coordenar com o middleware, causa um loop de redirect
        // entre "/" e "/login" — por isso o token só é REFRESCADO aqui, nunca anulado).
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, allowedStates: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.allowedStates = parseAllowedStates(dbUser.allowedStates);
        }
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as "ADMIN" | "USER",
          allowedStates: parseAllowedStates(user.allowedStates),
        };
      },
    }),
  ],
});
