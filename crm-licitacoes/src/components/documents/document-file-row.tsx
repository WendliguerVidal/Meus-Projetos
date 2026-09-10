"use client";

import { FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { formatBytes, formatDateTime, formatDate } from "@/lib/utils";
import { getDocumentUrgency } from "@/lib/urgency";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { DocumentFileItem } from "@/types/document";

function iconForFileType(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv")) return FileSpreadsheet;
  return FileIcon;
}

/** Linha de um documento na lista de arquivos de uma pasta — nome (link de download),
 * tamanho/data de envio, validade com badge de urgência (quando definida), observações,
 * e os botões de editar/excluir. */
export function DocumentFileRow({
  file,
  onEdit,
  onDelete,
}: {
  file: DocumentFileItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = iconForFileType(file.fileType);
  const urgency = getDocumentUrgency(file.expiryDate);
  const isAdmin = useIsAdmin();

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <a href={file.url} download={file.name} className="block truncate text-sm font-medium hover:underline">
          {file.name}
        </a>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)} · Enviado em {formatDateTime(file.createdAt)}
        </p>
        {file.expiryDate && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Validade: {formatDate(file.expiryDate)}</span>
            {urgency && <UrgencyBadge date={file.expiryDate} level={urgency} />}
          </div>
        )}
        {file.notes && <p className="whitespace-pre-wrap text-xs text-foreground/80">{file.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar documento">
          <Pencil className="h-4 w-4" />
        </Button>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Excluir arquivo">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
