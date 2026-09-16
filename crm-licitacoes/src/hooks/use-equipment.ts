"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listEquipment,
  listEquipmentFieldTemplates,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  uploadEquipmentFile,
  deleteEquipmentFile,
} from "@/app/actions/equipment";
import type { EquipmentFormValues } from "@/types/equipment";

export function useEquipmentList() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: () => listEquipment(),
  });
}

export function useEquipmentFieldTemplates() {
  return useQuery({
    queryKey: ["equipment", "field-templates"],
    queryFn: () => listEquipmentFieldTemplates(),
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    // As Server Actions de equipamento nunca lançam — retornam { success, ... };
    // convertemos de volta numa Promise rejeitada para o fluxo onSuccess/onError do
    // React Query continuar igual (ver useDeleteDeal em use-deals.ts, mesmo padrão).
    mutationFn: async (input: EquipmentFormValues) => {
      const result = await createEquipment(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipamento cadastrado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao cadastrar equipamento."),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: EquipmentFormValues }) => {
      const result = await updateEquipment(id, input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipamento atualizado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar equipamento."),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteEquipment(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipamento excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir equipamento."),
  });
}

export function useUploadEquipmentFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await uploadEquipmentFile(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Arquivo enviado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao enviar arquivo."),
  });
}

export function useDeleteEquipmentFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteEquipmentFile(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Arquivo excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir arquivo."),
  });
}
