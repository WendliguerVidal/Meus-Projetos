import { z } from "zod";

// ---------------------------------------------------------------------------
// Status de Evento do Calendário
// ---------------------------------------------------------------------------

export const EVENT_STATUSES = ["ABERTO", "EM_ANALISE", "GANHO", "PERDIDO"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  ABERTO: "Aberto",
  EM_ANALISE: "Em Análise",
  GANHO: "Ganho",
  PERDIDO: "Perdido",
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  ABERTO: "#3b82f6", // azul
  EM_ANALISE: "#a855f7", // roxo
  GANHO: "#22c55e", // verde
  PERDIDO: "#ef4444", // vermelho
};

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

export const eventSchema = z
  .object({
    title: z.string().min(3, "Título deve ter ao menos 3 caracteres").max(200),
    description: z.string().max(2000).optional().or(z.literal("")),
    startDate: z.coerce.date({ errorMap: () => ({ message: "Data de início inválida" }) }),
    endDate: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.coerce.date().nullable()
    ).optional(),
    status: z.enum(EVENT_STATUSES),
    estimatedValue: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
      z.number().nonnegative("Valor deve ser positivo").nullable()
    ).optional(),
    dealId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data de término não pode ser anterior à data de início",
        path: ["endDate"],
      });
    }
  });

export type EventFormValues = z.infer<typeof eventSchema>;

// ---------------------------------------------------------------------------
// Item unificado do calendário: um Event de verdade, ou um prazo de Deal
// (Deal.deadline) exibido automaticamente como marcador somente-leitura.
// ---------------------------------------------------------------------------

export type CalendarItem = {
  id: string;
  /** `event`: registro real da tabela Event (editável/excluível aqui).
   *  `deal-deadline`: prazo de um processo (Deal.deadline), somente-leitura — editar
   *  significa editar o processo em si, através do drawer de detalhes. */
  kind: "event" | "deal-deadline";
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  /** Rótulo já traduzido para exibição (status do Event, ou categoria do Deal). */
  statusLabel: string;
  /** Valor bruto do status — só é significativo quando kind === "event" (usado para
   *  pré-preencher o formulário de edição); para "deal-deadline" vem fixo em "ABERTO". */
  status: EventStatus;
  color: string;
  estimatedValue: number | null;
  dealId: string | null;
  /** Cliente/órgão responsável — do próprio Event vinculado, ou do Deal de origem. */
  org: string | null;
};
