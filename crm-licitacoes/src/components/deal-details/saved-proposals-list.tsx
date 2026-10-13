"use client";

import * as React from "react";
import { FileDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useProposalsList, useDownloadSavedProposal, useDeleteProposal } from "@/hooks/use-proposal";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { formatDateTime } from "@/lib/utils";
import type { GenerateProposalFormValues } from "@/types/proposal";

/** Lista as Propostas Comerciais já geradas para o processo — cada uma pode ser baixada de
 * novo (mesmo PDF enviado na época), reaberta no formulário de geração pré-preenchida para
 * editar e enviar uma nova versão (ver GenerateProposalDialog `initialFormData`), ou
 * excluída (restrito a administradores, mesmo padrão de anexos/arquivos do equipamento).
 * Não exibe nada enquanto carrega ou se o processo ainda não tem nenhuma proposta gerada. */
export function SavedProposalsList({
  dealId,
  onEdit,
}: {
  dealId: string;
  onEdit: (formData: GenerateProposalFormValues) => void;
}) {
  const isAdmin = useIsAdmin();
  const { data: proposals } = useProposalsList(dealId);
  const { mutate: download, isPending: downloading, variables: downloadingId } = useDownloadSavedProposal();
  const { mutate: remove, isPending: removing } = useDeleteProposal();
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; fileName: string } | null>(null);

  if (!proposals || proposals.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground">Propostas Geradas</p>
      <div className="space-y-1.5">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{proposal.fileName}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDateTime(proposal.createdAt)} · {proposal.createdByName}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(proposal.formData)}
                aria-label="Editar e reenviar"
                title="Editar e reenviar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => download(proposal.id)}
                disabled={downloading && downloadingId === proposal.id}
                aria-label="Baixar"
                title="Baixar"
              >
                <FileDown className="h-3.5 w-3.5" />
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setPendingDelete({ id: proposal.id, fileName: proposal.fileName })}
                  aria-label="Excluir"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir proposta"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir "${pendingDelete.fileName}"? Essa ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        loading={removing}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove({ id: pendingDelete.id, dealId }, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}
