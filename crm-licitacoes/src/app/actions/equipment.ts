"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/rbac";
import {
  equipmentSchema,
  EQUIPMENT_FILE_CATEGORIES,
  type EquipmentFormValues,
  type EquipmentFileCategory,
  type EquipmentWithFields,
} from "@/types/equipment";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";

export type { ActionResult };

// ---------------------------------------------------------------------------
// Cadastro de Equipamentos — catálogo de máquinas/equipamentos da empresa,
// independente de qualquer processo/licitação. Qualquer usuário autenticado pode
// consultar/cadastrar/editar (é dado operacional de referência, não algo sensível
// por estado ou por dinheiro); excluir um equipamento é restrito a administradores,
// mesmo padrão já usado para excluir processo/evento/usuário.
// ---------------------------------------------------------------------------

// 3MB — mesmo limite e mesmo raciocínio de actions/attachments.ts e actions/documents.ts:
// armazenamento como data URL (base64 infla ~33% o payload) dentro da margem de payload
// de Serverless Functions da Vercel (plano Hobby, ~4.5MB).
const MAX_FILE_SIZE = 3 * 1024 * 1024;

export async function listEquipment() {
  await requireUser();
  const equipment = await prisma.equipment.findMany({
    include: {
      fields: { orderBy: { order: "asc" } },
      files: { orderBy: { uploadedAt: "desc" } },
    },
    orderBy: { object: "asc" },
  });
  // `EquipmentFile.category` é `String` no schema (ver comentário no topo do schema.prisma)
  // — sobrescrevemos com o union type em EquipmentWithFields, mesmo padrão de
  // listDeals/getDeal em actions/deals.ts.
  return equipment as unknown as EquipmentWithFields[];
}

/** Nomes de campos característicos já usados em algum equipamento (não os valores) —
 * usado para pré-preencher um card novo, ver EquipmentFieldTemplate no schema. */
export async function listEquipmentFieldTemplates() {
  await requireUser();
  return prisma.equipmentFieldTemplate.findMany({ orderBy: { order: "asc" } });
}

/** Registra no catálogo de nomes de campo qualquer rótulo novo encontrado nos campos
 * salvos agora — para que apareça pré-preenchido (com valor vazio) em cards futuros.
 * Nunca remove nomes (excluir um campo de UM card não deve afetar os demais). */
async function upsertFieldTemplates(labels: string[]) {
  const unique = Array.from(new Set(labels.map((l) => l.trim()).filter(Boolean)));
  if (unique.length === 0) return;

  const existing = await prisma.equipmentFieldTemplate.findMany({ select: { label: true } });
  const existingSet = new Set(existing.map((e) => e.label));
  const toCreate = unique.filter((label) => !existingSet.has(label));
  if (toCreate.length === 0) return;

  const maxOrder = await prisma.equipmentFieldTemplate.aggregate({ _max: { order: true } });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  await prisma.equipmentFieldTemplate.createMany({
    data: toCreate.map((label) => ({ label, order: nextOrder++ })),
    skipDuplicates: true,
  });
}

export async function createEquipment(input: EquipmentFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = equipmentSchema.parse(input);

    const equipment = await prisma.equipment.create({
      data: {
        object: data.object,
        model: data.model || null,
        createdById: user.id,
        fields: {
          create: data.fields.map((f, index) => ({
            label: f.label,
            value: f.value || null,
            order: index,
          })),
        },
      },
    });

    await upsertFieldTemplates(data.fields.map((f) => f.label));

    revalidatePath("/equipamentos");
    return { success: true, data: { id: equipment.id } };
  } catch (err) {
    console.error("[equipment] createEquipment falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

export async function updateEquipment(id: string, input: EquipmentFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const data = equipmentSchema.parse(input);

    // Mesmo padrão de apagar-e-recriar já usado para os Itens do Processo (DealItem):
    // mais simples que diffar campo a campo, e seguro porque EquipmentField não tem
    // relações próprias dependentes (só o onDelete: Cascade a partir de Equipment).
    await prisma.$transaction(async (tx) => {
      await tx.equipment.update({
        where: { id },
        data: { object: data.object, model: data.model || null },
      });
      await tx.equipmentField.deleteMany({ where: { equipmentId: id } });
      if (data.fields.length > 0) {
        await tx.equipmentField.createMany({
          data: data.fields.map((f, index) => ({
            equipmentId: id,
            label: f.label,
            value: f.value || null,
            order: index,
          })),
        });
      }
    });

    await upsertFieldTemplates(data.fields.map((f) => f.label));

    revalidatePath("/equipamentos");
    return { success: true, data: { id } };
  } catch (err) {
    console.error("[equipment] updateEquipment falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Restrito a administradores — exclui só o equipamento clicado (por id), nunca outros;
 * seus campos vão junto via onDelete: Cascade no schema. */
export async function deleteEquipment(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    requireAdmin(user);
    await prisma.equipment.delete({ where: { id } });
    revalidatePath("/equipamentos");
    return { success: true, data: null };
  } catch (err) {
    console.error("[equipment] deleteEquipment falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Upload de Foto ou Ficha Técnica de um equipamento via FormData (Server Action) —
 * arquivo é armazenado como data URL, mesmo padrão de actions/attachments.ts e
 * actions/documents.ts. Aberto a qualquer usuário autenticado, mesmo padrão de
 * criar/editar equipamento (só excluir é restrito a administradores). */
export async function uploadEquipmentFile(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const equipmentId = String(formData.get("equipmentId") ?? "");
    const category = String(formData.get("category") ?? "");
    const file = formData.get("file");

    if (!equipmentId) return { success: false, error: "Equipamento inválido." };
    if (!EQUIPMENT_FILE_CATEGORIES.includes(category as EquipmentFileCategory)) {
      return { success: false, error: "Categoria de arquivo inválida." };
    }
    if (!(file instanceof File)) return { success: false, error: "Nenhum arquivo enviado." };
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `Arquivo excede o limite de ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB.` };
    }

    await prisma.equipment.findUniqueOrThrow({ where: { id: equipmentId } });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const fileType = file.type || "application/octet-stream";
    const fileUrl = `data:${fileType};base64,${base64}`;

    const created = await prisma.equipmentFile.create({
      data: { equipmentId, category, fileName: file.name, fileUrl, fileType, size: file.size },
    });

    revalidatePath("/equipamentos");
    return { success: true, data: { id: created.id } };
  } catch (err) {
    console.error("[equipment] uploadEquipmentFile falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Restrito a administradores — mesmo padrão de deleteAttachment/deleteFile. */
export async function deleteEquipmentFile(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    requireAdmin(user);
    await prisma.equipmentFile.delete({ where: { id } });
    revalidatePath("/equipamentos");
    return { success: true, data: null };
  } catch (err) {
    console.error("[equipment] deleteEquipmentFile falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}
