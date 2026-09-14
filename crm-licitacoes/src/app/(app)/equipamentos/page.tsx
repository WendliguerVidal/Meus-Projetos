"use client";

import * as React from "react";
import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EquipmentCard, type EquipmentWithFields } from "@/components/equipment/equipment-card";
import { useEquipmentList, useEquipmentFieldTemplates } from "@/hooks/use-equipment";
import { useSearch } from "@/components/layout/search-context";

/** Cadastro de Equipamentos — catálogo de máquinas/equipamentos da empresa, exibido como
 * grade de cards (capa = Equipamento + Modelo, clicar expande para editar as
 * características). Alimenta as sugestões de Objeto/Equipamento e Modelo no formulário
 * de Itens do Processo (ver DealForm + ComboboxInput). */
export default function EquipamentosPage() {
  const { data: equipmentList, isLoading } = useEquipmentList();
  const { data: fieldTemplates } = useEquipmentFieldTemplates();
  const { search } = useSearch();

  // "new" = o card de cadastro em branco está aberto; string = id do card existente aberto;
  // null = nenhum card expandido. Só um card por vez fica expandido.
  const [expandedId, setExpandedId] = React.useState<string | "new" | null>(null);

  const fieldTemplateLabels = React.useMemo(() => (fieldTemplates ?? []).map((t) => t.label), [fieldTemplates]);

  const visibleEquipment = React.useMemo(() => {
    const list = equipmentList ?? [];
    if (!search.trim()) return list;
    const term = search.trim().toLowerCase();
    return list.filter(
      (e) => e.object.toLowerCase().includes(term) || (e.model ?? "").toLowerCase().includes(term)
    );
  }, [equipmentList, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Cadastro de Equipamentos</h1>
            <p className="text-sm text-muted-foreground">
              Catálogo de máquinas e equipamentos — usado para preencher rapidamente os Itens do Processo.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setExpandedId("new")}
          size="sm"
          className="shrink-0 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Cadastrar Novo Equipamento
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && visibleEquipment.length === 0 && expandedId !== "new" && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {search.trim()
            ? "Nenhum equipamento encontrado."
            : 'Nenhum equipamento cadastrado ainda. Clique em "Cadastrar Novo Equipamento" para começar.'}
        </p>
      )}

      {!isLoading && (visibleEquipment.length > 0 || expandedId === "new") && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {expandedId === "new" && (
            <EquipmentCard
              equipment={null}
              isExpanded
              onExpand={() => {}}
              onCollapse={() => setExpandedId(null)}
              fieldTemplateLabels={fieldTemplateLabels}
            />
          )}
          {visibleEquipment.map((equipment: EquipmentWithFields) => (
            <EquipmentCard
              key={equipment.id}
              equipment={equipment}
              isExpanded={expandedId === equipment.id}
              onExpand={() => setExpandedId(equipment.id)}
              onCollapse={() => setExpandedId(null)}
              fieldTemplateLabels={fieldTemplateLabels}
            />
          ))}
        </div>
      )}
    </div>
  );
}
