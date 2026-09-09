import { differenceInCalendarDays, isToday as isTodayFn } from "date-fns";
import type { DealCategory } from "@/types/deal";
import type { EventStatus } from "@/types/event";

// ---------------------------------------------------------------------------
// Alertas visuais de urgência de prazo — usado por Kanban, Tabela, Calendário
// e pela Central de Notificações do cabeçalho. Uma única fonte de verdade
// para as regras de cor/mensagem evita que cada tela decida os limiares (3
// dias) ou o texto de forma independente e fora de sincronia.
// ---------------------------------------------------------------------------

export type UrgencyLevel = "OVERDUE" | "SOON" | "OK";

const SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

/** Categorias de processo já encerradas — um prazo vencido não é "urgente" quando o
 * processo já foi ganho, perdido, concluído ou arquivado (mesma lista usada há tempos
 * em kanban-card.tsx/deal-table.tsx para a formatação de "atrasado", agora centralizada). */
export const CLOSED_DEAL_CATEGORIES: DealCategory[] = ["GANHO", "PERDIDO", "CONCLUIDO", "ARQUIVADO"];

/** Status de Event já encerrados — mesma ideia, para compromissos do calendário. */
export const CLOSED_EVENT_STATUSES: EventStatus[] = ["GANHO", "PERDIDO"];

/**
 * 🔴 OVERDUE — data já passou ou vence agora (<= momento atual).
 * 🟡 SOON — vence dentro dos próximos 3 dias.
 * 🟢 OK — mais de 3 dias de margem.
 * `null` quando não há data (nada a destacar).
 */
export function getUrgencyLevel(date: Date | string | null | undefined): UrgencyLevel | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "OVERDUE";
  if (diffMs <= SOON_WINDOW_MS) return "SOON";
  return "OK";
}

/** Urgência do prazo de um processo — `null` também quando a categoria já está encerrada. */
export function getDealUrgency(
  deadline: Date | string | null | undefined,
  category: string
): UrgencyLevel | null {
  if (CLOSED_DEAL_CATEGORIES.includes(category as DealCategory)) return null;
  return getUrgencyLevel(deadline);
}

/** Urgência de um compromisso do calendário — `null` também quando já ganho/perdido. */
export function getEventUrgency(
  startDate: Date | string | null | undefined,
  status: string
): UrgencyLevel | null {
  if (CLOSED_EVENT_STATUSES.includes(status as EventStatus)) return null;
  return getUrgencyLevel(startDate);
}

export const URGENCY_DOT_COLOR: Record<UrgencyLevel, string> = {
  OVERDUE: "#ef4444",
  SOON: "#eab308",
  OK: "#22c55e",
};

export const URGENCY_BADGE_CLASSES: Record<UrgencyLevel, string> = {
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  SOON: "bg-yellow-50 text-yellow-700 border-yellow-200",
  OK: "bg-green-50 text-green-700 border-green-200",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  OVERDUE: "Atrasado",
  SOON: "Atenção",
  OK: "No prazo",
};

/** Mensagem curta em português para o card/badge/notificação — ex: "Vence hoje às
 * 14:00", "Atrasado há 1 dia", "Vence em 2 dias". */
export function formatUrgencyMessage(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (d.getTime() <= now.getTime()) {
    if (isTodayFn(d)) return `Atrasado (venceu hoje às ${timeStr})`;
    const daysLate = Math.abs(differenceInCalendarDays(d, now));
    return `Atrasado há ${daysLate} dia${daysLate === 1 ? "" : "s"}`;
  }
  if (isTodayFn(d)) return `Vence hoje às ${timeStr}`;
  const daysLeft = differenceInCalendarDays(d, now);
  return `Vence em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`;
}
