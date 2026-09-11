"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Diálogo de confirmação genérico para ações destrutivas (excluir processo, evento,
 * etc.) — evita cliques acidentais em ações que não podem ser desfeitas. Controlado
 * pelo chamador (`open`/`onOpenChange`), com um único botão de confirmar em vermelho.
 *
 * `confirmText`, quando informado, exige que o usuário digite esse texto (normalmente
 * o título/nome do item) antes de habilitar o botão de confirmar — uma trava extra para
 * exclusões que afetam muitos dados vinculados (ex: excluir um processo remove notas,
 * lembretes, anexos e histórico junto), para não bastar um clique duplo/acidental. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  loading,
  confirmText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  /** Texto exato que o usuário precisa digitar para habilitar o botão de confirmar. */
  confirmText?: string;
}) {
  const [typed, setTyped] = React.useState("");

  // Limpa o campo sempre que o diálogo abre/fecha ou o item alvo muda — evita que um
  // texto digitado para excluir o item A "sobre" e confirme sozinho a exclusão do item B.
  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open, confirmText]);

  const locked = !!confirmText && typed.trim() !== confirmText.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {confirmText && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-dialog-typed" className="text-xs text-muted-foreground">
              Para confirmar, digite <span className="font-semibold text-foreground">{confirmText}</span> abaixo:
            </Label>
            <Input
              id="confirm-dialog-typed"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading || locked} className="gap-1.5">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
