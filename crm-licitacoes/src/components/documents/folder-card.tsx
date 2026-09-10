"use client";

import * as React from "react";
import { Folder, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useRenameFolder } from "@/hooks/use-documents";
import type { DocumentFolderWithCount } from "@/types/document";

/** Card de pasta do grid do Repositório de Documentos — ícone colorido, nome (editável
 * inline via o lápis), contagem de arquivos, e um botão de excluir. Clicar no corpo do
 * card (fora dos botões de ação) abre a pasta; o lápis troca o nome por um campo de
 * texto ("edição rápida") em vez de abrir um modal à parte. */
export function FolderCard({
  folder,
  onOpen,
  onDeleteRequest,
}: {
  folder: DocumentFolderWithCount;
  onOpen: () => void;
  onDeleteRequest: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(folder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { mutate: rename, isPending: renaming } = useRenameFolder();

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Se a pasta for renomeada por outra aba/usuário enquanto esta não está em edição,
  // mantém o campo local em sincronia com o valor mais recente do servidor.
  React.useEffect(() => {
    if (!editing) setName(folder.name);
  }, [folder.name, editing]);

  const commitRename = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === folder.name) {
      setName(folder.name);
      setEditing(false);
      return;
    }
    rename({ id: folder.id, name: trimmed }, { onSuccess: () => setEditing(false) });
  };

  return (
    <Card className="group relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <button
          type="button"
          onClick={onOpen}
          disabled={editing}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg disabled:cursor-default"
          style={{ backgroundColor: `${folder.color}1a`, color: folder.color }}
          aria-label={`Abrir pasta ${folder.name}`}
        >
          <Folder className="h-6 w-6" fill={folder.color} strokeWidth={1.5} />
        </button>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditing(true)}
                aria-label="Renomear pasta"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Renomear</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                onClick={onDeleteRequest}
                aria-label="Excluir pasta"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir pasta</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setName(folder.name);
                  setEditing(false);
                }
              }}
              onBlur={commitRename}
              disabled={renaming}
              className="h-8 text-sm"
              maxLength={100}
            />
            {renaming && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
          </div>
        ) : (
          <button type="button" onClick={onOpen} className="block w-full text-left">
            <p className="truncate text-sm font-medium">{folder.name}</p>
          </button>
        )}
        <Badge variant="secondary" className="mt-1.5 font-normal">
          {folder._count.files} {folder._count.files === 1 ? "arquivo" : "arquivos"}
        </Badge>
      </div>
    </Card>
  );
}
