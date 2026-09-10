"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  listFiles,
  uploadFile,
  deleteFile,
} from "@/app/actions/documents";

// Mesmo padrão dos hooks de Event/PDF-import: as Server Actions de mutação nunca
// lançam — retornam { success, ... }. Os wrappers abaixo convertem uma resposta
// { success: false, error } numa Promise rejeitada para o onSuccess/onError do React
// Query continuar funcionando sem mudar cada tela que consome esses hooks.

export function useFolders() {
  return useQuery({ queryKey: ["document-folders"], queryFn: () => listFolders() });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const result = await createFolder({ name });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folders"] });
      toast.success("Pasta criada.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar pasta."),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await renameFolder(id, { name });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folders"] });
      toast.success("Pasta renomeada.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao renomear pasta."),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteFolder(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-folders"] });
      toast.success("Pasta excluída.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir pasta."),
  });
}

export function useFiles(folderId: string | null) {
  return useQuery({
    queryKey: ["document-files", folderId],
    queryFn: () => listFiles(folderId as string),
    enabled: !!folderId,
  });
}

export function useUploadFile(folderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await uploadFile(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-files", folderId] });
      // Atualiza a contagem de arquivos exibida no card da pasta, no grid.
      qc.invalidateQueries({ queryKey: ["document-folders"] });
      toast.success("Arquivo enviado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao enviar arquivo."),
  });
}

export function useDeleteFile(folderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteFile(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-files", folderId] });
      qc.invalidateQueries({ queryKey: ["document-folders"] });
      toast.success("Arquivo excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir arquivo."),
  });
}
