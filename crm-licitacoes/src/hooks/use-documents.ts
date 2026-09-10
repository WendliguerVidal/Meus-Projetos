"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listStateFolders,
  createStateFolder,
  createSubfolder,
  renameFolder,
  deleteFolder,
  getFolderDetail,
  uploadFile,
  updateFile,
  deleteFile,
} from "@/app/actions/documents";

// Mesmo padrão dos hooks de Event/PDF-import: as Server Actions de mutação nunca
// lançam — retornam { success, ... }. Os wrappers abaixo convertem uma resposta
// { success: false, error } numa Promise rejeitada para o onSuccess/onError do React
// Query continuar funcionando sem mudar cada tela que consome esses hooks.

export function useStateFolders() {
  return useQuery({ queryKey: ["document-state-folders"], queryFn: () => listStateFolders() });
}

export function useCreateStateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (state: string) => {
      const result = await createStateFolder({ state });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-state-folders"] });
      toast.success("Pasta do estado criada.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar pasta do estado."),
  });
}

export function useCreateSubfolder(parentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const result = await createSubfolder(parentId, { name });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folder", parentId] });
      qc.invalidateQueries({ queryKey: ["document-state-folders"] });
      toast.success("Subpasta criada.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar subpasta."),
  });
}

/** Usado só para subpastas — pastas de Estado não podem ser renomeadas (ver
 * actions/documents.ts). `parentId` é o Estado-pai, para invalidar seu detalhe também. */
export function useRenameFolder(parentId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await renameFolder(id, { name });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-state-folders"] });
      if (parentId) qc.invalidateQueries({ queryKey: ["document-folder", parentId] });
      toast.success("Pasta renomeada.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao renomear pasta."),
  });
}

export function useDeleteFolder(parentId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteFolder(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-state-folders"] });
      if (parentId) qc.invalidateQueries({ queryKey: ["document-folder", parentId] });
      // Documentos vencidos/a vencer dentro da pasta excluída não devem continuar
      // aparecendo na Central de Notificações do cabeçalho.
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Pasta excluída.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir pasta."),
  });
}

export function useFolderDetail(folderId: string | null) {
  return useQuery({
    queryKey: ["document-folder", folderId],
    queryFn: () => getFolderDetail(folderId as string),
    enabled: !!folderId,
  });
}

export function useUploadFile(folderId: string, parentId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await uploadFile(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folder", folderId] });
      // Atualiza a contagem/urgência exibida nos cards do grid (raiz e, se esta pasta
      // for uma subpasta, também o card do Estado-pai).
      qc.invalidateQueries({ queryKey: ["document-state-folders"] });
      if (parentId) qc.invalidateQueries({ queryKey: ["document-folder", parentId] });
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Arquivo enviado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao enviar arquivo."),
  });
}

export function useUpdateFile(folderId: string, parentId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; expiryDate?: string | null; notes?: string }) => {
      const { id, ...rest } = input;
      const result = await updateFile(id, rest);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folder", folderId] });
      qc.invalidateQueries({ queryKey: ["document-state-folders"] });
      if (parentId) qc.invalidateQueries({ queryKey: ["document-folder", parentId] });
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Documento atualizado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar documento."),
  });
}

export function useDeleteFile(folderId: string, parentId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteFile(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folder", folderId] });
      qc.invalidateQueries({ queryKey: ["document-state-folders"] });
      if (parentId) qc.invalidateQueries({ queryKey: ["document-folder", parentId] });
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Arquivo excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir arquivo."),
  });
}
