"use client";

import * as React from "react";
import { Loader2, UploadCloud, File as FileIcon } from "lucide-react";
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
import { useUploadFile } from "@/hooks/use-documents";

/** Modal "Enviar Arquivo" — dropzone (arrastar ou selecionar) + data de validade e
 * observações opcionais, coletadas já no envio (podem ser completadas depois, via
 * EditFileDialog). */
export function UploadFileDialog({
  open,
  onOpenChange,
  folderId,
  parentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  /** Pasta de Estado que contém esta pasta — só para invalidar o cache certo. */
  parentId?: string | null;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [expiryDate, setExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { mutate: upload, isPending: uploading } = useUploadFile(folderId, parentId);

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setExpiryDate("");
      setNotes("");
      setDragOver(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.set("folderId", folderId);
    formData.set("file", file);
    if (expiryDate) formData.set("expiryDate", expiryDate);
    if (notes.trim()) formData.set("notes", notes.trim());
    upload(formData, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Arquivo</DialogTitle>
          <DialogDescription>
            PDFs, imagens, planilhas... Adicione a validade e observações, se houver.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-accent" : ""
            }`}
          >
            {file ? (
              <>
                <FileIcon className="h-6 w-6 text-muted-foreground" />
                <p className="max-w-full truncate text-sm font-medium">{file.name}</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste um arquivo aqui ou</p>
              </>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              {file ? "Trocar arquivo" : "Selecionar arquivo"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">Tamanho máximo 3MB</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upload-expiry">Data de Validade</Label>
            <Input id="upload-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upload-notes">Observações</Label>
            <Textarea
              id="upload-notes"
              rows={3}
              placeholder="Detalhes da certidão, número do processo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading || !file} className="gap-1.5">
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
