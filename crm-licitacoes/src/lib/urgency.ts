import { differenceInCalendarDays, isToday as isTodayFn } from "date-fns";
import { toCalendarDate, startOfToday } from "@/lib/utils";
import type { DealCategory } from "@/types/deal";
import type { EventStatus } from "@/types/event";

// ---------------------------------------------------------------------------
// Alertas visuais de urgência de prazo — usado por Kanban, Tabela, Calendário
// e pela Central de Notificações do cabeçalho. Uma única fonte de verdade
// para as regras de cor/mensagem evita que cada tela decida os limiares (3
// dias) ou o texto de forma independente e fora de sincronia.
// ---------------------------------------------------------------------------

export type UrgencyLevel = "OVERDUE" | "SOON" | "OK";

const SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias — Deal/Event

/** Documentos (certidões, CNDs, alvarás...) pedem uma antecedência maior que o prazo de
 * 3 dias de Deal/Event — renovar uma certidão leva tempo, por isso o aviso amarelo
 * começa bem antes do vencimento. */
export const DOCUMENT_EXPIRY_SOON_DAYS = 30;
const DOCUMENT_SOON_WINDOW_MS = DOCUMENT_EXPIRY_SOON_DAYS * 24 * 60 * 60 * 1000;

/** Categorias de processo já encerradas — um prazo vencido não é "urgente" quando o
 * processo já foi ganho, perdido, concluído ou arquivado (mesma lista usada há tempos
 * em kanban-card.tsx/deal-table.tsx para a formatação de "atrasado", agora centralizada). */
export const CLOSED_DEAL_CATEGORIES: DealCategory[] = ["GANHO", "PERDIDO", "CONCLUIDO", "ARQUIVADO"];

/** Status de Event já encerrados — mesma ideia, para compromissos do calendário. */
export const CLOSED_EVENT_STATUSES: EventStatus[] = ["GANHO", "PERDIDO"];

/**
 * 🔴 OVERDUE — data já passou ou vence agora (<= momento atual).
 * 🟡 SOON — vence dentro da janela de "atenção" (`soonWindowMs`, 3 dias por padrão —
 *   Deal/Event; documentos usam uma janela maior, ver getDocumentUrgency).
 * 🟢 OK — fora da janela de atenção.
 * `null` quando não há data (nada a destacar).
 *
 * `dateOnly` deve ser `true` para campos "somente-dia" (Deal.deadline,
 * DocumentFile.expiryDate — sempre meia-noite UTC do dia escolhido num
 * <input type="date">, ver toCalendarDate em lib/utils.ts): comparamos dia
 * calendário contra dia calendário, não instante contra instante — do contrário um
 * prazo "hoje" viraria OVERDUE horas antes de o dia acabar. Event.startDate tem hora
 * de verdade e usa `dateOnly: false` (padrão).
 */
export function getUrgencyLevel(
  date: Date | string | null | undefined,
  soonWindowMs: number = SOON_WINDOW_MS,
  dateOnly = false
): UrgencyLevel | null {
  if (!date) return null;
  if (dateOnly) {
    const diffDays = differenceInCalendarDays(toCalendarDate(date), startOfToday());
    if (diffDays < 0) return "OVERDUE";
    const soonDays = Math.floor(soonWindowMs / (24 * 60 * 60 * 1000));
    if (diffDays <= soonDays) return "SOON";
    return "OK";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "OVERDUE";
  if (diffMs <= soonWindowMs) return "SOON";
  return "OK";
}

/** Pior nível entre vários — usado para o "resumo" de uma pasta a partir da urgência dos
 * arquivos dentro dela (e de suas subpastas): um único arquivo vencido já deixa a pasta
 * inteira vermelha. */
export function worstUrgency(levels: (UrgencyLevel | null | undefined)[]): UrgencyLevel | null {
  if (levels.includes("OVERDUE")) return "OVERDUE";
  if (levels.includes("SOON")) return "SOON";
  if (levels.includes("OK")) return "OK";
  return null;
}

/** Urgência do prazo de um processo — `null` também quando a categoria já está encerrada. */
export function getDealUrgency(
  deadline: Date | string | null | undefined,
  category: string
): UrgencyLevel | null {
  if (CLOSED_DEAL_CATEGORIES.includes(category as DealCategory)) return null;
  return getUrgencyLevel(deadline, SOON_WINDOW_MS, true);
}

/** Urgência de um compromisso do calendário — `null` também quando já ganho/perdido. */
export function getEventUrgency(
  startDate: Date | string | null | undefined,
  status: string
): UrgencyLevel | null {
  if (CLOSED_EVENT_STATUSES.includes(status as EventStatus)) return null;
  return getUrgencyLevel(startDate);
}

/** Urgência de validade de um documento (certidão, CND, alvará...) — janela de atenção
 * bem maior que Deal/Event (30 dias por padrão, ver DOCUMENT_EXPIRY_SOON_DAYS), já que
 * renovar uma certidão não é instantâneo. `null` quando o documento não tem validade
 * definida (nem todo documento vence). */
export function getDocumentUrgency(expiryDate: Date | string | null | undefined): UrgencyLevel | null {
  return getUrgencyLevel(expiryDate, DOCUMENT_SOON_WINDOW_MS, true);
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
 * 14:00", "Atrasado há 1 dia", "Vence em 2 dias".
 *
 * `dateOnly: true` para campos somente-dia (Deal.deadline, DocumentFile.expiryDate —
 * ver getUrgencyLevel acima): compara dia calendário, sem mostrar hora (a meia-noite
 * UTC gravada não é um horário de verdade). Event.startDate usa `dateOnly: false`
 * (padrão), que preserva a hora exata do compromisso. */
export function formatUrgencyMessage(date: Date | string, dateOnly = false): string {
  if (dateOnly) {
    const diffDays = differenceInCalendarDays(toCalendarDate(date), startOfToday());
    if (diffDays < 0) {
      const daysLate = Math.abs(diffDays);
      return `Atrasado há ${daysLate} dia${daysLate === 1 ? "" : "s"}`;
    }
    if (diffDays === 0) return "Vence hoje";
    return `Vence em ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
  }

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
