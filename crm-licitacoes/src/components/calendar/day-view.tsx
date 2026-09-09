"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateKey, groupItemsByDay } from "@/lib/calendar-utils";
import { EventChip } from "./event-chip";
import type { CalendarItem } from "@/types/event";

export function DayView({
  currentDate,
  items,
  onDayClick,
  onEditItem,
}: {
  currentDate: Date;
  items: CalendarItem[];
  onDayClick: (day: Date) => void;
  onEditItem: (item: CalendarItem) => void;
}) {
  const byDay = React.useMemo(() => groupItemsByDay(items), [items]);
  const dayItems = React.useMemo(
    () => (byDay.get(dateKey(currentDate)) ?? []).sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [byDay, currentDate]
  );

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm capitalize text-muted-foreground">
          {format(currentDate, "EEEE", { locale: ptBR })}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onDayClick(currentDate)}>
          <CalendarPlus className="h-3.5 w-3.5" />
          Novo neste dia
        </Button>
      </div>

      {dayItems.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum evento ou prazo neste dia.</p>
      ) : (
        <div className="space-y-2">
          {dayItems.map((item) => (
            <EventChip key={item.id} item={item} variant="card" onEdit={onEditItem} />
          ))}
        </div>
      )}
    </div>
  );
}
