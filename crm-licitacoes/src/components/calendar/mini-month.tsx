"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthGridDays, isSameDay, isSameMonth } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Mini-calendário mensal reutilizável (Sidebar e tiles da visão Ano). */
export function MiniMonth({
  month,
  onMonthChange,
  selectedDate,
  today,
  onSelectDay,
  hasItems,
  size = "sm",
}: {
  month: Date;
  onMonthChange?: (month: Date) => void;
  selectedDate?: Date | null;
  today: Date;
  onSelectDay: (day: Date) => void;
  hasItems?: (day: Date) => boolean;
  size?: "sm" | "xs";
}) {
  const days = React.useMemo(() => getMonthGridDays(month), [month]);

  return (
    <div className="select-none">
      {onMonthChange && (
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className={cn("font-medium capitalize", size === "sm" ? "text-sm" : "text-xs")}>
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="rounded p-0.5 hover:bg-sidebar-accent"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="rounded p-0.5 hover:bg-sidebar-accent"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className={cn("grid grid-cols-7 gap-y-0.5 text-center", size === "sm" ? "text-[11px]" : "text-[9px]")}>
        {WEEKDAY_LETTERS.map((d, i) => (
          <div key={i} className="text-sidebar-foreground/40">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={cn(
                "relative mx-auto flex items-center justify-center rounded-full transition-colors",
                size === "sm" ? "h-6 w-6" : "h-5 w-5",
                !inMonth && "text-sidebar-foreground/25",
                inMonth && !isSelected && "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                isToday && !isSelected && "text-primary font-semibold",
                isSelected && "bg-primary text-primary-foreground font-semibold"
              )}
            >
              {day.getDate()}
              {hasItems?.(day) && !isSelected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
