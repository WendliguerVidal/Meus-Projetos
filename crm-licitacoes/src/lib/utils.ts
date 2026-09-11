import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseAllowedStates(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function serializeAllowedStates(states: string[]): string {
  return JSON.stringify(states ?? []);
}

/** Campos "somente-dia" (Deal.deadline, Reminder.dueDate, DocumentFile.expiryDate) vêm
 * sempre de um <input type="date"> e são gravados como meia-noite UTC do dia escolhido
 * (é assim que o JS interpreta uma string "yyyy-MM-dd" — ver z.coerce.date() em
 * types/deal.ts/types/event.ts). Ler esse valor com funções sensíveis ao fuso do
 * navegador (toLocaleDateString, date-fns) devolve o dia calendário ERRADO em qualquer
 * fuso atrás de UTC — o Brasil inteiro —, mostrando 1 dia a menos do que foi escolhido.
 * Esta função extrai o dia calendário direto dos componentes UTC e monta um Date à
 * meia-noite LOCAL desse mesmo dia — a partir daí, qualquer função local (toLocaleDate-
 * String, date-fns) lê o dia certo. NÃO usar em campos com hora de verdade (createdAt,
 * Event.startDate/endDate). */
export function toCalendarDate(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Meia-noite de hoje no fuso do navegador — o "hoje" contra o qual comparamos os
 * campos somente-dia acima (ver toCalendarDate). */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formata um campo "somente-dia" (deadline, dueDate, expiryDate) como dd/mm/aaaa,
 * preservando o dia exato escolhido no formulário — ver toCalendarDate() para o porquê
 * de não usar toLocaleDateString direto aqui. Para timestamps de verdade (createdAt,
 * updatedAt), use formatLocalDate(). */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return toCalendarDate(date).toLocaleDateString("pt-BR");
}

/** Formata a data (dia/mês/ano, sem hora) de um timestamp de verdade no fuso do
 * navegador — diferente de formatDate(), que é para campos "somente-dia" gravados em
 * UTC (ver toCalendarDate). Use para createdAt/updatedAt e afins. */
export function formatLocalDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** `date` é sempre um campo somente-dia (Reminder.dueDate) — comparamos dia calendário
 * contra dia calendário (ver toCalendarDate/startOfToday), não instante contra instante:
 * um lembrete com vencimento hoje não deve virar "atrasado" horas antes de o dia acabar. */
export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return toCalendarDate(date).getTime() < startOfToday().getTime();
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const diff = toCalendarDate(date).getTime() - startOfToday().getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

const MONTH_LABELS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function monthLabel(month: number): string {
  return MONTH_LABELS_PT[month - 1] ?? String(month);
}

/** Formata um tamanho em bytes para exibição (ex: "482 KB", "1.3 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
