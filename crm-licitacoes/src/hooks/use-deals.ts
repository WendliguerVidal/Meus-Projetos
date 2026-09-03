"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  moveDeal,
  deleteDeal,
  getDashboardStats,
  type DealFilters,
} from "@/app/actions/deals";
import type { DealFormValues, DealCategory } from "@/types/deal";

export function dealsQueryKey(filters?: DealFilters) {
  return ["deals", filters ?? {}] as const;
}

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: dealsQueryKey(filters),
    queryFn: () => listDeals(filters),
  });
}

export function useDeal(id: string | null) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: () => getDeal(id as string),
    enabled: !!id,
  });
}

export function useDashboardStats(filters?: DealFilters) {
  return useQuery({
    queryKey: ["dashboard-stats", filters ?? {}],
    queryFn: () => getDashboardStats(filters),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DealFormValues) => createDeal(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Processo criado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar processo."),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DealFormValues }) => updateDeal(id, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["audit-logs", variables.id] });
      qc.invalidateQueries({ queryKey: ["deal", variables.id] });
      toast.success("Processo atualizado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar processo."),
  });
}

export function useMoveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; category: DealCategory; status: string }) => moveDeal(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["deals"] });
      const previous = qc.getQueriesData({ queryKey: ["deals"] });
      qc.setQueriesData({ queryKey: ["deals"] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((d) =>
          d.id === input.id ? { ...d, category: input.category, status: input.status } : d
        );
      });
      return { previous };
    },
    onError: (err: Error, _input, context) => {
      context?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err.message || "Erro ao mover processo.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Processo excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir processo."),
  });
}
