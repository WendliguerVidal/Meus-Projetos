"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { dateKey, getWeekDays, groupItemsByDay, isSameDay } from "@/lib/calendar-utils";
import { EventChip } from "./event-chip";
import type { CalendarItem } from "@/types/event";

export function WeekView({
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
  const days = React.useMemo(() => getWeekDays(currentDate), [currentDate]);
  const byDay = React.useMemo(() => groupItemsByDay(items), [items]);
  const today = React.useMemo(() => new Date(), []);

  return (
    <div className="grid h-full grid-cols-7 divide-x">
      {days.map((day) => {
        const dayItems = (byDay.get(dateKey(day)) ?? []).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const isToday = isSameDay(day, today);

        return (
          <div key={day.toISOString()} className="flex min-h-0 flex-col">
            <div className={cn("flex flex-col items-center gap-0.5 border-b py-2", isToday && "bg-primary/5")}>
              <span className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</span>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {day.getDate()}
              </span>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onDayClick(day)}
              className="flex-1 cursor-pointer space-y-1.5 overflow-y-auto p-1.5 outline-none hover:bg-accent/20"
            >
              {dayItems.map((item) => (
                <EventChip key={item.id} item={item} variant="card" onEdit={onEditItem} />
              ))}
              {dayItems.length === 0 && (
                <p className="px-1 pt-2 text-center text-[11px] text-muted-foreground/60">Sem eventos</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
