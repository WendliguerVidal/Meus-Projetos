"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getProposalDefaults,
  generateProposalPdf,
  listProposalsForDeal,
  getSavedProposalPdf,
} from "@/app/actions/proposal";
import type { GenerateProposalFormValues } from "@/types/proposal";

/** Baixa o PDF (base64) retornado pela Server Action — o navegador não deixa uma Server
 * Action entregar um arquivo binário direto, então convertemos para Blob no cliente. */
function downloadBase64Pdf(base64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useProposalDefaults() {
  return useMutation({
    mutationFn: async (dealId: string) => {
      const result = await getProposalDefaults(dealId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao carregar dados da proposta."),
  });
}

export function useGenerateProposalPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateProposalFormValues) => {
      const result = await generateProposalPdf(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data, variables) => {
      downloadBase64Pdf(data.base64, data.fileName);
      toast.success("Proposta comercial gerada.");
      qc.invalidateQueries({ queryKey: ["proposals", variables.dealId] });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao gerar a proposta comercial."),
  });
}

/** Propostas já geradas e salvas para o processo — ver SavedProposalsList. */
export function useProposalsList(dealId: string) {
  return useQuery({
    queryKey: ["proposals", dealId],
    queryFn: async () => {
      const result = await listProposalsForDeal(dealId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useDownloadSavedProposal() {
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await getSavedProposalPdf(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => downloadBase64Pdf(data.base64, data.fileName),
    onError: (err: Error) => toast.error(err.message || "Erro ao baixar a proposta."),
  });
}
