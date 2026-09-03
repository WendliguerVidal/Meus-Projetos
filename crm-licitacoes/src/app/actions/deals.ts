"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState, stateScopeWhere } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  dealSchema,
  moveDealSchema,
  CATEGORY_LABELS,
  CATEGORY_STATUSES,
  type DealCategory,
  type DealFormValues,
} from "@/types/deal";
import type { Prisma } from "@prisma/client";
import type { DealWithRelations } from "@/types";

export type DealFilters = {
  category?: DealCategory;
  states?: string[];
  city?: string;
  search?: string;
  assignedToId?: string;
  archivedYear?: number;
  archivedMonth?: number;
};

function buildWhere(filters: DealFilters | undefined, scopedStates: string[] | "all") {
  const where: Prisma.DealWhereInput = {};

  if (scopedStates !== "all") {
    where.state = { in: scopedStates };
  }
  if (filters?.states?.length) {
    where.state = scopedStates === "all"
      ? { in: filters.states }
      : { in: filters.states.filter((s) => scopedStates.includes(s)) };
  }
  if (filters?.category) where.category = filters.category;
  if (filters?.city) where.city = { contains: filters.city };
  if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters?.archivedYear) where.archivedYear = filters.archivedYear;
  if (filters?.archivedMonth) where.archivedMonth = filters.archivedMonth;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { client: { contains: filters.search } },
      { city: { contains: filters.search } },
      { equipment: { contains: filters.search } },
      { serialNumber: { contains: filters.search } },
    ];
  }
  return where;
}

export async function listDeals(filters?: DealFilters) {
  const user = await requireUser();
  const scoped = user.role === "ADMIN" ? "all" : user.allowedStates;
  if (scoped !== "all" && scoped.length === 0) return [];

  const where = buildWhere(filters, scoped);

  const deals = await prisma.deal.findMany({
    where,
    include: {
      createdBy: true,
      assignedTo: true,
      _count: { select: { notes: true, reminders: true, attachments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return deals as unknown as DealWithRelations[];
}

export async function getDeal(id: string) {
  const user = await requireUser();
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id },
    include: { createdBy: true, assignedTo: true },
  });
  assertCanAccessState(user, deal.state);
  return deal as unknown as DealWithRelations;
}

export async function createDeal(input: DealFormValues) {
  const user = await requireUser();
  const data = dealSchema.parse(input);
  assertCanAccessState(user, data.state);

  const deal = await prisma.deal.create({
    data: {
      title: data.title,
      client: data.client,
      city: data.city,
      state: data.state,
      equipment: data.equipment || null,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      category: data.category,
      status: data.status,
      lossReason: data.category === "PERDIDO" ? data.lossReason : null,
      lossDetail: data.category === "PERDIDO" ? data.lossDetail : null,
      deadline: data.deadline ?? null,
      createdById: user.id,
      assignedToId: data.assignedToId || null,
    },
  });

  await logAudit({
    dealId: deal.id,
    userId: user.id,
    action: `Criou o processo "${deal.title}"`,
    details: { category: deal.category, status: deal.status, state: deal.state },
  });

  revalidatePath("/");
  return deal;
}

export async function updateDeal(id: string, input: DealFormValues) {
  const user = await requireUser();
  const data = dealSchema.parse(input);

  const existing = await prisma.deal.findUniqueOrThrow({ where: { id } });
  assertCanAccessState(user, existing.state);
  assertCanAccessState(user, data.state);

  const archived = data.category === "ARQUIVADO";
  const now = new Date();

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title: data.title,
      client: data.client,
      city: data.city,
      state: data.state,
      equipment: data.equipment || null,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      category: data.category,
      status: data.status,
      lossReason: data.category === "PERDIDO" ? data.lossReason : null,
      lossDetail: data.category === "PERDIDO" ? data.lossDetail : null,
      deadline: data.deadline ?? null,
      assignedToId: data.assignedToId || null,
      archivedYear: archived ? existing.archivedYear ?? now.getFullYear() : null,
      archivedMonth: archived ? existing.archivedMonth ?? now.getMonth() + 1 : null,
    },
  });

  const changes: string[] = [];
  if (existing.category !== deal.category) {
    changes.push(
      `Alterou categoria de "${CATEGORY_LABELS[existing.category as DealCategory]}" para "${CATEGORY_LABELS[deal.category as DealCategory]}"`
    );
  }
  if (existing.status !== deal.status) {
    changes.push(`Alterou status de "${existing.status}" para "${deal.status}"`);
  }
  if (existing.assignedToId !== deal.assignedToId) {
    changes.push("Alterou o responsável pelo processo");
  }
  if (existing.title !== deal.title || existing.client !== deal.client) {
    changes.push("Atualizou dados gerais do processo");
  }

  for (const action of changes) {
    await logAudit({ dealId: deal.id, userId: user.id, action });
  }
  if (changes.length === 0) {
    await logAudit({ dealId: deal.id, userId: user.id, action: "Atualizou o processo" });
  }

  revalidatePath("/");
  return deal;
}

/** Usado pelo Kanban (drag-and-drop): atualiza categoria/status rapidamente. */
export async function moveDeal(input: { id: string; category: DealCategory; status: string }) {
  const user = await requireUser();
  const data = moveDealSchema.parse(input);

  if (!CATEGORY_STATUSES[data.category]?.includes(data.status)) {
    throw new Error("Status inválido para a categoria informada.");
  }

  const existing = await prisma.deal.findUniqueOrThrow({ where: { id: data.id } });
  assertCanAccessState(user, existing.state);

  if (data.category === "PERDIDO" && !existing.lossReason) {
    throw new Error("Preencha o motivo da perda antes de mover para Perdido.");
  }

  const archived = data.category === "ARQUIVADO";
  const now = new Date();

  const deal = await prisma.deal.update({
    where: { id: data.id },
    data: {
      category: data.category,
      status: data.status,
      archivedYear: archived ? existing.archivedYear ?? now.getFullYear() : null,
      archivedMonth: archived ? existing.archivedMonth ?? now.getMonth() + 1 : null,
    },
  });

  if (existing.category !== deal.category) {
    await logAudit({
      dealId: deal.id,
      userId: user.id,
      action: `Moveu de "${CATEGORY_LABELS[existing.category as DealCategory]}" para "${CATEGORY_LABELS[deal.category as DealCategory]}" (${deal.status})`,
    });
  } else {
    await logAudit({
      dealId: deal.id,
      userId: user.id,
      action: `Alterou status para "${deal.status}"`,
    });
  }

  revalidatePath("/");
  return deal;
}

export async function deleteDeal(id: string) {
  const user = await requireUser();
  const existing = await prisma.deal.findUniqueOrThrow({ where: { id } });
  assertCanAccessState(user, existing.state);

  await logAudit({ dealId: id, userId: user.id, action: `Excluiu o processo "${existing.title}"` });
  await prisma.deal.delete({ where: { id } });

  revalidatePath("/");
}

export async function getDashboardStats(filters?: DealFilters) {
  const deals = await listDeals(filters);

  const totalsByCategory = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1;
    return acc;
  }, {});

  const ganho = totalsByCategory.GANHO ?? 0;
  const perdido = totalsByCategory.PERDIDO ?? 0;
  const conversionRate = ganho + perdido > 0 ? (ganho / (ganho + perdido)) * 100 : 0;

  const lossReasonCounts = deals
    .filter((d) => d.category === "PERDIDO" && d.lossReason)
    .reduce<Record<string, number>>((acc, d) => {
      const key = d.lossReason as string;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const upcomingDeadlines = deals
    .filter((d) => d.deadline && !["GANHO", "PERDIDO", "CONCLUIDO", "ARQUIVADO"].includes(d.category))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 10);

  return { totalsByCategory, conversionRate, lossReasonCounts, upcomingDeadlines, total: deals.length };
}
