"use client";

import * as React from "react";
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/use-deal-details";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { File as FileIcon, Trash2, UploadCloud, Loader2 } from "lucide-react";

export function AttachmentsTab({ dealId }: { dealId: string }) {
  const { data: attachments, isLoading } = useAttachments(dealId);
  const { mutate: upload, isPending: uploading } = useUploadAttachment(dealId);
  const { mutate: remove } = useDeleteAttachment(dealId);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.set("dealId", dealId);
    formData.set("file", file);
    upload(formData);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center"
      >
        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">Arraste um arquivo aqui ou</p>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          Selecionar arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="text-xs text-muted-foreground">Tamanho máximo: 5MB</p>
      </div>

      {isLoading && <Skeleton className="h-12 w-full" />}
      {!isLoading && attachments?.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum anexo enviado.</p>
      )}

      <div className="space-y-2">
        {attachments?.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-md border p-2.5">
            <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <a href={a.fileUrl} download={a.fileName} className="truncate text-sm font-medium hover:underline block">
                {a.fileName}
              </a>
              <p className="text-xs text-muted-foreground">{formatDateTime(a.uploadedAt)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
