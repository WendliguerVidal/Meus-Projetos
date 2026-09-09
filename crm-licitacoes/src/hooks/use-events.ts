"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCalendarItems, createEvent, updateEvent, deleteEvent, type CalendarFilters } from "@/app/actions/events";
import type { EventFormValues } from "@/types/event";
import { dateKey } from "@/lib/calendar-utils";

function calendarQueryKey(filters: CalendarFilters) {
  return [
    "calendar-items",
    dateKey(filters.start),
    dateKey(filters.end),
    filters.statuses?.slice().sort().join(",") ?? "",
    filters.dealCategories?.slice().sort().join(",") ?? "",
  ] as const;
}

export function useCalendarItems(filters: CalendarFilters) {
  return useQuery({
    queryKey: calendarQueryKey(filters),
    queryFn: () => listCalendarItems(filters),
  });
}

// As Server Actions de mutação nunca lançam — retornam { success, ... }. Os wrappers
// abaixo convertem uma resposta { success: false, error } de volta numa Promise
// rejeitada, para que o fluxo onSuccess/onError do React Query continue funcionando
// sem precisar mudar cada tela que já consome esses hooks.

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EventFormValues) => {
      const result = await createEvent(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-items"] });
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Evento criado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar evento."),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: EventFormValues }) => {
      const result = await updateEvent(id, input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-items"] });
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Evento atualizado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar evento."),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteEvent(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-items"] });
      qc.invalidateQueries({ queryKey: ["urgent-items"] });
      toast.success("Evento excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir evento."),
  });
}
