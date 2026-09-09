"use client";

import * as React from "react";
import { MiniMonth } from "./mini-month";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { EVENT_STATUSES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, type EventStatus } from "@/types/event";
import { NON_ARCHIVED_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, type DealCategory } from "@/types/deal";

export function CalendarSidebar({
  currentDate,
  onSelectDay,
  visibleStatuses,
  onToggleStatus,
  visibleDealCategories,
  onToggleDealCategory,
}: {
  currentDate: Date;
  onSelectDay: (day: Date) => void;
  visibleStatuses: EventStatus[];
  onToggleStatus: (status: EventStatus) => void;
  visibleDealCategories: DealCategory[];
  onToggleDealCategory: (category: DealCategory) => void;
}) {
  const today = React.useMemo(() => new Date(), []);
  const [miniMonth, setMiniMonth] = React.useState(currentDate);

  // Acompanha a data principal quando ela muda por outro meio (header, popover, etc.).
  React.useEffect(() => {
    setMiniMonth(currentDate);
  }, [currentDate.getFullYear(), currentDate.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r bg-background p-4 lg:flex">
      <MiniMonth
        month={miniMonth}
        onMonthChange={setMiniMonth}
        selectedDate={currentDate}
        today={today}
        onSelectDay={onSelectDay}
      />

      <Separator />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros</p>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Processos (licitações)</p>
          {NON_ARCHIVED_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={visibleDealCategories.includes(category)}
                onCheckedChange={() => onToggleDealCategory(category)}
              />
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Eventos do calendário</p>
          {EVENT_STATUSES.map((status) => (
            <label key={status} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={visibleStatuses.includes(status)} onCheckedChange={() => onToggleStatus(status)} />
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: EVENT_STATUS_COLORS[status] }} />
              {EVENT_STATUS_LABELS[status]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
