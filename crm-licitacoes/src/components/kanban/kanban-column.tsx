"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { DealWithRelations } from "@/types";

export function KanbanColumn({
  status,
  color,
  deals,
}: {
  status: string;
  color: string;
  deals: DealWithRelations[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="truncate text-sm font-semibold">{status}</h3>
        <span className="ml-auto rounded-full bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
          {deals.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors min-h-[120px]",
          isOver && "bg-primary/5"
        )}
      >
        {deals.map((deal) => (
          <KanbanCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhum processo</p>
        )}
      </div>
    </div>
  );
}
