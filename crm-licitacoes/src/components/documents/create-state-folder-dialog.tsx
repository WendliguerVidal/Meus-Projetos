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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStateFolder } from "@/hooks/use-documents";
import { BRAZIL_STATES } from "@/types/deal";
import { STATE_NAMES } from "@/types/document";

/** Modal "+ Criar Pasta por Estado" — Select com as 27 UFs, já excluindo as que já têm
 * pasta criada (não faz sentido duplicar). */
export function CreateStateFolderDialog({
  open,
  onOpenChange,
  usedStates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** UFs que já têm uma pasta — removidas das opções do Select. */
  usedStates: string[];
}) {
  const [state, setState] = React.useState<string>("");
  const { mutate: create, isPending: creating } = useCreateStateFolder();

  const availableStates = BRAZIL_STATES.filter((uf) => !usedStates.includes(uf));

  React.useEffect(() => {
    if (open) setState("");
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    create(state, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar Pasta por Estado</DialogTitle>
          <DialogDescription>Selecione a UF — uma pasta é criada na raiz do repositório.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            {availableStates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os 27 estados já têm uma pasta criada.</p>
            ) : (
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estado" />
                </SelectTrigger>
                <SelectContent>
                  {availableStates.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf} — {STATE_NAMES[uf]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating || !state} className="gap-1.5">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Pasta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
