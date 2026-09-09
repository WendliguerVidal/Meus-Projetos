"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventSchema, type EventFormValues, EVENT_STATUSES, EVENT_STATUS_LABELS } from "@/types/event";
import type { CalendarItem } from "@/types/event";
import { useCreateEvent, useUpdateEvent } from "@/hooks/use-events";
import { useDeals } from "@/hooks/use-deals";

function toLocalInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function defaultStartFor(date: Date | null | undefined): Date {
  const base = date ? new Date(date) : new Date();
  base.setHours(9, 0, 0, 0);
  return base;
}

export function EventFormDialog({
  open,
  onOpenChange,
  editing,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item sendo editado (kind === "event") — presença define o modo edição. */
  editing?: CalendarItem | null;
  /** Data pré-selecionada ao criar um evento a partir de um clique em um dia vago. */
  defaultDate?: Date | null;
}) {
  const isEditing = !!editing;
  const { mutate: create, isPending: creating } = useCreateEvent();
  const { mutate: update, isPending: updating } = useUpdateEvent();
  const { data: deals } = useDeals();
  const [hasEndDate, setHasEndDate] = React.useState(!!editing?.endDate);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: defaultStartFor(defaultDate),
      endDate: null,
      status: "ABERTO",
      estimatedValue: null,
      dealId: null,
    },
  });

  // Reseta o formulário sempre que o modal abre — cobre tanto "editar X" quanto
  // "criar novo no dia Y" com valores corretos a cada abertura.
  React.useEffect(() => {
    if (!open) return;
    setHasEndDate(!!editing?.endDate);
    // Inputs type="datetime-local" exigem string "yyyy-MM-ddTHH:mm" — convertemos aqui
    // (o valor final é convertido de volta para Date pelo schema Zod no submit).
    reset({
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      startDate: toLocalInputValue(editing?.startDate ?? defaultStartFor(defaultDate)) as unknown as EventFormValues["startDate"],
      endDate: (editing?.endDate ? toLocalInputValue(editing.endDate) : "") as unknown as EventFormValues["endDate"],
      status: editing?.status ?? "ABERTO",
      estimatedValue: editing?.estimatedValue ?? null,
      dealId: editing?.dealId ?? null,
    });
  }, [open, editing, defaultDate, reset]);

  const status = watch("status");
  const dealId = watch("dealId");

  const onSubmit = (data: EventFormValues) => {
    const payload = { ...data, endDate: hasEndDate ? data.endDate : null };
    if (isEditing && editing) {
      update({ id: editing.id, input: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const pending = creating || updating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Evento" : "Criar Evento"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do compromisso no calendário."
              : "Cadastre um compromisso, reunião ou marco importante no calendário."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Título *</Label>
            <Input id="event-title" placeholder="Ex: Sessão de abertura do Pregão 012/2026" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Data e Hora de Início *</Label>
              <Input id="event-start" type="datetime-local" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="event-end">Data e Hora de Término</Label>
                {hasEndDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasEndDate(false);
                      setValue("endDate", null);
                    }}
                    className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                    remover
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHasEndDate(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    + adicionar
                  </button>
                )}
              </div>
              {hasEndDate ? (
                <Input id="event-end" type="datetime-local" {...register("endDate")} />
              ) : (
                <div className="flex h-9 items-center text-sm text-muted-foreground/60">Sem término definido</div>
              )}
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria / Status *</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as EventFormValues["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {EVENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-value">Valor Estimado (R$)</Label>
              <Input id="event-value" type="number" step="0.01" min="0" placeholder="0,00" {...register("estimatedValue")} />
              {errors.estimatedValue && <p className="text-xs text-destructive">{errors.estimatedValue.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Processo / Licitação vinculada (opcional)</Label>
            <Select value={dealId ?? "none"} onValueChange={(v) => setValue("dealId", v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum processo vinculado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {deals?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title} — {d.client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description">Descrição / Observações</Label>
            <Textarea id="event-description" rows={3} placeholder="Detalhes, pauta, local, contatos..." {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="gap-1.5">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
