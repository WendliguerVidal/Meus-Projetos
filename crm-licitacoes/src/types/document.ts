import { z } from "zod";

// ---------------------------------------------------------------------------
// Repositório de Documentos — pastas visuais + arquivos dentro delas.
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

export const folderNameSchema = z.object({
  name: z.string().trim().min(1, "Digite um nome para a pasta").max(100, "Nome muito longo"),
});

export type FolderNameFormValues = z.infer<typeof folderNameSchema>;

export type DocumentFolderWithCount = {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { files: number };
};

export type DocumentFileItem = {
  id: string;
  name: string;
  url: string;
  fileType: string;
  size: number;
  folderId: string;
  createdAt: Date;
};
