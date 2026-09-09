"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MiniMonth } from "./mini-month";
import { dateKey, getYearMonths, groupItemsByDay } from "@/lib/calendar-utils";
import type { CalendarItem } from "@/types/event";

export function YearView({
  currentDate,
  items,
  onSelectDay,
  onSelectMonth,
}: {
  currentDate: Date;
  items: CalendarItem[];
  /** Clicar num dia específico do mini-calendário → abre a visão Dia. */
  onSelectDay: (day: Date) => void;
  /** Clicar no nome do mês → abre a visão Mês. */
  onSelectMonth: (month: Date) => void;
}) {
  const months = React.useMemo(() => getYearMonths(currentDate), [currentDate]);
  const byDay = React.useMemo(() => groupItemsByDay(items), [items]);
  const today = React.useMemo(() => new Date(), []);

  return (
    <div className="grid grid-cols-2 gap-6 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {months.map((month) => (
        <div key={month.toISOString()}>
          <button
            type="button"
            onClick={() => onSelectMonth(month)}
            className="mb-1.5 block text-sm font-semibold capitalize text-foreground hover:text-primary"
          >
            {format(month, "MMMM", { locale: ptBR })}
          </button>
          <MiniMonth
            month={month}
            today={today}
            onSelectDay={onSelectDay}
            hasItems={(day) => (byDay.get(dateKey(day))?.length ?? 0) > 0}
            size="xs"
          />
        </div>
      ))}
    </div>
  );
}
