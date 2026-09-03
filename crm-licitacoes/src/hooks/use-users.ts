"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listUsers, createUser, updateUser, deleteUser } from "@/app/actions/users";
import type { UserFormValues } from "@/types/deal";

export function useUsers() {
  return useQuery({ queryKey: ["users", "all"], queryFn: () => listUsers() });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserFormValues) => createUser(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário criado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar usuário."),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserFormValues }) => updateUser(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário atualizado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar usuário."),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir usuário."),
  });
}
