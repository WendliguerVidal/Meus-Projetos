import { z } from "zod";

// ---------------------------------------------------------------------------
// Cadastro de Equipamentos — catálogo de máquinas/equipamentos da empresa,
// exibido em cards editáveis. Alimenta a lista de sugestões dos campos
// Objeto/Equipamento e Modelo no formulário de Itens do Processo (ver DealForm).
// ---------------------------------------------------------------------------

/** Um campo característico dinâmico (ex: "Potência" -> "180cv") de um card de
 * equipamento. `id` só vem preenchido ao editar um campo já salvo. */
export const equipmentFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Informe o nome do campo").max(120),
  value: z.string().max(2000).optional().or(z.literal("")),
});
export type EquipmentFieldFormValues = z.infer<typeof equipmentFieldSchema>;

export const equipmentSchema = z.object({
  object: z.string().min(1, "Informe o equipamento").max(200),
  model: z.string().max(200).optional().or(z.literal("")),
  fields: z.array(equipmentFieldSchema).default([]),
});
export type EquipmentFormValues = z.infer<typeof equipmentSchema>;
