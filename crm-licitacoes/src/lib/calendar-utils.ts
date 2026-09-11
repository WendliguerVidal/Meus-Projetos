import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarItem } from "@/types/event";

export type CalendarView = "day" | "week" | "month" | "year";

/** Chave estável "yyyy-MM-dd" para agrupar itens por dia (evita comparar objetos Date).
 * `date` aqui é sempre um dia de calendário genuíno no fuso local (célula da grade). */
export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Mesma chave "yyyy-MM-dd", mas lendo os componentes UTC — para o prazo de um Deal
 * (Deal.deadline), que é sempre gravado como meia-noite UTC do dia escolhido no
 * formulário (ver toCalendarDate em lib/utils.ts). Usar dateKey (fuso local) aqui faria
 * o prazo cair um dia antes na grade em qualquer fuso atrás de UTC (o Brasil inteiro). */
function dateKeyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 42 dias (6 semanas, domingo a sábado) cobrindo o mês de `date`, incluindo dias de
 * transbordo do mês anterior/seguinte — o mesmo grid que o Google Agenda usa na visão Mês. */
export function getMonthGridDays(date: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** 7 dias (domingo a sábado) da semana que contém `date`. */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** O 1º dia de cada um dos 12 meses do ano de `date` — usado na visão Ano. */
export function getYearMonths(date: Date): Date[] {
  const start = startOfYear(date);
  return Array.from({ length: 12 }, (_, i) => addMonths(start, i));
}

/** Intervalo [início, fim] que precisa ser buscado no servidor para cobrir o que a visão
 * atual renderiza (a visão Mês busca a grade completa de 42 dias, incl. transbordo). */
export function rangeForView(view: CalendarView, date: Date): { start: Date; end: Date } {
  switch (view) {
    case "day":
      return { start: startOfDay(date), end: startOfDay(addDays(date, 1)) };
    case "week": {
      const start = startOfWeek(date, { weekStartsOn: 0 });
      return { start, end: endOfWeek(date, { weekStartsOn: 0 }) };
    }
    case "year":
      return { start: startOfYear(date), end: endOfYear(date) };
    case "month":
    default: {
      const days = getMonthGridDays(date);
      return { start: days[0]!, end: days[days.length - 1]! };
    }
  }
}

/** Avança/retrocede `date` de acordo com a visão ativa — usado pelos botões ‹ › do header. */
export function navigateDate(view: CalendarView, date: Date, direction: 1 | -1): Date {
  switch (view) {
    case "day":
      return addDays(date, direction);
    case "week":
      return addWeeks(date, direction);
    case "year":
      return addYears(date, direction);
    case "month":
    default:
      return addMonths(date, direction);
  }
}

/** Título exibido no header para a visão/data atuais (ex: "Setembro de 2026", "9 de setembro"). */
export function formatViewTitle(view: CalendarView, date: Date): string {
  switch (view) {
    case "day":
      return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    case "week": {
      const days = getWeekDays(date);
      const start = days[0]!;
      const end = days[6]!;
      const sameMonth = isSameMonth(start, end);
      return sameMonth
        ? `${format(start, "d", { locale: ptBR })}–${format(end, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
        : `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
    }
    case "year":
      return format(date, "yyyy", { locale: ptBR });
    case "month":
    default:
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  }
}

/** Agrupa itens do calendário por dia (chave "yyyy-MM-dd"), incluindo cada dia entre
 * startDate e endDate quando o evento tiver múltiplos dias. */
export function groupItemsByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  const addToDay = (key: string, item: CalendarItem) => {
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  };

  for (const item of items) {
    if (item.kind === "deal-deadline") {
      // Prazo de Deal: um único dia, sempre lido em UTC — ver dateKeyUTC acima.
      addToDay(dateKeyUTC(item.startDate), item);
      continue;
    }
    const start = startOfDay(item.startDate);
    const end = item.endDate ? startOfDay(item.endDate) : start;
    const span = end >= start ? eachDayOfInterval({ start, end }) : [start];
    for (const day of span) {
      addToDay(dateKey(day), item);
    }
  }
  return map;
}

export { isSameDay, isSameMonth, format, ptBR };
