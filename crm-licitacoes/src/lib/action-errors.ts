import "server-only";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/**
 * Converte qualquer erro capturado numa Server Action numa mensagem amigável para
 * exibir ao usuário (ex: num toast), em vez de deixar a exceção subir e virar o erro
 * genérico "An error occurred in the Server Components render" do Next.js em produção.
 */
export function toFriendlyErrorMessage(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues.map((issue) => issue.message).join(" ") || "Dados inválidos.";
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2021":
        return "A tabela necessária ainda não existe no banco de dados. Rode `npx prisma db push` apontando para o banco de produção.";
      case "P2025":
        return "Registro não encontrado — pode já ter sido excluído por outra pessoa.";
      case "P2003":
        return "Referência inválida — verifique se o processo vinculado ainda existe.";
      default:
        return `Erro no banco de dados (código ${err.code}). Tente novamente.`;
    }
  }

  if (err instanceof Error) {
    return err.message || "Erro desconhecido.";
  }

  return "Erro desconhecido.";
}
