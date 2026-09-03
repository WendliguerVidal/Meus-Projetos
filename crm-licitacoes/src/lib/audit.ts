import "server-only";
import { prisma } from "./prisma";

/** Cria um registro imutável de auditoria vinculado a um processo. */
export async function logAudit(params: {
  dealId: string;
  userId: string;
  action: string;
  details?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      dealId: params.dealId,
      userId: params.userId,
      action: params.action,
      details:
        params.details !== undefined ? JSON.stringify(params.details) : null,
    },
  });
}
