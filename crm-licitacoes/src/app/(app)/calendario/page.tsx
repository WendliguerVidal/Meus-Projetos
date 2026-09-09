"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { YearView } from "@/components/calendar/year-view";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { useCalendarItems } from "@/hooks/use-events";
import { rangeForView, type CalendarView } from "@/lib/calendar-utils";
import { EVENT_STATUSES, type CalendarItem, type EventStatus } from "@/types/event";

export default function CalendarioPage() {
  const [view, setView] = React.useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [visibleStatuses, setVisibleStatuses] = React.useState<EventStatus[]>([...EVENT_STATUSES]);
  const [showDealDeadlines, setShowDealDeadlines] = React.useState(true);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formEditing, setFormEditing] = React.useState<CalendarItem | null>(null);
  const [formDefaultDate, setFormDefaultDate] = React.useState<Date | null>(null);

  const range = React.useMemo(() => rangeForView(view, currentDate), [view, currentDate]);
  const { data: items, isLoading } = useCalendarItems({
    start: range.start,
    end: range.end,
    statuses: visibleStatuses,
    includeDealDeadlines: showDealDeadlines,
  });

  const toggleStatus = (status: EventStatus) => {
    setVisibleStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  };

  const openCreateDialog = (date?: Date) => {
    setFormEditing(null);
    setFormDefaultDate(date ?? currentDate);
    setFormOpen(true);
  };

  const openEditDialog = (item: CalendarItem) => {
    if (item.kind !== "event") return;
    setFormEditing(item);
    setFormDefaultDate(null);
    setFormOpen(true);
  };

  const goToDay = (day: Date) => {
    setCurrentDate(day);
  };

  const goToDayView = (day: Date) => {
    setCurrentDate(day);
    setView("day");
  };

  const goToMonthView = (month: Date) => {
    setCurrentDate(month);
    setView("month");
  };

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] md:-m-6">
      <CalendarSidebar
        currentDate={currentDate}
        onSelectDay={goToDay}
        visibleStatuses={visibleStatuses}
        onToggleStatus={toggleStatus}
        showDealDeadlines={showDealDeadlines}
        onToggleDealDeadlines={setShowDealDeadlines}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <CalendarHeader
          view={view}
          onViewChange={setView}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onCreateEvent={() => openCreateDialog()}
        />

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-full min-h-[60vh] w-full" />
            </div>
          ) : (
            <>
              {view === "month" && (
                <MonthView currentDate={currentDate} items={items ?? []} onDayClick={openCreateDialog} onEditItem={openEditDialog} />
              )}
              {view === "week" && (
                <WeekView currentDate={currentDate} items={items ?? []} onDayClick={openCreateDialog} onEditItem={openEditDialog} />
              )}
              {view === "day" && (
                <DayView currentDate={currentDate} items={items ?? []} onDayClick={openCreateDialog} onEditItem={openEditDialog} />
              )}
              {view === "year" && (
                <YearView currentDate={currentDate} items={items ?? []} onSelectDay={goToDayView} onSelectMonth={goToMonthView} />
              )}
            </>
          )}
        </div>
      </div>

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} editing={formEditing} defaultDate={formDefaultDate} />
    </div>
  );
}
