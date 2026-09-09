"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatViewTitle, navigateDate, type CalendarView } from "@/lib/calendar-utils";

const VIEW_LABELS: Record<CalendarView, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  year: "Ano",
};

export function CalendarHeader({
  view,
  onViewChange,
  currentDate,
  onDateChange,
  onCreateEvent,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onCreateEvent: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3">
      <Button onClick={onCreateEvent} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Criar Evento
      </Button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>
          Hoje
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDateChange(navigateDate(view, currentDate, -1))}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDateChange(navigateDate(view, currentDate, 1))}
          aria-label="Próximo"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <h1 className={cn("min-w-0 flex-1 truncate text-lg font-semibold capitalize")}>
        {formatViewTitle(view, currentDate)}
      </h1>

      <Tabs value={view} onValueChange={(v) => onViewChange(v as CalendarView)}>
        <TabsList>
          {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
            <TabsTrigger key={v} value={v}>
              {VIEW_LABELS[v]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
