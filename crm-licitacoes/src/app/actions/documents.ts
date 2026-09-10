"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";
import { folderNameSchema, randomFolderColor, type DocumentFolderWithCount, type DocumentFileItem } from "@/types/document";

// 3MB — mesmo limite e mesmo raciocínio de actions/attachments.ts: armazenamento como
// data URL (base64 infla ~33% o payload) dentro da margem de payload de Serverless
// Functions da Vercel (plano Hobby, ~4.5MB).
const MAX_FILE_SIZE = 3 * 1024 * 1024;

/** Repositório de Documentos: não tem relação com processos/estados (RBAC por UF não
 * se aplica aqui) — qualquer usuário autenticado vê e gerencia todas as pastas, como um
 * repositório de arquivos compartilhado da equipe (editais modelo, manuais, etc.). */
export async function listFolders(): Promise<DocumentFolderWithCount[]> {
  await requireUser();
  return prisma.documentFolder.findMany({
    include: { _count: { select: { files: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createFolder(input: { name: string }): Promise<ActionResult<DocumentFolderWithCount>> {
  try {
    const user = await requireUser();
    const data = folderNameSchema.parse(input);

    const folder = await prisma.documentFolder.create({
      data: { name: data.name, color: randomFolderColor(), createdBy: user.name || user.email || "Usuário" },
      include: { _count: { select: { files: true } } },
    });

    revalidatePath("/documentos");
    return { success: true, data: folder };
  } catch (err) {
    console.error("[documents] createFolder falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

export async function renameFolder(id: string, input: { name: string }): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    await requireUser();
    const data = folderNameSchema.parse(input);

    const folder = await prisma.documentFolder.update({
      where: { id },
      data: { name: data.name },
    });

    revalidatePath("/documentos");
    return { success: true, data: { id: folder.id, name: folder.name } };
  } catch (err) {
    console.error("[documents] renameFolder falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Exclui a pasta e, em cascata (onDelete: Cascade no schema), todos os arquivos
 * dentro dela. */
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

export async function listFiles(folderId: string): Promise<DocumentFileItem[]> {
  await requireUser();
  return prisma.documentFile.findMany({
    where: { folderId },
    orderBy: { createdAt: "desc" },
  });
}

/** Upload de arquivo via FormData (Server Action) — arquivo é armazenado como data URL,
 * mesmo padrão de actions/attachments.ts. */
export async function uploadFile(formData: FormData): Promise<ActionResult<DocumentFileItem>> {
  try {
    const user = await requireUser();
    const folderId = String(formData.get("folderId") ?? "");
    const file = formData.get("file");

    if (!folderId) return { success: false, error: "Pasta inválida." };
    if (!(file instanceof File)) return { success: false, error: "Nenhum arquivo enviado." };
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `Arquivo excede o limite de ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB.` };
    }

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
