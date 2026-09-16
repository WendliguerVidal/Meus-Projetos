"use client";

import * as React from "react";
import { File as FileIcon, FileText, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteEquipmentFile, useUploadEquipmentFile } from "@/hooks/use-equipment";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { EQUIPMENT_FILE_ACCEPT, EQUIPMENT_FILE_CATEGORY_LABELS, type EquipmentFileCategory, type EquipmentFileItem } from "@/types/equipment";

function iconForFileType(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.includes("pdf")) return FileText;
  return FileIcon;
}

/** Um bloco de arquivos de uma categoria (Foto ou Ficha Técnica) dentro do card expandido
 * de um equipamento — botão de anexar + lista dos arquivos já enviados dessa categoria.
 * Só é exibido para um equipamento já salvo (precisa de `equipmentId`). */
export function EquipmentFileSection({
  equipmentId,
  category,
  files,
}: {
  equipmentId: string;
  category: EquipmentFileCategory;
  files: EquipmentFileItem[];
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isAdmin = useIsAdmin();
  const { mutate: upload, isPending: uploading } = useUploadEquipmentFile();
  const { mutate: remove, isPending: removing } = useDeleteEquipmentFile();
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; fileName: string } | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.set("equipmentId", equipmentId);
    formData.set("category", category);
    formData.set("file", file);
    upload(formData);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{EQUIPMENT_FILE_CATEGORY_LABELS[category]}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
          Anexar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={EQUIPMENT_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum arquivo anexado.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => {
            const Icon = iconForFileType(file.fileType);
            return (
              <div key={file.id} className="flex items-center gap-2 rounded-md border p-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <a href={file.fileUrl} download={file.fileName} className="block truncate text-xs font-medium hover:underline">
                    {file.fileName}
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(file.size)} · {formatDateTime(file.uploadedAt)}
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setPendingDelete({ id: file.id, fileName: file.fileName })}
                    aria-label="Excluir arquivo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir arquivo"
        description={
          pendingDelete ? `Tem certeza que deseja excluir "${pendingDelete.fileName}"? Essa ação não pode ser desfeita.` : ""
        }
        confirmLabel="Excluir"
        loading={removing}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}
