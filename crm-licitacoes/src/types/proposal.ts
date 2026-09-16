import { z } from "zod";

// ---------------------------------------------------------------------------
// Proposta Comercial — gerada em PDF a partir de um processo (Deal) e seus Itens,
// no molde de "Nova_Proposta_Comercial_35U.docx" (capa, apresentação IRMEN/SANY, bloco
// de cada máquina, tabela de preços + descritivo, condições comerciais, unidades/pós-
// venda e contato). Ver src/lib/pdf/proposal-document.tsx para a montagem do PDF e
// src/app/actions/proposal.ts para as Server Actions.
// ---------------------------------------------------------------------------

/** Um item da proposta — mistura dados do DealItem (objeto/modelo/quantidade, não
 * editáveis aqui) com os campos preenchidos/editados pelo usuário antes de gerar. */
export const proposalItemInputSchema = z.object({
  dealItemId: z.string().min(1),
  descriptiveText: z.string().max(6000).optional().or(z.literal("")),
  unitValue: z.coerce.number({ invalid_type_error: "Valor unitário inválido" }).nonnegative().default(0),
  totalValue: z.coerce.number({ invalid_type_error: "Valor total inválido" }).nonnegative().default(0),
});
export type ProposalItemInput = z.infer<typeof proposalItemInputSchema>;

/** Campos do cabeçalho e das condições comerciais — preenchidos uma vez por geração,
 * pré-preenchidos com sugestões (ver getProposalDefaults) mas sempre editáveis. */
export const generateProposalSchema = z.object({
  dealId: z.string().min(1),
  dataProposta: z.string().min(1, "Informe a data da proposta").max(20),
  clienteNome: z.string().min(1, "Informe o cliente").max(200),
  aliquotaIcms: z.string().max(60).optional().or(z.literal("")),
  condicoesPagamento: z.string().max(200).optional().or(z.literal("")),
  prazoGarantia: z.string().max(200).optional().or(z.literal("")),
  localEntrega: z.string().max(300).optional().or(z.literal("")),
  prazoEntrega: z.string().max(120).optional().or(z.literal("")),
  validadeProposta: z.string().max(120).optional().or(z.literal("")),
  items: z.array(proposalItemInputSchema).min(1, "Adicione ao menos um item ao processo antes de gerar a proposta"),
});
export type GenerateProposalFormValues = z.infer<typeof generateProposalSchema>;

/** Retorno de getProposalDefaults — um item pronto para popular o formulário, já com o
 * descritivo técnico sugerido (ver matchEquipmentForItem em actions/proposal.ts) e uma
 * sugestão de valor unitário/total a partir do que já está salvo no item do processo. */
export type ProposalItemDefault = {
  dealItemId: string;
  object: string;
  model: string | null;
  quantity: number;
  suggestedUnitValue: number;
  suggestedTotalValue: number;
  suggestedDescriptiveText: string;
  matchedEquipmentId: string | null;
  photoCount: number;
};

export type ProposalDefaults = {
  dataProposta: string;
  clienteNome: string;
  localEntrega: string;
  items: ProposalItemDefault[];
};
