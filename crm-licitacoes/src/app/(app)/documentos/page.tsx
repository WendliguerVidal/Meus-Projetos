"use client";

import * as React from "react";
import { FolderKanban, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FolderCard } from "@/components/documents/folder-card";
import { FolderDetailSheet } from "@/components/documents/folder-detail-sheet";
import { useFolders, useCreateFolder, useDeleteFolder } from "@/hooks/use-documents";
import { useSearch } from "@/components/layout/search-context";
import type { DocumentFolderWithCount } from "@/types/document";

export default function DocumentosPage() {
  const { data: folders, isLoading } = useFolders();
  const { search } = useSearch();
  const { mutate: createFolder, isPending: creating } = useCreateFolder();
  const { mutate: removeFolder, isPending: deleting } = useDeleteFolder();

  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [openFolder, setOpenFolder] = React.useState<DocumentFolderWithCount | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<DocumentFolderWithCount | null>(null);

  const visibleFolders = React.useMemo(() => {
    if (!search.trim()) return folders ?? [];
    const term = search.trim().toLowerCase();
    return (folders ?? []).filter((f) => f.name.toLowerCase().includes(term));
  }, [folders, search]);

  // Mantém o Sheet aberto sincronizado com a contagem de arquivos mais recente (ex:
  // depois de um upload) — sem isso o cabeçalho do Sheet mostraria uma contagem velha.
  React.useEffect(() => {
    if (!openFolder) return;
    const fresh = folders?.find((f) => f.id === openFolder.id);
    if (fresh && fresh._count.files !== openFolder._count.files) setOpenFolder(fresh);
  }, [folders, openFolder]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    createFolder(name, {
      onSuccess: () => {
        setNewFolderName("");
        setNewFolderOpen(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Documentos</h1>
            <p className="text-sm text-muted-foreground">
              Repositório de arquivos organizados em pastas — editais modelo, manuais, contratos-padrão...
            </p>
          </div>
        </div>
        <Button onClick={() => setNewFolderOpen(true)} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Pasta
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
          {search.trim() ? "Nenhuma pasta encontrada." : 'Nenhuma pasta ainda. Clique em "Nova Pasta" para começar.'}
        </p>
      )}

      {!isLoading && visibleFolders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onOpen={() => setOpenFolder(folder)}
              onDeleteRequest={() => setPendingDelete(folder)}
            />
          ))}
        </div>
      )}

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>Dê um nome para a nova pasta do repositório de documentos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-folder-name">Nome da pasta</Label>
              <Input
                id="new-folder-name"
                autoFocus
                placeholder="Ex: Editais 2026"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                maxLength={100}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !newFolderName.trim()} className="gap-1.5">
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar Pasta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FolderDetailSheet folder={openFolder} onOpenChange={(open) => !open && setOpenFolder(null)} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir pasta"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir a pasta "${pendingDelete.name}"? Esta ação não pode ser desfeita e remove ${pendingDelete._count.files} ${pendingDelete._count.files === 1 ? "arquivo" : "arquivos"} contidos nela.`
            : ""
        }
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeFolder(pendingDelete.id, {
            onSuccess: () => {
              setPendingDelete(null);
              if (openFolder?.id === pendingDelete.id) setOpenFolder(null);
            },
          });
        }}
      />
    </div>
  );
}
