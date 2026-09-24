"use client";

import * as React from "react";
import { FileDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProposalsList, useDownloadSavedProposal } from "@/hooks/use-proposal";
import { formatDateTime } from "@/lib/utils";
import type { GenerateProposalFormValues } from "@/types/proposal";

/** Lista as Propostas Comerciais já geradas para o processo — cada uma pode ser baixada de
 * novo (mesmo PDF enviado na época) ou reaberta no formulário de geração pré-preenchida,
 * para editar e enviar uma nova versão (ver GenerateProposalDialog `initialFormData`). Não
 * exibe nada enquanto carrega ou se o processo ainda não tem nenhuma proposta gerada. */
export function SavedProposalsList({
  dealId,
  onEdit,
}: {
  dealId: string;
  onEdit: (formData: GenerateProposalFormValues) => void;
}) {
  const { data: proposals } = useProposalsList(dealId);
  const { mutate: download, isPending: downloading, variables: downloadingId } = useDownloadSavedProposal();

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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
