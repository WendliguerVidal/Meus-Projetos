"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  dealSchema,
  type DealFormValues,
  DEAL_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_STATUSES,
  LOSS_REASONS,
  LOSS_REASON_LABELS,
  BRAZIL_STATES,
  defaultStatusFor,
} from "@/types/deal";
import { useAssignableUsers } from "@/hooks/use-deal-details";
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
import { Loader2 } from "lucide-react";

const emptyDefaults: DealFormValues = {
  title: "",
  client: "",
  city: "",
  state: "MG",
  equipment: "",
  model: "",
  serialNumber: "",
  category: "ANDAMENTO",
  status: defaultStatusFor("ANDAMENTO"),
  lossReason: null,
  lossDetail: "",
  deadline: null,
  assignedToId: null,
};

export function DealForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: {
  defaultValues?: Partial<DealFormValues>;
  onSubmit: (data: DealFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const { data: users } = useAssignableUsers();

  const mergedDefaults = React.useMemo(() => {
    const merged: DealFormValues = { ...emptyDefaults, ...defaultValues };
    // Inputs type="date" precisam de string "yyyy-MM-dd"; convertemos aqui para exibição inicial.
    const rawDeadline = defaultValues?.deadline as unknown;
    if (rawDeadline instanceof Date) {
      (merged as unknown as { deadline: string }).deadline = rawDeadline.toISOString().slice(0, 10);
    } else if (!rawDeadline) {
      (merged as unknown as { deadline: string | null }).deadline = null;
    }
    return merged;
  }, [defaultValues]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: mergedDefaults,
  });

  const category = watch("category");
  const state = watch("state");
  const status = watch("status");
  const assignedToId = watch("assignedToId");
  const lossReason = watch("lossReason");

  React.useEffect(() => {
    const validStatuses = CATEGORY_STATUSES[category] ?? [];
    if (!validStatuses.includes(status)) {
      setValue("status", defaultStatusFor(category));
    }
  }, [category, status, setValue]);

  return (
    <form
      id="deal-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">Título do Processo *</Label>
          <Input id="title" placeholder="Ex: Pregão 001/2026 - Equipamentos Hospitalares" {...register("title")} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client">Cliente *</Label>
          <Input id="client" placeholder="Ex: Prefeitura de Belo Horizonte" {...register("client")} />
          {errors.client && <p className="text-xs text-destructive">{errors.client.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade *</Label>
          <Input id="city" placeholder="Ex: Belo Horizonte" {...register("city")} />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>UF *</Label>
          <Select value={state} onValueChange={(v) => setValue("state", v as DealFormValues["state"])}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a UF" />
            </SelectTrigger>
            <SelectContent>
              {BRAZIL_STATES.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Select
            value={assignedToId ?? "none"}
            onValueChange={(v) => setValue("assignedToId", v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem responsável</SelectItem>
              {users?.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="equipment">Equipamento</Label>
          <Input id="equipment" placeholder="Ex: Autoclave" {...register("equipment")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" placeholder="Ex: AC-500" {...register("model")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serialNumber">Número de Série</Label>
          <Input id="serialNumber" placeholder="Ex: SN-2024-001" {...register("serialNumber")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline">Prazo</Label>
          <Input id="deadline" type="date" {...register("deadline")} />
        </div>

        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={category} onValueChange={(v) => setValue("category", v as DealFormValues["category"])}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {DEAL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={status} onValueChange={(v) => setValue("status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {(CATEGORY_STATUSES[category] ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
        </div>

        {category === "PERDIDO" && (
          <>
            <div className="space-y-1.5">
              <Label>Motivo da Perda *</Label>
              <Select
                value={lossReason ?? undefined}
                onValueChange={(v) => setValue("lossReason", v as DealFormValues["lossReason"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {LOSS_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {LOSS_REASON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.lossReason && <p className="text-xs text-destructive">{errors.lossReason.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lossDetail">Detalhe da Perda *</Label>
              <Textarea id="lossDetail" rows={3} placeholder="Descreva os detalhes da perda..." {...register("lossDetail")} />
              {errors.lossDetail && <p className="text-xs text-destructive">{errors.lossDetail.message}</p>}
            </div>
          </>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
