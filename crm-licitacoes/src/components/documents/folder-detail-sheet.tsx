"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { useFiles, useUploadFile, useDeleteFile } from "@/hooks/use-documents";
import type { DocumentFolderWithCount } from "@/types/document";
import { FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon, Trash2, UploadCloud, Loader2 } from "lucide-react";

function iconForFileType(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv")) return FileSpreadsheet;
  return FileIcon;
}

/** Visão interna de uma pasta do Repositório de Documentos — upload (drag-and-drop, mesmo
 * padrão de AttachmentsTab) e lista dos arquivos já enviados, cada um com um botão de
 * excluir individual. */
export function FolderDetailSheet({
  folder,
  onOpenChange,
}: {
  /** `null` fecha o Sheet — o mesmo componente cobre "aberto"/"fechado" para poder
   * animar a saída em vez de desmontar na hora. */
  folder: DocumentFolderWithCount | null;
  onOpenChange: (open: boolean) => void;
}) {
  const folderId = folder?.id ?? null;
  const { data: files, isLoading } = useFiles(folderId);
  const { mutate: upload, isPending: uploading } = useUploadFile(folderId ?? "");
  const { mutate: remove } = useDeleteFile(folderId ?? "");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file || !folderId) return;
    const formData = new FormData();
    formData.set("folderId", folderId);
    formData.set("file", file);
    upload(formData);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Sheet open={!!folder} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">{folder?.name}</SheetTitle>
          <SheetDescription>
            {folder?._count.files ?? 0} {folder?._count.files === 1 ? "arquivo" : "arquivos"} nesta pasta.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-accent" : ""
            }`}
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
            <p className="text-sm text-muted-foreground">Arraste um arquivo aqui ou</p>
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              Selecionar arquivo
            </Button>
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">PDFs, imagens, planilhas... · tamanho máximo 3MB</p>
          </div>

          {isLoading && <Skeleton className="h-12 w-full" />}
          {!isLoading && files?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum arquivo nesta pasta ainda.</p>
          )}

          <div className="space-y-2">
            {files?.map((f) => {
              const Icon = iconForFileType(f.fileType);
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-md border p-2.5">
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <a href={f.url} download={f.name} className="block truncate text-sm font-medium hover:underline">
                      {f.name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(f.size)} · {formatDateTime(f.createdAt)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(f.id)} aria-label="Excluir arquivo">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
