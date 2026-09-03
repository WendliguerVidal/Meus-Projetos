"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState } from "@/lib/rbac";

export async function listAuditLogs(dealId: string) {
  const user = await requireUser();
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assertCanAccessState(user, deal.state);

  return prisma.auditLog.findMany({
    where: { dealId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}
