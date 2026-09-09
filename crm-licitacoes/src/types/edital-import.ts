import { z } from "zod";
import { BRAZIL_STATES } from "./deal";

// ---------------------------------------------------------------------------
// Importação de Edital (PDF) — leitura automática via IA
// ---------------------------------------------------------------------------
// Fluxo: upload do PDF -> extractEditalFromPdf (IA) -> EditalExtractionData (bruto,
// campos podem vir nulos) -> usuário revisa/corrige num formulário de prévia -> submit
// valida com editalImportSchema -> createDealFromEdital cria o Deal + Event vinculado.

/** Dados brutos devolvidos pela extração via IA — qualquer campo pode ser nulo quando a
 * IA não conseguiu localizá-lo no PDF; o usuário completa o que faltar na prévia. */
export type EditalExtractionData = {
  title: string | null;
  client: string | null;
  city: string | null;
  /** Sigla de UF (2 letras) já normalizada e validada contra BRAZIL_STATES — nulo se a
   * IA não identificou o estado ou identificou algo que não é uma UF válida. */
  state: string | null;
  equipment: string | null;
  model: string | null;
  serialNumber: string | null;
  /** Prazo/data de abertura extraído, como string ISO 8601, ou nulo se não encontrado. */
  deadline: string | null;
  estimatedValue: number | null;
  /** Resumo curto do objeto/equipamento/regras de prazo — vira a descrição do Event. */
  summary: string | null;
};

/** Formulário de confirmação exibido após a extração — os mesmos campos obrigatórios do
 * cadastro manual de processo (ver dealSchema em types/deal.ts), já que o resultado final
 * é um Deal completo. Categoria e status não aparecem aqui: são fixados em ANDAMENTO /
 * "Licitação em Aberto" pela Server Action, conforme a regra de negócio pedida. */
export const editalImportSchema = z.object({
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres").max(200),
  client: z.string().min(2, "Cliente/Órgão é obrigatório").max(200),
  city: z.string().min(2, "Cidade é obrigatória").max(120),
  state: z.enum(BRAZIL_STATES, { errorMap: () => ({ message: "UF inválida" }) }),
  equipment: z.string().max(200).optional().or(z.literal("")),
  model: z.string().max(200).optional().or(z.literal("")),
  serialNumber: z.string().max(200).optional().or(z.literal("")),
  deadline: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.date().nullable()
  ).optional(),
  // Mesmo preprocess defensivo do eventSchema (aceita vírgula decimal em formato BR).
  estimatedValue: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null;
    if (typeof v === "number") return v;
    const normalized = String(v).trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? v : parsed;
  }, z.number({ invalid_type_error: "Valor estimado inválido" }).nonnegative("Valor deve ser positivo").nullable()).optional(),
  summary: z.string().max(2000).optional().or(z.literal("")),
});

export type EditalImportFormValues = z.infer<typeof editalImportSchema>;
