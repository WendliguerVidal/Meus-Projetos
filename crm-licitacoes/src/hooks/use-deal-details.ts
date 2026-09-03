"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listNotes, addNote } from "@/app/actions/notes";
import { listAttachments, uploadAttachment, deleteAttachment } from "@/app/actions/attachments";
import { listAuditLogs } from "@/app/actions/audit";
import { listAssignableUsers } from "@/app/actions/users";

export function useNotes(dealId: string) {
  return useQuery({ queryKey: ["notes", dealId], queryFn: () => listNotes(dealId), enabled: !!dealId });
}

export function useAddNote(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => addNote({ dealId, text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", dealId] });
      qc.invalidateQueries({ queryKey: ["audit-logs", dealId] });
      toast.success("Observação adicionada.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao adicionar observação."),
  });
}

export function useAttachments(dealId: string) {
  return useQuery({
    queryKey: ["attachments", dealId],
    queryFn: () => listAttachments(dealId),
    enabled: !!dealId,
  });
}

export function useUploadAttachment(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadAttachment(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attachments", dealId] });
      qc.invalidateQueries({ queryKey: ["audit-logs", dealId] });
      toast.success("Anexo enviado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao enviar anexo."),
  });
}

export function useDeleteAttachment(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attachments", dealId] });
      qc.invalidateQueries({ queryKey: ["audit-logs", dealId] });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao remover anexo."),
  });
}

export function useAuditLogs(dealId: string) {
  return useQuery({
    queryKey: ["audit-logs", dealId],
    queryFn: () => listAuditLogs(dealId),
    enabled: !!dealId,
  });
}

export function useAssignableUsers() {
  return useQuery({ queryKey: ["users", "assignable"], queryFn: () => listAssignableUsers() });
}
