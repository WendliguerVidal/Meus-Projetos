"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// 3MB — armazenamento como data URL (base64 infla ~33% o payload; plataformas serverless
// como a Vercel (plano Hobby) limitam o corpo da requisição a ~4.5MB, então mantemos
// margem de segurança abaixo desse teto).
const MAX_FILE_SIZE = 3 * 1024 * 1024;

export async function listAttachments(dealId: string) {
  const user = await requireUser();
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assertCanAccessState(user, deal.state);

  return prisma.attachment.findMany({ where: { dealId }, orderBy: { uploadedAt: "desc" } });
}

/** Upload de anexo via FormData (Server Action) — arquivo é armazenado como data URL. */
export async function uploadAttachment(formData: FormData) {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  const file = formData.get("file");

  if (!dealId) throw new Error("Processo inválido.");
  if (!(file instanceof File)) throw new Error("Nenhum arquivo enviado.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Arquivo excede o limite de 3MB.");

  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assertCanAccessState(user, deal.state);

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const fileType = file.type || "application/octet-stream";
  const fileUrl = `data:${fileType};base64,${base64}`;

  const attachment = await prisma.attachment.create({
    data: { dealId, fileName: file.name, fileUrl, fileType },
  });

  await logAudit({ dealId, userId: user.id, action: `Anexou o arquivo "${file.name}"` });

  revalidatePath("/");
  return { id: attachment.id, fileName: attachment.fileName, fileType: attachment.fileType, uploadedAt: attachment.uploadedAt };
}

export async function deleteAttachment(id: string) {
  const user = await requireUser();
  const existing = await prisma.attachment.findUniqueOrThrow({ where: { id }, include: { deal: true } });
  assertCanAccessState(user, existing.deal.state);

  await prisma.attachment.delete({ where: { id } });
  await logAudit({ dealId: existing.dealId, userId: user.id, action: `Removeu o anexo "${existing.fileName}"` });

  revalidatePath("/");
}
