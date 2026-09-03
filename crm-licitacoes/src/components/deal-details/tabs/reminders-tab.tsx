"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useReminders, useCreateReminder, useSetReminderStatus } from "@/hooks/use-reminders";
import { useAssignableUsers } from "@/hooks/use-deal-details";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { Plus } from "lucide-react";

const formSchema = z.object({
  assignedToId: z.string().min(1, "Selecione um responsável"),
  dueDate: z.string().min(1, "Informe a data"),
  description: z.string().min(2, "Descrição obrigatória"),
});
type FormValues = z.infer<typeof formSchema>;

export function RemindersTab({ dealId }: { dealId: string }) {
  const { data: reminders, isLoading } = useReminders(dealId);
  const { data: users } = useAssignableUsers();
  const { mutate: create, isPending } = useCreateReminder();
  const { mutate: setStatus } = useSetReminderStatus(dealId);
  const [showForm, setShowForm] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { assignedToId: "", dueDate: "", description: "" } });

  const onSubmit = (data: FormValues) => {
    create(
      { dealId, assignedToId: data.assignedToId, dueDate: new Date(data.dueDate), description: data.description },
      {
        onSuccess: () => {
          reset();
          setShowForm(false);
        },
      }
    );
  };

  const pending = reminders?.filter((r) => r.status === "PENDING") ?? [];
  const done = reminders?.filter((r) => r.status === "DONE") ?? [];

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo Lembrete
        </Button>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={watch("assignedToId")} onValueChange={(v) => setValue("assignedToId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assignedToId && <p className="text-xs text-destructive">{errors.assignedToId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Data</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={2} {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              Salvar Lembrete
            </Button>
          </div>
        </form>
      )}

      {isLoading && <Skeleton className="h-20 w-full" />}

      {!isLoading && reminders?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lembrete cadastrado.</p>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Pendentes</p>
          {pending.map((r) => (
            <ReminderRow key={r.id} reminder={r} onToggle={(checked) => setStatus({ id: r.id, status: checked ? "DONE" : "PENDING" })} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Concluídos</p>
          {done.map((r) => (
            <ReminderRow key={r.id} reminder={r} onToggle={(checked) => setStatus({ id: r.id, status: checked ? "DONE" : "PENDING" })} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderRow({
  reminder,
  onToggle,
}: {
  reminder: { id: string; description: string; dueDate: Date; status: string; assignedTo: { name: string } };
  onToggle: (checked: boolean) => void;
}) {
  const overdue = reminder.status === "PENDING" && isOverdue(reminder.dueDate);
  return (
    <div className="flex items-start gap-3 rounded-md border p-2.5">
      <Checkbox checked={reminder.status === "DONE"} onCheckedChange={(c) => onToggle(!!c)} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", reminder.status === "DONE" && "text-muted-foreground line-through")}>
          {reminder.description}
        </p>
        <p className={cn("text-xs text-muted-foreground", overdue && "font-medium text-destructive")}>
          {reminder.assignedTo.name} · {formatDate(reminder.dueDate)}
          {overdue && " (atrasado)"}
        </p>
      </div>
    </div>
  );
}
