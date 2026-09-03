import { z } from "zod";

// ---------------------------------------------------------------------------
// Categorias, status e máquina de estados
// ---------------------------------------------------------------------------

export const DEAL_CATEGORIES = [
  "ANDAMENTO",
  "PARALISADA",
  "GANHO",
  "PERDIDO",
  "GARANTIA",
  "CONCLUIDO",
  "ARQUIVADO",
] as const;

export type DealCategory = (typeof DEAL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<DealCategory, string> = {
  ANDAMENTO: "Andamento",
  PARALISADA: "Paralisada",
  GANHO: "Ganho",
  PERDIDO: "Perdido",
  GARANTIA: "Garantia",
  CONCLUIDO: "Concluído",
  ARQUIVADO: "Arquivado",
};

export const CATEGORY_COLORS: Record<DealCategory, string> = {
  ANDAMENTO: "#eab308", // amarelo
  PARALISADA: "#f97316", // laranja
  GANHO: "#22c55e", // verde
  PERDIDO: "#ef4444", // vermelho
  GARANTIA: "#6b7280", // cinza escuro
  CONCLUIDO: "#3b82f6", // azul
  ARQUIVADO: "#94a3b8", // cinza claro
};

export const CATEGORY_STATUSES: Record<DealCategory, string[]> = {
  ANDAMENTO: [
    "Licitação em Aberto",
    "Esclarecimento",
    "Impugnação",
    "Negociação em Andamento",
    "Adesão",
  ],
  PARALISADA: ["Suspensa", "Aguardando Resposta"],
  GANHO: [
    "Aguardando Contrato",
    "Aguardando OF",
    "Faturado",
    "Pendente de Entrega",
    "Entregue",
  ],
  PERDIDO: ["Perdido"],
  GARANTIA: ["Em Análise", "Peça Solicitada", "Em Reparo", "Resolvido"],
  CONCLUIDO: ["Concluído"],
  ARQUIVADO: ["Arquivado"],
};

export function defaultStatusFor(category: DealCategory): string {
  return CATEGORY_STATUSES[category][0] ?? "";
}

export const LOSS_REASONS = [
  "PRECO",
  "ESPECIFICACAO_INADEQUADA",
  "FALTA_DOCUMENTACAO",
  "DISTANCIA",
  "OUTROS",
] as const;

export type LossReason = (typeof LOSS_REASONS)[number];

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  PRECO: "Preço",
  ESPECIFICACAO_INADEQUADA: "Especificação Inadequada",
  FALTA_DOCUMENTACAO: "Falta de Documentação",
  DISTANCIA: "Distância",
  OUTROS: "Outros",
};

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type BrazilState = (typeof BRAZIL_STATES)[number];

export const REMINDER_STATUSES = ["PENDING", "DONE"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const dealSchema = z.object({
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres").max(200),
  client: z.string().min(2, "Cliente é obrigatório").max(200),
  city: z.string().min(2, "Cidade é obrigatória").max(120),
  state: z.enum(BRAZIL_STATES, { errorMap: () => ({ message: "UF inválida" }) }),
  equipment: z.string().max(200).optional().or(z.literal("")),
  model: z.string().max(200).optional().or(z.literal("")),
  serialNumber: z.string().max(200).optional().or(z.literal("")),
  category: z.enum(DEAL_CATEGORIES),
  status: z.string().min(1, "Status é obrigatório"),
  lossReason: z.enum(LOSS_REASONS).optional().nullable(),
  lossDetail: z.string().max(2000).optional().nullable(),
  deadline: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.date().nullable()
  ).optional(),
  assignedToId: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.category === "PERDIDO") {
    if (!data.lossReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Motivo da perda é obrigatório",
        path: ["lossReason"],
      });
    }
    if (!data.lossDetail || data.lossDetail.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Detalhe da perda é obrigatório",
        path: ["lossDetail"],
      });
    }
  }
  if (!CATEGORY_STATUSES[data.category]?.includes(data.status)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Status inválido para a categoria selecionada",
      path: ["status"],
    });
  }
});

export type DealFormValues = z.infer<typeof dealSchema>;

export const noteSchema = z.object({
  dealId: z.string().min(1),
  text: z.string().min(1, "Escreva uma observação").max(4000),
});

export const reminderSchema = z.object({
  dealId: z.string().min(1),
  assignedToId: z.string().min(1, "Selecione um responsável"),
  dueDate: z.coerce.date(),
  description: z.string().min(2, "Descrição é obrigatória").max(1000),
});

export const reminderStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(REMINDER_STATUSES),
});

export const attachmentSchema = z.object({
  dealId: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileType: z.string().min(1),
});

export const moveDealSchema = z.object({
  id: z.string().min(1),
  category: z.enum(DEAL_CATEGORIES),
  status: z.string().min(1),
});

export const userSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "USER"]),
  allowedStates: z.array(z.enum(BRAZIL_STATES)).default([]),
  active: z.boolean().default(true),
});

export type UserFormValues = z.infer<typeof userSchema>;
