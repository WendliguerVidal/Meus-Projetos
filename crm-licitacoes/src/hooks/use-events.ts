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

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventFormValues) => createEvent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-items"] });
      toast.success("Evento criado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar evento."),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EventFormValues }) => updateEvent(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-items"] });
      toast.success("Evento atualizado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar evento."),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-items"] });
      toast.success("Evento excluído.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir evento."),
  });
}
