"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge, UrgencyDot } from "@/components/ui/urgency-badge";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import { useDeleteEvent } from "@/hooks/use-events";
import { useDeleteDeal } from "@/hooks/use-deals";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { CalendarItem } from "@/types/event";
import { formatUrgencyMessage } from "@/lib/urgency";
import { toCalendarDate } from "@/lib/utils";
import { Building2, Clock, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";

/** "deal-deadline": Deal.deadline não tem hora de verdade (é meia-noite UTC do dia
 * escolhido no formulário) — mostramos só a data, extraindo o dia calendário certo via
 * toCalendarDate (ver lib/utils.ts) em vez do "às 00:00" que um horário de verdade
 * mostraria. "event": intervalo completo com hora, como antes. */
function formatDateTimeRange(item: CalendarItem): string {
  if (item.kind === "deal-deadline") {
    return format(toCalendarDate(item.startDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }
  const { startDate: start, endDate: end } = item;
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
  const { mutate: removeEvent, isPending: deletingEvent } = useDeleteEvent();
  const { mutate: removeDeal, isPending: deletingDeal } = useDeleteDeal();
  const isAdmin = useIsAdmin();

  const isEditable = item.kind === "event";
  const deleting = deletingEvent || deletingDeal;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.kind === "event") {
      removeEvent(item.id, { onSuccess: () => setOpen(false) });
      return;
    }
    // kind === "deal-deadline": exclui o processo inteiro, não só o marcador — ação
    // destrutiva e irreversível (remove notas, lembretes, anexos e auditoria junto),
    // por isso pede confirmação antes.
    if (!item.dealId) return;
    const confirmed = window.confirm(
      `Excluir o processo "${item.title}"? Esta ação não pode ser desfeita e remove todo o histórico vinculado a ele.`
    );
    if (!confirmed) return;
    removeDeal(item.dealId, { onSuccess: () => setOpen(false) });
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
            className="relative flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: item.color }}
            title={item.urgencyLevel ? `${item.title} — ${formatUrgencyMessage(item.startDate, item.kind === "deal-deadline")}` : item.title}
          >
            {item.urgencyLevel && <UrgencyDot level={item.urgencyLevel} className="shrink-0" />}
            <span className="truncate">{item.title}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full items-start gap-1.5 rounded-md border-l-4 bg-card px-2 py-1.5 text-left text-xs shadow-sm hover:bg-accent"
            style={{ borderLeftColor: item.color }}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 truncate font-medium">
                {item.urgencyLevel && <UrgencyDot level={item.urgencyLevel} className="shrink-0" />}
                <span className="truncate">{item.title}</span>
              </span>
              <span className="text-muted-foreground">
                {item.kind === "deal-deadline" ? "Prazo final" : format(item.startDate, "HH:mm")}
              </span>
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
          <div className="flex shrink-0 items-center gap-0.5">
            {isEditable && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Editar evento">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDelete}
                disabled={deleting}
                aria-label={item.kind === "event" ? "Excluir evento" : "Excluir processo"}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2.5 p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDateTimeRange(item)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="font-normal">
              {item.statusLabel}
            </Badge>
            {item.urgencyLevel && (
              <UrgencyBadge date={item.startDate} level={item.urgencyLevel} dateOnly={item.kind === "deal-deadline"} />
            )}
          </div>

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
