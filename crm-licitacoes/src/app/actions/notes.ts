"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { noteSchema } from "@/types/deal";

export async function listNotes(dealId: string) {
  const user = await requireUser();
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assertCanAccessState(user, deal.state);

  return prisma.note.findMany({
    where: { dealId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function addNote(input: { dealId: string; text: string }) {
  const user = await requireUser();
  const data = noteSchema.parse(input);

  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: data.dealId } });
  assertCanAccessState(user, deal.state);

  const note = await prisma.note.create({
    data: { dealId: data.dealId, userId: user.id, text: data.text },
    include: { user: true },
  });

  await logAudit({ dealId: data.dealId, userId: user.id, action: "Adicionou uma observação" });

  revalidatePath("/");
  return note;
}
