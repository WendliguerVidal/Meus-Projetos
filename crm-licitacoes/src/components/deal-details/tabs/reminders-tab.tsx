"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
  useSetReminderStatus,
} from "@/hooks/use-reminders";
import { useAssignableUsers } from "@/hooks/use-deal-details";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";

const formSchema = z.object({
  assignedToId: z.string().min(1, "Selecione um responsável"),
  dueDate: z.string().min(1, "Informe a data"),
  description: z.string().min(2, "Descrição obrigatória"),
});
type FormValues = z.infer<typeof formSchema>;

type Reminder = {
  id: string;
  description: string;
  dueDate: Date | string;
  status: string;
  assignedToId: string;
  assignedTo: { name: string };
};

const emptyValues: FormValues = { assignedToId: "", dueDate: "", description: "" };

export function RemindersTab({ dealId }: { dealId: string }) {
  const { data: reminders, isLoading } = useReminders(dealId);
  const { data: users } = useAssignableUsers();
  const { mutate: create, isPending: creating } = useCreateReminder();
  const { mutate: update, isPending: updating } = useUpdateReminder(dealId);
  const { mutate: remove } = useDeleteReminder(dealId);
  const { mutate: setStatus } = useSetReminderStatus(dealId);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Reminder | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyValues });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset(emptyValues);
  };

  const openNewForm = () => {
    reset(emptyValues);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (reminder: Reminder) => {
    reset({
      assignedToId: reminder.assignedToId,
      dueDate: new Date(reminder.dueDate).toISOString().slice(0, 10),
      description: reminder.description,
    });
    setEditingId(reminder.id);
    setShowForm(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      update({ id: editingId, ...data }, { onSuccess: closeForm });
    } else {
      create({ dealId, ...data }, { onSuccess: closeForm });
    }
  };

  const pending = reminders?.filter((r) => r.status === "PENDING") ?? [];
  const done = reminders?.filter((r) => r.status === "DONE") ?? [];

  const rowProps = {
    onToggle: (r: Reminder, checked: boolean) => setStatus({ id: r.id, status: checked ? "DONE" : "PENDING" }),
    onEdit: openEditForm,
    onDelete: (r: Reminder) => setDeleteTarget(r),
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openNewForm}>
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
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={creating || updating}>
              {editingId ? "Salvar Alterações" : "Salvar Lembrete"}
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
            <ReminderRow
              key={r.id}
              reminder={r}
              onToggle={(checked) => rowProps.onToggle(r, checked)}
              onEdit={() => rowProps.onEdit(r)}
              onDelete={() => rowProps.onDelete(r)}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Concluídos</p>
          {done.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              onToggle={(checked) => rowProps.onToggle(r, checked)}
              onEdit={() => rowProps.onEdit(r)}
              onDelete={() => rowProps.onDelete(r)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir lembrete"
        description={`Tem certeza que deseja excluir o lembrete "${deleteTarget?.description}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          if (!deleteTarget) return;
          remove(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

function ReminderRow({
  reminder,
  onToggle,
  onEdit,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
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
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
