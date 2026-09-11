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
import { Textarea } from "@/components/ui/textarea";
import { useUpdateFile } from "@/hooks/use-documents";
import type { DocumentFileItem } from "@/types/document";

/** expiryDate é sempre meia-noite UTC do dia escolhido (ver <input type="date"> e
 * toCalendarDate em lib/utils.ts) — extraímos o dia calendário direto dos componentes
 * UTC, não via date-fns/toLocaleDateString (fuso local), que devolveria o dia anterior
 * em qualquer fuso atrás de UTC (o Brasil inteiro). */
function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Modal "Editar Documento" — nome, validade e observações de um arquivo já enviado
 * (não reenvia o conteúdo do arquivo, só a metadata). */
export function EditFileDialog({
  file,
  folderId,
  parentId,
  onOpenChange,
}: {
  /** `null` fecha o modal. */
  file: DocumentFileItem | null;
  folderId: string;
  parentId?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const { mutate: update, isPending: saving } = useUpdateFile(folderId, parentId);

  React.useEffect(() => {
    if (!file) return;
    setName(file.name);
    setExpiryDate(toDateInputValue(file.expiryDate));
    setNotes(file.notes ?? "");
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!file || !trimmed) return;
    update(
      { id: file.id, name: trimmed, expiryDate: expiryDate || null, notes: notes.trim() },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={!!file} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Documento</DialogTitle>
          <DialogDescription>Altere o nome, a data de validade ou as observações.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-file-name">Nome do arquivo</Label>
            <Input id="edit-file-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-file-expiry">Data de Validade</Label>
            <Input
              id="edit-file-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-file-notes">Observações</Label>
            <Textarea id="edit-file-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
