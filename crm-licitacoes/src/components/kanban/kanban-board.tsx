"use client";

import * as React from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { useMoveDeal } from "@/hooks/use-deals";
import { CATEGORY_COLORS, CATEGORY_STATUSES } from "@/types/deal";
import type { DealWithRelations, DealCategory } from "@/types";

export function KanbanBoard({ deals, category }: { deals: DealWithRelations[]; category: DealCategory }) {
  const { mutate: moveDeal } = useMoveDeal();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const statuses = CATEGORY_STATUSES[category] ?? [];
  const dealsByStatus = React.useMemo(() => {
    const map = new Map<string, DealWithRelations[]>();
    for (const status of statuses) map.set(status, []);
    for (const deal of deals) {
      if (deal.category !== category) continue;
      const list = map.get(deal.status);
      if (list) list.push(deal);
      else map.set(deal.status, [deal]);
    }
    return map;
  }, [deals, category, statuses]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const newStatus = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.status === newStatus) return;

    if (category === "PERDIDO" && !deal.lossReason) {
      return; // motivo da perda deve ser preenchido via formulário antes de mover
    }

    moveDeal({ id: dealId, category, status: newStatus });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            color={CATEGORY_COLORS[category]}
            deals={dealsByStatus.get(status) ?? []}
          />
        ))}
      </div>
    </DndContext>
  );
}
