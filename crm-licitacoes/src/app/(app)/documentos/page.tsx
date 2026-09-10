"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FolderCard } from "@/components/documents/folder-card";
import { CreateStateFolderDialog } from "@/components/documents/create-state-folder-dialog";
import { useStateFolders, useDeleteFolder } from "@/hooks/use-documents";
import { useSearch } from "@/components/layout/search-context";
import { STATE_NAMES } from "@/types/document";
import type { DocumentFolderSummary } from "@/types/document";

export default function DocumentosPage() {
  const router = useRouter();
  const { data: folders, isLoading } = useStateFolders();
  const { search } = useSearch();
  const { mutate: removeFolder, isPending: deleting } = useDeleteFolder();

  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<DocumentFolderSummary | null>(null);

  const visibleFolders = React.useMemo(() => {
    if (!search.trim()) return folders ?? [];
    const term = search.trim().toLowerCase();
    return (folders ?? []).filter(
      (f) => f.name.toLowerCase().includes(term) || (f.state && STATE_NAMES[f.state as keyof typeof STATE_NAMES]?.toLowerCase().includes(term))
    );
  }, [folders, search]);

  const usedStates = React.useMemo(() => (folders ?? []).map((f) => f.state).filter((s): s is string => !!s), [folders]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Documentos</h1>
            <p className="text-sm text-muted-foreground">
              Repositório de certidões e documentos por Estado — CNDs, FGTS, alvarás, contratos-padrão...
            </p>
          </div>
        </div>
        <Button onClick={() => setNewFolderOpen(true)} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Criar Pasta por Estado
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!isLoading && visibleFolders.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {search.trim() ? "Nenhuma pasta encontrada." : 'Nenhuma pasta ainda. Clique em "Criar Pasta por Estado" para começar.'}
        </p>
      )}

      {!isLoading && visibleFolders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              subtitle={folder.state ? STATE_NAMES[folder.state as keyof typeof STATE_NAMES] : undefined}
              showRename={false}
              onOpen={() => router.push(`/documentos/${folder.id}`)}
              onDeleteRequest={() => setPendingDelete(folder)}
            />
          ))}
        </div>
      )}

      <CreateStateFolderDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} usedStates={usedStates} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir pasta do estado"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir a pasta "${pendingDelete.name}"? Esta ação não pode ser desfeita e remove ${pendingDelete.fileCount} ${pendingDelete.fileCount === 1 ? "arquivo" : "arquivos"} e todas as subpastas contidas nela.`
            : ""
        }
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeFolder(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}
