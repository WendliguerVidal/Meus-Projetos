"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, initials, isOverdue } from "@/lib/utils";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import type { DealWithRelations } from "@/types";
import { MapPin, CalendarClock } from "lucide-react";

export function KanbanCard({ deal }: { deal: DealWithRelations }) {
  const { openDeal } = useDealUI();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  const overdue = isOverdue(deal.deadline) && !["GANHO", "PERDIDO", "CONCLUIDO", "ARQUIVADO"].includes(deal.category);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => openDeal(deal.id)}
      className={cn(
        "cursor-grab touch-none select-none shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-60 shadow-lg"
      )}
    >
      <CardContent className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{deal.title}</p>
        <p className="truncate text-xs text-muted-foreground">{deal.client}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {deal.city}/{deal.state}
          </span>
        </div>
        {deal.deadline && (
          <div className={cn("flex items-center gap-1 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
            <CalendarClock className="h-3 w-3" />
            <span>{formatDate(deal.deadline)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className="text-[10px]">
            {deal.status}
          </Badge>
          {deal.assignedTo && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">{initials(deal.assignedTo.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
