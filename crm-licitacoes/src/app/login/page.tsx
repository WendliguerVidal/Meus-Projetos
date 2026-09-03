"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Gavel, Loader2 } from "lucide-react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Entrar
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, { error: null });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Gavel className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">CRM de Licitações</CardTitle>
          <CardDescription>Acompanhamento de Licitações e Negócios</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="voce@empresa.com" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>
            {state.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
            )}
            <SubmitButton />
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Acesso restrito. Contate o administrador para obter credenciais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
