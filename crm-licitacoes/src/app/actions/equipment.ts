"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { equipmentSchema, type EquipmentFormValues } from "@/types/equipment";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";

export type { ActionResult };

// ---------------------------------------------------------------------------
// Cadastro de Equipamentos — catálogo de máquinas/equipamentos da empresa,
// independente de qualquer processo/licitação. Qualquer usuário autenticado pode
// consultar/cadastrar/editar (é dado operacional de referência, não algo sensível
// por estado ou por dinheiro); excluir um equipamento é restrito a administradores,
// mesmo padrão já usado para excluir processo/evento/usuário.
// ---------------------------------------------------------------------------

export async function listEquipment() {
  await requireUser();
  return prisma.equipment.findMany({
    include: { fields: { orderBy: { order: "asc" } } },
    orderBy: { object: "asc" },
  });
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
