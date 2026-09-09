"use client";

import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dateKey, getMonthGridDays, groupItemsByDay, isSameDay, isSameMonth } from "@/lib/calendar-utils";
import { EventChip } from "./event-chip";
import type { CalendarItem } from "@/types/event";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_VISIBLE = 3;

export function MonthView({
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
  const days = React.useMemo(() => getMonthGridDays(currentDate), [currentDate]);
  const byDay = React.useMemo(() => groupItemsByDay(items), [items]);
  const today = React.useMemo(() => new Date(), []);

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const dayItems = byDay.get(dateKey(day)) ?? [];
          const visible = dayItems.slice(0, MAX_VISIBLE);
          const overflow = dayItems.length - visible.length;
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);

          return (
            <div
              role="button"
              tabIndex={0}
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onDayClick(day)}
              className={cn(
                "flex min-h-[6rem] cursor-pointer flex-col gap-0.5 border-b border-r p-1.5 text-left align-top outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40",
                !inMonth && "bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-foreground",
                  !inMonth && "text-muted-foreground",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {day.getDate()}
              </span>

              <div className="space-y-0.5">
                {visible.map((item) => (
                  <EventChip key={item.id} item={item} variant="block" onEdit={onEditItem} />
                ))}
              </div>

              {overflow > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer px-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      +{overflow} mais
                    </span>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
                    <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
                      {day.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                    </p>
                    {dayItems.map((item) => (
                      <EventChip key={item.id} item={item} variant="card" onEdit={onEditItem} />
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
