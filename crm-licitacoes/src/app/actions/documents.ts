"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";
import { getDocumentUrgency, worstUrgency } from "@/lib/urgency";
import {
  folderNameSchema,
  createStateFolderSchema,
  documentFileMetaSchema,
  documentUploadMetaSchema,
  randomFolderColor,
  type DocumentFolderSummary,
  type DocumentFolderDetail,
  type DocumentFileItem,
} from "@/types/document";
import type { Prisma } from "@prisma/client";

// 3MB — mesmo limite e mesmo raciocínio de actions/attachments.ts: armazenamento como
// data URL (base64 infla ~33% o payload) dentro da margem de payload de Serverless
// Functions da Vercel (plano Hobby, ~4.5MB).
const MAX_FILE_SIZE = 3 * 1024 * 1024;

/** Repositório de Documentos: não tem relação com processos/estados (RBAC por UF não
 * se aplica aqui) — qualquer usuário autenticado vê e gerencia todas as pastas, como um
 * repositório de arquivos compartilhado da equipe. "Estado" aqui é só um rótulo de
 * organização (uma pasta raiz por UF), não um filtro de permissão. */

const folderInclude = {
  files: { select: { id: true, expiryDate: true } },
  subfolders: { include: { files: { select: { id: true, expiryDate: true } } } },
} satisfies Prisma.DocumentFolderInclude;

type FolderWithNested = Prisma.DocumentFolderGetPayload<{ include: typeof folderInclude }>;

/** Contagem de arquivos (diretos + das subpastas) e pior nível de urgência entre eles —
 * um único documento vencido já deixa a pasta inteira "vermelha" no grid. */
function summarize(folder: FolderWithNested): DocumentFolderSummary {
  const directLevels = folder.files.map((f) => getDocumentUrgency(f.expiryDate));
  const nestedLevels = folder.subfolders.flatMap((s) => s.files.map((f) => getDocumentUrgency(f.expiryDate)));
  const fileCount = folder.files.length + folder.subfolders.reduce((sum, s) => sum + s.files.length, 0);

  return {
    id: folder.id,
    name: folder.name,
    color: folder.color,
    state: folder.state,
    parentId: folder.parentId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    fileCount,
    urgencyLevel: worstUrgency([...directLevels, ...nestedLevels]),
  };
}

/** Pastas de Estado (raiz do grid em /documentos) — uma por UF, no máximo 27. */
export async function listStateFolders(): Promise<DocumentFolderSummary[]> {
  await requireUser();
  const folders = await prisma.documentFolder.findMany({
    where: { parentId: null, state: { not: null } },
    include: folderInclude,
    orderBy: { state: "asc" },
  });
  return folders.map(summarize);
}

export async function createStateFolder(input: { state: string }): Promise<ActionResult<DocumentFolderSummary>> {
  try {
    const user = await requireUser();
    const data = createStateFolderSchema.parse(input);

    const existing = await prisma.documentFolder.findFirst({ where: { state: data.state, parentId: null } });
    if (existing) return { success: false, error: `Já existe uma pasta para ${data.state}.` };

    const folder = await prisma.documentFolder.create({
      data: {
        // Nome é a sigla (ex: "MG") — o nome completo (STATE_NAMES) é só o subtítulo do
        // card no grid, ver documentos/page.tsx; evita mostrar "Minas Gerais" duas vezes.
        name: data.state,
        state: data.state,
        color: randomFolderColor(),
        createdBy: user.name || user.email || "Usuário",
      },
      include: folderInclude,
    });

    revalidatePath("/documentos");
    return { success: true, data: summarize(folder) };
  } catch (err) {
    console.error("[documents] createStateFolder falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Subpasta personalizada dentro de uma pasta de Estado (ex: "CND Federal", "FGTS") —
 * hierarquia fica limitada a 2 níveis: uma subpasta não pode ter subpastas próprias. */
export async function createSubfolder(parentId: string, input: { name: string }): Promise<ActionResult<DocumentFolderSummary>> {
  try {
    const user = await requireUser();
    const data = folderNameSchema.parse(input);

    const parent = await prisma.documentFolder.findUniqueOrThrow({ where: { id: parentId } });
    if (parent.parentId !== null) {
      return { success: false, error: "Não é possível criar uma subpasta dentro de outra subpasta." };
    }

    const folder = await prisma.documentFolder.create({
      data: { name: data.name, parentId, color: randomFolderColor(), createdBy: user.name || user.email || "Usuário" },
      include: folderInclude,
    });

    revalidatePath("/documentos");
    return { success: true, data: summarize(folder) };
  } catch (err) {
    console.error("[documents] createSubfolder falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Só renomeia subpastas — o nome de uma pasta de Estado vem da sigla UF (`state`) e não
 * é editável, para não dessincronizar da UF que ela representa. */
export async function renameFolder(id: string, input: { name: string }): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    await requireUser();
    const data = folderNameSchema.parse(input);

    const existing = await prisma.documentFolder.findUniqueOrThrow({ where: { id } });
    if (existing.state) {
      return { success: false, error: "O nome da pasta de um Estado não pode ser alterado." };
    }

    const folder = await prisma.documentFolder.update({ where: { id }, data: { name: data.name } });
    revalidatePath("/documentos");
    return { success: true, data: { id: folder.id, name: folder.name } };
  } catch (err) {
    console.error("[documents] renameFolder falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Exclui a pasta e, em cascata (onDelete: Cascade no schema — autorrelação de subpasta
 * e relação com DocumentFile), todas as subpastas e arquivos dentro dela. */
export async function deleteFolder(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.documentFolder.delete({ where: { id } });

    revalidatePath("/documentos");
    return { success: true, data: null };
  } catch (err) {
    console.error("[documents] deleteFolder falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Pasta aberta em /documentos/[folderId]: dados da própria pasta (com o pai, para a
 * trilha/breadcrumb), suas subpastas (vazio quando ela mesma já é uma subpasta) e seus
 * arquivos diretos. */
export async function getFolderDetail(id: string): Promise<DocumentFolderDetail> {
  await requireUser();
  const folder = await prisma.documentFolder.findUniqueOrThrow({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      files: { orderBy: { createdAt: "desc" } },
      subfolders: { include: folderInclude, orderBy: { name: "asc" } },
    },
  });

  return {
    id: folder.id,
    name: folder.name,
    color: folder.color,
    state: folder.state,
    parentId: folder.parentId,
    parent: folder.parent,
    subfolders: folder.subfolders.map(summarize),
    files: folder.files,
  };
}

/** Upload de arquivo via FormData (Server Action) — arquivo é armazenado como data URL,
 * mesmo padrão de actions/attachments.ts, com data de validade e observações opcionais. */
export async function uploadFile(formData: FormData): Promise<ActionResult<DocumentFileItem>> {
  try {
    const user = await requireUser();
    const folderId = String(formData.get("folderId") ?? "");
    const file = formData.get("file");
    const expiryDateRaw = formData.get("expiryDate");
    const notesRaw = formData.get("notes");

    if (!folderId) return { success: false, error: "Pasta inválida." };
    if (!(file instanceof File)) return { success: false, error: "Nenhum arquivo enviado." };
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `Arquivo excede o limite de ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB.` };
    }

    const meta = documentUploadMetaSchema.parse({
      expiryDate: expiryDateRaw ? String(expiryDateRaw) : undefined,
      notes: notesRaw ? String(notesRaw) : undefined,
    });

    await prisma.documentFolder.findUniqueOrThrow({ where: { id: folderId } });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const fileType = file.type || "application/octet-stream";
    const url = `data:${fileType};base64,${base64}`;

    const created = await prisma.documentFile.create({
      data: {
        folderId,
        name: file.name,
        url,
        fileType,
        size: file.size,
        expiryDate: meta.expiryDate ?? null,
        notes: meta.notes || null,
        uploadedBy: user.name || user.email || "Usuário",
      },
    });

    revalidatePath("/documentos");
    return { success: true, data: created };
  } catch (err) {
    console.error("[documents] uploadFile falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Edita nome, validade e observações de um arquivo já enviado — não troca o conteúdo
 * do arquivo (para reenviar, exclua e faça upload de novo). */
export async function updateFile(
  id: string,
  input: { name: string; expiryDate?: string | Date | null; notes?: string }
): Promise<ActionResult<DocumentFileItem>> {
  try {
    await requireUser();
    const data = documentFileMetaSchema.parse(input);

    const updated = await prisma.documentFile.update({
      where: { id },
      data: { name: data.name, expiryDate: data.expiryDate ?? null, notes: data.notes || null },
    });

    revalidatePath("/documentos");
    return { success: true, data: updated };
  } catch (err) {
    console.error("[documents] updateFile falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

export async function deleteFile(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.documentFile.delete({ where: { id } });

    revalidatePath("/documentos");
    return { success: true, data: null };
  } catch (err) {
    console.error("[documents] deleteFile falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}
