"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState, stateScopeWhere } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { reminderSchema, reminderStatusSchema } from "@/types/deal";

export async function listReminders(dealId: string) {
  const user = await requireUser();
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assertCanAccessState(user, deal.state);

  return prisma.reminder.findMany({
    where: { dealId },
    include: { assignedTo: true },
    orderBy: { dueDate: "asc" },
  });
}

/** Lembretes pendentes com vencimento hoje (para o badge do header) e vencidos. */
export async function listTodayReminders() {
  const user = await requireUser();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.reminder.findMany({
    where: {
      status: "PENDING",
      dueDate: { lte: endOfDay },
      assignedToId: user.id,
      deal: stateScopeWhere(user),
    },
    include: { deal: true, assignedTo: true },
    orderBy: { dueDate: "asc" },
  });
}

export async function createReminder(input: {
  dealId: string;
  assignedToId: string;
  dueDate: string;
  description: string;
}) {
  try {
    const user = await requireUser();
    const data = reminderSchema.parse(input);

    const deal = await prisma.deal.findUniqueOrThrow({ where: { id: data.dealId } });
    assertCanAccessState(user, deal.state);

    const reminder = await prisma.reminder.create({
      data: {
        dealId: data.dealId,
        assignedToId: data.assignedToId,
        description: data.description,
        dueDate: new Date(data.dueDate),
      },
      include: { assignedTo: true },
    });

    await logAudit({ dealId: data.dealId, userId: user.id, action: `Criou lembrete: "${data.description}"` });
    revalidatePath("/");

    // Garante que apenas um objeto plano (sem classes/Date/prototypes) volte para o Server Action.
    return JSON.parse(JSON.stringify(reminder));
  } catch (error: any) {
    // Evita que classes complexas (erros do Prisma/Zod) voltem pro cliente e travem o Next.js.
    console.error("Erro interno ao criar lembrete:", error);
    throw new Error(typeof error?.message === "string" ? error.message : "Falha ao processar a criação do lembrete.");
  }
}

export async function setReminderStatus(input: { id: string; status: "PENDING" | "DONE" }) {
  const user = await requireUser();
  const data = reminderStatusSchema.parse(input);

  const existing = await prisma.reminder.findUniqueOrThrow({
    where: { id: data.id },
    include: { deal: true },
  });
  assertCanAccessState(user, existing.deal.state);

  const reminder = await prisma.reminder.update({
    where: { id: data.id },
    data: { status: data.status },
    include: { assignedTo: true },
  });

  await logAudit({
    dealId: existing.dealId,
    userId: user.id,
    action: data.status === "DONE" ? "Concluiu um lembrete" : "Reabriu um lembrete",
  });

  revalidatePath("/");
  return JSON.parse(JSON.stringify(reminder));
}
