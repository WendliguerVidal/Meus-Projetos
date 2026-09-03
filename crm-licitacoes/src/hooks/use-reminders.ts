"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listReminders,
  listTodayReminders,
  createReminder,
  setReminderStatus,
} from "@/app/actions/reminders";

export function useReminders(dealId: string) {
  return useQuery({
    queryKey: ["reminders", dealId],
    queryFn: () => listReminders(dealId),
    enabled: !!dealId,
  });
}

export function useTodayReminders() {
  return useQuery({
    queryKey: ["reminders", "today"],
    queryFn: () => listTodayReminders(),
    refetchInterval: 60_000,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReminder,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reminders", variables.dealId] });
      qc.invalidateQueries({ queryKey: ["reminders", "today"] });
      toast.success("Lembrete criado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar lembrete."),
  });
}

export function useSetReminderStatus(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setReminderStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", dealId] });
      qc.invalidateQueries({ queryKey: ["reminders", "today"] });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar lembrete."),
  });
}
