"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { extractEditalFromPdf, createDealFromEdital } from "@/app/actions/import-pdf";
import type { EditalImportFormValues } from "@/types/edital-import";

// Mesmo padrão dos hooks de Event: as Server Actions nunca lançam, retornam
// { success, ... } — os wrappers abaixo convertem uma resposta { success: false, error }
// numa Promise rejeitada para o fluxo onSuccess/onError do React Query funcionar normal.

/** Passo 1: envia o PDF e recebe a prévia extraída (sem persistir nada ainda). */
export function useExtractEdital() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await extractEditalFromPdf(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao ler o edital."),
  });
}

/** Passo 2: usuário confirma/edita a prévia e cria o Deal + Event vinculado. */
export function useCreateDealFromEdital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EditalImportFormValues) => {
      const result = await createDealFromEdital(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      // Atualiza Lista/Kanban (deals), Dashboard e Calendário (o Event recém-criado)
      // reativamente, sem exigir reload manual — cobre os três lugares onde o processo
      // importado passa a aparecer.
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["calendar-items"] });
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Processo importado com sucesso a partir do edital.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao salvar o processo importado."),
  });
}
