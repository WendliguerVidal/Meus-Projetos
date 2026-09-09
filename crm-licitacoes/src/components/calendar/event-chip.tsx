"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import { useDeleteEvent } from "@/hooks/use-events";
import type { CalendarItem } from "@/types/event";
import { Building2, Clock, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";

function formatDateTimeRange(start: Date, end: Date | null): string {
  const dateStr = format(start, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const startTime = format(start, "HH:mm");
  if (!end) return `${dateStr} às ${startTime}`;
  if (isSameDay(start, end)) {
    return `${dateStr}, ${startTime} – ${format(end, "HH:mm")}`;
  }
  return `${dateStr} ${startTime} – ${format(end, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`;
}

export function EventChip({
  item,
  variant = "block",
  onEdit,
}: {
  item: CalendarItem;
  /** "block": pílula compacta (célula do mês). "card": cartão maior (Semana/Dia). */
  variant?: "block" | "card";
  onEdit: (item: CalendarItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { openDeal } = useDealUI();
  const { mutate: removeEvent, isPending: deleting } = useDeleteEvent();

  const isEditable = item.kind === "event";

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeEvent(item.id, { onSuccess: () => setOpen(false) });
  };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    onEdit(item);
  };
  const handleViewDeal = () => {
    if (!item.dealId) return;
    setOpen(false);
    openDeal(item.dealId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "block" ? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: item.color }}
            title={item.title}
          >
            {item.title}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full items-start gap-1.5 rounded-md border-l-4 bg-card px-2 py-1.5 text-left text-xs shadow-sm hover:bg-accent"
            style={{ borderLeftColor: item.color }}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.title}</span>
              <span className="text-muted-foreground">{format(item.startDate, "HH:mm")}</span>
            </span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 border-b p-3">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <h3 className="min-w-0 break-words text-sm font-semibold">{item.title}</h3>
          </div>
          {isEditable && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Editar evento">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Excluir evento"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2.5 p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDateTimeRange(item.startDate, item.endDate)}</span>
          </div>

          <Badge variant="secondary" className="font-normal">
            {item.statusLabel}
          </Badge>

          {item.org && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.org}</span>
            </div>
          )}

          {item.estimatedValue != null && (
            <p className="text-muted-foreground">
              Valor estimado:{" "}
              <span className="font-medium text-foreground">
                {item.estimatedValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
          )}

          {item.description && <p className="whitespace-pre-wrap text-foreground/90">{item.description}</p>}

          {item.dealId && (
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleViewDeal}>
              <ExternalLink className="h-3.5 w-3.5" />
              Ver todos os detalhes do processo
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
