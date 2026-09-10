import { z } from "zod";
import { BRAZIL_STATES } from "./deal";
import type { UrgencyLevel } from "@/lib/urgency";

// ---------------------------------------------------------------------------
// Repositório de Documentos — hierarquia de 2 níveis: Pasta de Estado (raiz, uma por
// UF) -> Subpastas personalizadas (opcionais) -> Arquivos. Arquivos também podem ficar
// direto na raiz do Estado. Ver a doc do model DocumentFolder em schema.prisma.
// ---------------------------------------------------------------------------

/** Paleta de cores para o ícone de pasta no grid — só dá variedade visual, não tem
 * significado (ao contrário de CATEGORY_COLORS em types/deal.ts). Uma é sorteada a
 * cada pasta criada. */
export const DOCUMENT_FOLDER_COLORS = [
  "#3b82f6", // azul
  "#8b5cf6", // roxo
  "#ec4899", // rosa
  "#f97316", // laranja
  "#eab308", // amarelo
  "#22c55e", // verde
  "#14b8a6", // teal
  "#6b7280", // cinza
] as const;

export function randomFolderColor(): string {
  return DOCUMENT_FOLDER_COLORS[Math.floor(Math.random() * DOCUMENT_FOLDER_COLORS.length)] ?? DOCUMENT_FOLDER_COLORS[0];
}

/** Nome completo de cada UF — só para exibição (subtítulo do card da pasta de Estado). */
export const STATE_NAMES: Record<(typeof BRAZIL_STATES)[number], string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

/** Sugestões de nome para o botão "+ Nova Subpasta" — atalhos comuns de documentação de
 * habilitação em licitações; o usuário pode digitar qualquer outro nome, não é uma
 * lista fechada. */
export const SUGGESTED_SUBFOLDER_NAMES = [
  "CND Federal",
  "CND Estadual",
  "CND Municipal",
  "CND Trabalhista",
  "FGTS",
  "Falência e Concordata",
  "Inscrição Estadual",
  "Inscrição Municipal",
  "Alvará",
] as const;

export const folderNameSchema = z.object({
  name: z.string().trim().min(1, "Digite um nome para a pasta").max(100, "Nome muito longo"),
});

export type FolderNameFormValues = z.infer<typeof folderNameSchema>;

export const createStateFolderSchema = z.object({
  state: z.enum(BRAZIL_STATES, { errorMap: () => ({ message: "Selecione um estado" }) }),
});

/** Campos de validade/observações do documento — usados tanto ao enviar quanto ao
 * editar um arquivo. `expiryDate` vem de um <input type="date"> (string "yyyy-MM-dd")
 * ou vazio; `notes` é texto livre opcional. */
export const documentFileMetaSchema = z.object({
  name: z.string().trim().min(1, "Digite um nome para o arquivo").max(200, "Nome muito longo"),
  expiryDate: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.coerce.date().nullable()
  ).optional(),
  notes: z.string().trim().max(2000, "Observação muito longa").optional().or(z.literal("")),
});

export type DocumentFileMetaFormValues = z.infer<typeof documentFileMetaSchema>;

/** Mesmos campos de validade/observações, sem `name` — o upload usa o nome do próprio
 * arquivo enviado; só a edição posterior permite renomear (ver documentFileMetaSchema). */
export const documentUploadMetaSchema = documentFileMetaSchema.omit({ name: true });

export type DocumentUploadMetaFormValues = z.infer<typeof documentUploadMetaSchema>;

// ---------------------------------------------------------------------------
// DTOs retornados pelas Server Actions
// ---------------------------------------------------------------------------

/** Pasta (de Estado ou subpasta), como listada num grid — contagem e urgência já
 * agregam os arquivos dentro dela (e das subpastas, no caso de uma pasta de Estado). */
export type DocumentFolderSummary = {
  id: string;
  name: string;
  color: string;
  state: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  fileCount: number;
  urgencyLevel: UrgencyLevel | null;
};

export type DocumentFileItem = {
  id: string;
  name: string;
  url: string;
  fileType: string;
  size: number;
  folderId: string;
  expiryDate: Date | null;
  notes: string | null;
  createdAt: Date;
};

/** Pasta aberta (tela /documentos/[folderId]) — inclui o pai (para a trilha/breadcrumb),
 * as subpastas (vazio quando a própria pasta já é uma subpasta) e os arquivos diretos. */
export type DocumentFolderDetail = {
  id: string;
  name: string;
  color: string;
  state: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  subfolders: DocumentFolderSummary[];
  files: DocumentFileItem[];
};
