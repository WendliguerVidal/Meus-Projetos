import { z } from "zod";
import type { Equipment, EquipmentField } from "@prisma/client";

// ---------------------------------------------------------------------------
// Cadastro de Equipamentos — catálogo de máquinas/equipamentos da empresa,
// exibido em cards editáveis. Alimenta a lista de sugestões dos campos
// Objeto/Equipamento e Modelo no formulário de Itens do Processo (ver DealForm).
// ---------------------------------------------------------------------------

/** Limite de caracteres do valor de uma característica — dá margem confortável para uma
 * descrição completa de modelo (a mais longa das fichas técnicas de referência usadas
 * para calibrar este limite tem ~1.230 caracteres, a média fica perto de 950). */
export const EQUIPMENT_FIELD_VALUE_MAX = 5000;

/** Um campo característico dinâmico (ex: "Potência" -> "180cv") de um card de
 * equipamento. `id` só vem preenchido ao editar um campo já salvo. O nome do campo é
 * opcional — permite usar "Características" como uma única descrição livre, sem
 * precisar rotular cada característica (o card só descarta a linha se label E valor
 * estiverem vazios, ver handleSave em equipment-card.tsx). */
export const equipmentFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().max(120),
  value: z.string().max(EQUIPMENT_FIELD_VALUE_MAX).optional().or(z.literal("")),
});
export type EquipmentFieldFormValues = z.infer<typeof equipmentFieldSchema>;

export const equipmentSchema = z.object({
  object: z.string().min(1, "Informe o equipamento").max(200),
  model: z.string().max(200).optional().or(z.literal("")),
  fields: z.array(equipmentFieldSchema).default([]),
});
export type EquipmentFormValues = z.infer<typeof equipmentSchema>;

// ---------------------------------------------------------------------------
// Arquivos do Equipamento — Foto e Ficha Técnica (ver model EquipmentFile no schema).
// ---------------------------------------------------------------------------

export const EQUIPMENT_FILE_CATEGORIES = ["FOTO", "FICHA_TECNICA"] as const;
export type EquipmentFileCategory = (typeof EQUIPMENT_FILE_CATEGORIES)[number];

export const EQUIPMENT_FILE_CATEGORY_LABELS: Record<EquipmentFileCategory, string> = {
  FOTO: "Foto",
  FICHA_TECNICA: "Ficha Técnica",
};

/** Atributo `accept` do input de arquivo — fotos/imagens, PDF e arquivos de texto
 * (.txt/.doc/.docx), conforme pedido para as duas categorias acima. */
export const EQUIPMENT_FILE_ACCEPT = "image/*,.pdf,.txt,.doc,.docx";

export type EquipmentFileItem = {
  id: string;
  category: EquipmentFileCategory;
  fileName: string;
  fileUrl: string;
  fileType: string;
  size: number;
  uploadedAt: Date;
};

// `category` é `String` no schema Prisma (ver comentário no topo de schema.prisma) —
// sobrescrevemos aqui com o union type validado em EQUIPMENT_FILE_CATEGORIES, mesmo
// padrão de DealWithRelations em types/index.ts.
export type EquipmentWithFields = Equipment & {
  fields: EquipmentField[];
  files: EquipmentFileItem[];
};
