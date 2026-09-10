"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, Plus, Trash2 } from "lucide-react";

const emptyDefaults: DealFormValues = {
  title: "",
  client: "",
  city: "",
  state: "MG",
  items: [],
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
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: mergedDefaults,
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
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

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">Itens do Processo</Label>
            <p className="text-xs text-muted-foreground">
              Objeto/equipamento, modelo, lote e quantidade — adicione quantos itens forem necessários.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => appendItem({ object: "", model: "", lot: "", quantity: 1 })}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Item
          </Button>
        </div>

        {itemFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum item adicionado.</p>
        ) : (
          <div className="space-y-3">
            {itemFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[2fr_1.5fr_1fr_0.8fr_auto] sm:items-end"
              >
                <div className="space-y-1">
                  <Label htmlFor={`items.${index}.object`} className="text-xs">
                    Objeto / Equipamento *
                  </Label>
                  <Input
                    id={`items.${index}.object`}
                    placeholder="Ex: Retroescavadeira"
                    {...register(`items.${index}.object` as const)}
                  />
                  {errors.items?.[index]?.object && (
                    <p className="text-xs text-destructive">{errors.items[index]?.object?.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`items.${index}.model`} className="text-xs">
                    Modelo
                  </Label>
                  <Input
                    id={`items.${index}.model`}
                    placeholder="Ex: BHL75C"
                    {...register(`items.${index}.model` as const)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`items.${index}.lot`} className="text-xs">
                    Lote
                  </Label>
                  <Input
                    id={`items.${index}.lot`}
                    placeholder="Ex: Lote 01"
                    {...register(`items.${index}.lot` as const)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`items.${index}.quantity`} className="text-xs">
                    Qtd. *
                  </Label>
                  <Input
                    id={`items.${index}.quantity`}
                    type="number"
                    min={1}
                    step={1}
                    {...register(`items.${index}.quantity` as const)}
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-xs text-destructive">{errors.items[index]?.quantity?.message}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeItem(index)}
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
