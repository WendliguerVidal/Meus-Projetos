"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

// ---------------------------------------------------------------------------
// `redirect: false` (em vez de `redirectTo: "/"`) é proposital: um redirect feito aqui
// dentro da Server Action troca de página via navegação client-side do App Router, sem
// recarregar o documento — o <SessionProvider> (montado uma vez na raiz, ver
// components/providers.tsx) nunca é remontado nem notificado do novo cookie de sessão,
// então `useSession()` no cliente continua retornando "unauthenticated" até o usuário
// atualizar a página manualmente. Isso já deixou invisíveis, por exemplo, os botões de
// excluir anexo/proposta (gated por useIsAdmin, que depende de useSession) logo após
// um login novo. Devolvendo { ok: true } e deixando o cliente (login/page.tsx) fazer um
// `window.location.href = "/"` — uma navegação de página inteira — garante que tudo
// remonte já com a sessão válida.
// ---------------------------------------------------------------------------
export async function loginAction(
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { error: null, ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw err;
  }
}
