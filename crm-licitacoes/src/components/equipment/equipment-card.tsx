"use client";

import * as React from "react";
import { Wrench, Trash2, Plus, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from "@/hooks/use-equipment";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { cn } from "@/lib/utils";
import type { EquipmentFormValues } from "@/types/equipment";

export type EquipmentWithFields = {
  id: string;
  object: string;
  model: string | null;
  fields: { id: string; label: string; value: string | null; order: number }[];
};

type FieldRow = { id?: string; label: string; value: string };

/** Um card do Cadastro de Equipamentos — recolhido mostra só Equipamento/Modelo (a
 * "capa"); expandido vira um formulário com todas as características, editáveis livre-
 * mente. `equipment === null` representa um card novo ainda não salvo (rascunho). */
export function EquipmentCard({
  equipment,
  isExpanded,
  onExpand,
  onCollapse,
  fieldTemplateLabels,
}: {
  equipment: EquipmentWithFields | null;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  /** Nomes de campos já usados em outros equipamentos — pré-preenche (valor vazio) um
   * card NOVO, só na primeira vez que é aberto (ver EquipmentFieldTemplate). */
  fieldTemplateLabels: string[];
}) {
  const isNew = equipment === null;
  const isAdmin = useIsAdmin();
  const { mutate: create, isPending: creating } = useCreateEquipment();
  const { mutate: update, isPending: updating } = useUpdateEquipment();
  const { mutate: remove, isPending: deleting } = useDeleteEquipment();
  const saving = creating || updating;

  const buildInitialFields = React.useCallback((): FieldRow[] => {
    if (equipment) return equipment.fields.map((f) => ({ id: f.id, label: f.label, value: f.value ?? "" }));
    return fieldTemplateLabels.map((label) => ({ label, value: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment]);

  const [object, setObject] = React.useState(equipment?.object ?? "");
  const [model, setModel] = React.useState(equipment?.model ?? "");
  const [fields, setFields] = React.useState<FieldRow[]>(buildInitialFields);
  const [objectError, setObjectError] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(false);

  const cardRef = React.useRef<HTMLDivElement>(null);

  // Sempre que o card é (re)aberto, começa do zero a partir do que está salvo — evita
  // que uma edição abandonada numa abertura anterior "vaze" para a próxima.
  React.useEffect(() => {
    if (!isExpanded) return;
    setObject(equipment?.object ?? "");
    setModel(equipment?.model ?? "");
    setFields(buildInitialFields());
    setObjectError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // Clicar fora da área do card recolhe — mas nunca enquanto o diálogo de confirmação
  // de exclusão está aberto (ele é renderizado fora desta div via portal).
  React.useEffect(() => {
    if (!isExpanded || pendingDelete) return;
    function handlePointerDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onCollapse();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isExpanded, pendingDelete, onCollapse]);

  const updateField = (index: number, patch: Partial<FieldRow>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };
  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };
  const addField = () => {
    setFields((prev) => [...prev, { label: "", value: "" }]);
  };

  const handleSave = () => {
    const trimmedObject = object.trim();
    if (!trimmedObject) {
      setObjectError(true);
      return;
    }
    const payload: EquipmentFormValues = {
      object: trimmedObject,
      model: model.trim(),
      // Campo sem nome não faz sentido salvar — descarta silenciosamente linhas em
      // branco deixadas por "Novo Campo" ou pelos campos pré-preenchidos não usados.
      fields: fields.filter((f) => f.label.trim().length > 0).map((f) => ({ id: f.id, label: f.label.trim(), value: f.value })),
    };

    if (isNew) {
      create(payload, { onSuccess: () => onCollapse() });
    } else {
      update({ id: equipment.id, input: payload }, { onSuccess: () => onCollapse() });
    }
  };

  // --- Recolhido: só a "capa" (Equipamento + Modelo) ---
  if (!isExpanded) {
    return (
      <Card className="group relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
        <button
          type="button"
          onClick={onExpand}
          className="flex flex-col items-start gap-3 text-left"
          aria-label={`Editar equipamento ${equipment?.object ?? ""}`}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wrench className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{equipment?.object}</span>
            <span className="block truncate text-xs text-muted-foreground">{equipment?.model || "Sem modelo informado"}</span>
          </span>
        </button>

        {isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 text-destructive/70 opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            onClick={() => setPendingDelete(true)}
            aria-label="Excluir equipamento"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}

        <ConfirmDialog
          open={pendingDelete}
          onOpenChange={setPendingDelete}
          title="Excluir equipamento"
          description={`Tem certeza que deseja excluir "${equipment?.object}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          loading={deleting}
          onConfirm={() => equipment && remove(equipment.id, { onSuccess: () => setPendingDelete(false) })}
        />
      </Card>
    );
  }

  // --- Expandido: formulário completo ---
  return (
    <Card
      ref={cardRef}
      className="col-span-full flex flex-col gap-3 p-4 ring-1 ring-inset ring-primary/30 sm:col-span-2 lg:col-span-3"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wrench className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCollapse} aria-label="Fechar edição">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="equipment-object" className="text-xs">
            Equipamento *
          </Label>
          <Input
            id="equipment-object"
            placeholder="Ex: Retroescavadeira"
            value={object}
            onChange={(e) => {
              setObject(e.target.value);
              if (e.target.value.trim()) setObjectError(false);
            }}
          />
          {objectError && <p className="text-xs text-destructive">Informe o equipamento.</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="equipment-model" className="text-xs">
            Modelo
          </Label>
          <Input id="equipment-model" placeholder="Ex: BHL75C" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Características</p>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addField}>
            <Plus className="h-3 w-3" />
            Novo Campo
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma característica adicionada.</p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id ?? `novo-${index}`} className="flex items-start gap-1.5">
                <Input
                  placeholder="Nome do campo (ex: Potência)"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="h-8 flex-1 text-xs font-medium"
                />
                <Input
                  placeholder="Valor"
                  value={field.value}
                  onChange={(e) => updateField(index, { value: e.target.value })}
                  className="h-8 flex-[1.4] text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeField(index)}
                  aria-label="Remover campo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn("flex items-center gap-2", isNew ? "justify-end" : "justify-between")}>
        {!isNew && isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setPendingDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir Equipamento
          </Button>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCollapse}>
            Cancelar
          </Button>
          <Button type="button" size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete}
        onOpenChange={setPendingDelete}
        title="Excluir equipamento"
        description={`Tem certeza que deseja excluir "${equipment?.object ?? object}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={() => equipment && remove(equipment.id, { onSuccess: () => setPendingDelete(false) })}
      />
    </Card>
  );
}
