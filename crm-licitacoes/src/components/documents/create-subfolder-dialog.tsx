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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCreateSubfolder } from "@/hooks/use-documents";
import { SUGGESTED_SUBFOLDER_NAMES } from "@/types/document";

/** Modal "+ Nova Subpasta" dentro de uma pasta de Estado — nome livre, com atalhos para
 * as categorias mais comuns de documentação de habilitação (CNDs, FGTS, Alvará...). */
export function CreateSubfolderDialog({
  open,
  onOpenChange,
  parentId,
  existingNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  /** Nomes de subpastas já existentes neste Estado — escondidos das sugestões. */
  existingNames: string[];
}) {
  const [name, setName] = React.useState("");
  const { mutate: create, isPending: creating } = useCreateSubfolder(parentId);

  React.useEffect(() => {
    if (open) setName("");
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create(trimmed, { onSuccess: () => onOpenChange(false) });
  };

  const suggestions = SUGGESTED_SUBFOLDER_NAMES.filter((s) => !existingNames.includes(s));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Subpasta</DialogTitle>
          <DialogDescription>Organize os documentos deste estado por categoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-subfolder-name">Nome da subpasta</Label>
            <Input
              id="new-subfolder-name"
              autoFocus
              placeholder="Ex: CND Federal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Sugestões:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setName(s)}
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating || !name.trim()} className="gap-1.5">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Subpasta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
