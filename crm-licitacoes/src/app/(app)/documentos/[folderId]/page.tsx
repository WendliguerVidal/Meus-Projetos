"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Folder, Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FolderCard } from "@/components/documents/folder-card";
import { CreateSubfolderDialog } from "@/components/documents/create-subfolder-dialog";
import { UploadFileDialog } from "@/components/documents/upload-file-dialog";
import { EditFileDialog } from "@/components/documents/edit-file-dialog";
import { DocumentFileRow } from "@/components/documents/document-file-row";
import { useFolderDetail, useDeleteFolder, useDeleteFile } from "@/hooks/use-documents";
import { STATE_NAMES } from "@/types/document";
import type { DocumentFolderSummary, DocumentFileItem } from "@/types/document";

export default function DocumentFolderPage() {
  const router = useRouter();
  const { folderId } = useParams<{ folderId: string }>();
  const { data: folder, isLoading } = useFolderDetail(folderId);

  const isStateFolder = folder ? folder.parentId === null : false;
  const parentId = folder?.parentId ?? null;

  const { mutate: removeFolder, isPending: deletingFolder } = useDeleteFolder(parentId);
  const { mutate: removeFile } = useDeleteFile(folderId, parentId);

  const [newSubfolderOpen, setNewSubfolderOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [editingFile, setEditingFile] = React.useState<DocumentFileItem | null>(null);
  const [pendingDeleteSubfolder, setPendingDeleteSubfolder] = React.useState<DocumentFolderSummary | null>(null);
  const [pendingDeleteFile, setPendingDeleteFile] = React.useState<DocumentFileItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!folder) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Pasta não encontrada.</p>;
  }

  const stateName = folder.state ? STATE_NAMES[folder.state as keyof typeof STATE_NAMES] : null;

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/documentos" className="hover:text-foreground hover:underline">
            Documentos
          </Link>
          {folder.parent && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link href={`/documentos/${folder.parent.id}`} className="hover:text-foreground hover:underline">
                {folder.parent.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{folder.name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${folder.color}1a`, color: folder.color }}
          >
            <Folder className="h-5 w-5" fill={folder.color} strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">{folder.name}</h1>
            {stateName && <p className="text-sm text-muted-foreground">{stateName}</p>}
          </div>
        </div>
      </div>

      {isStateFolder && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Subpastas</h2>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewSubfolderOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nova Subpasta
            </Button>
          </div>
          {folder.subfolders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma subpasta ainda — crie categorias como &quot;CND Federal&quot;, &quot;FGTS&quot;, &quot;Alvará&quot;...
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {folder.subfolders.map((sub) => (
                <FolderCard
                  key={sub.id}
                  folder={sub}
                  parentId={folder.id}
                  onOpen={() => router.push(`/documentos/${sub.id}`)}
                  onDeleteRequest={() => setPendingDeleteSubfolder(sub)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Arquivos {isStateFolder ? "na raiz deste estado" : "nesta subpasta"}
          </h2>
          <Button size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
            <UploadCloud className="h-3.5 w-3.5" />
            Enviar Arquivo
          </Button>
        </div>
        {folder.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p>
        ) : (
          <div className="space-y-2">
            {folder.files.map((file) => (
              <DocumentFileRow
                key={file.id}
                file={file}
                onEdit={() => setEditingFile(file)}
                onDelete={() => setPendingDeleteFile(file)}
              />
            ))}
          </div>
        )}
      </section>

      <CreateSubfolderDialog
        open={newSubfolderOpen}
        onOpenChange={setNewSubfolderOpen}
        parentId={folder.id}
        existingNames={folder.subfolders.map((s) => s.name)}
      />

      <UploadFileDialog open={uploadOpen} onOpenChange={setUploadOpen} folderId={folder.id} parentId={parentId} />

      <EditFileDialog file={editingFile} folderId={folder.id} parentId={parentId} onOpenChange={(open) => !open && setEditingFile(null)} />

      <ConfirmDialog
        open={!!pendingDeleteSubfolder}
        onOpenChange={(open) => !open && setPendingDeleteSubfolder(null)}
        title="Excluir subpasta"
        description={
          pendingDeleteSubfolder
            ? `Tem certeza que deseja excluir a subpasta "${pendingDeleteSubfolder.name}"? Esta ação não pode ser desfeita e remove ${pendingDeleteSubfolder.fileCount} ${pendingDeleteSubfolder.fileCount === 1 ? "arquivo" : "arquivos"} contidos nela.`
            : ""
        }
        confirmLabel="Excluir"
        loading={deletingFolder}
        onConfirm={() => {
          if (!pendingDeleteSubfolder) return;
          removeFolder(pendingDeleteSubfolder.id, { onSuccess: () => setPendingDeleteSubfolder(null) });
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteFile}
        onOpenChange={(open) => !open && setPendingDeleteFile(null)}
        title="Excluir arquivo"
        description={
          pendingDeleteFile ? `Tem certeza que deseja excluir "${pendingDeleteFile.name}"? Esta ação não pode ser desfeita.` : ""
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (!pendingDeleteFile) return;
          removeFile(pendingDeleteFile.id, { onSuccess: () => setPendingDeleteFile(null) });
        }}
      />
    </div>
  );
}
