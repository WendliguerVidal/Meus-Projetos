import { cn } from "@/lib/utils";
import {
  getUrgencyLevel,
  formatUrgencyMessage,
  URGENCY_DOT_COLOR,
  URGENCY_BADGE_CLASSES,
  URGENCY_LABELS,
  type UrgencyLevel,
} from "@/lib/urgency";

/** Pílula compacta com bolinha colorida + mensagem de prazo (ex: "Vence hoje às 14:00").
 * Usado no Kanban, na Tabela e no Calendário — mesma regra de cor em todo lugar:
 * 🔴 atrasado/vence agora · 🟡 vence em até 3 dias · 🟢 mais de 3 dias de margem. */
export function UrgencyBadge({
  date,
  level: levelProp,
  className,
}: {
  date: Date | string;
  /** Nível já calculado (ex: excluindo categorias/status encerrados) — evita recalcular
   * a partir só da data quando o chamador precisa aplicar essa regra extra. */
  level?: UrgencyLevel | null;
  className?: string;
}) {
  const level = levelProp !== undefined ? levelProp : getUrgencyLevel(date);
  if (!level) return null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        URGENCY_BADGE_CLASSES[level],
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: URGENCY_DOT_COLOR[level] }} />
      <span className="truncate">{formatUrgencyMessage(date)}</span>
    </span>
  );
}

/** Só a bolinha colorida, sem texto — para espaços apertados (chip do calendário). */
export function UrgencyDot({ level, className }: { level: UrgencyLevel; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-white", className)}
      style={{ backgroundColor: URGENCY_DOT_COLOR[level] }}
      title={URGENCY_LABELS[level]}
    />
  );
}
