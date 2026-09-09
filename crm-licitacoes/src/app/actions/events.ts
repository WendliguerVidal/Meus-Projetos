"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { eventSchema, type EventFormValues, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/types/event";
import { CATEGORY_COLORS, CATEGORY_LABELS, type DealCategory } from "@/types/deal";
import type { CalendarItem, EventStatus } from "@/types/event";
import type { Prisma } from "@prisma/client";

export type CalendarFilters = {
  start: Date;
  end: Date;
  /** Quando informado, restringe os Events (não os prazos de Deal) a esses status. */
  statuses?: EventStatus[];
  /** Mostrar prazos de processos em andamento/paralisados como marcadores automáticos. */
  includeDealDeadlines?: boolean;
};

/** Lista os itens do calendário no intervalo informado: prazos de processos (Deal.deadline)
 * + Events criados manualmente, já filtrados pelo RBAC por estado do usuário. */
export async function listCalendarItems(filters: CalendarFilters): Promise<CalendarItem[]> {
  const user = await requireUser();
  const scoped = user.role === "ADMIN" ? "all" : user.allowedStates;
  const { start, end, statuses, includeDealDeadlines = true } = filters;

  const dealWhere: Prisma.DealWhereInput = {
    deadline: { gte: start, lte: end },
    category: { in: ["ANDAMENTO", "PARALISADA"] },
    ...(scoped !== "all" ? { state: { in: scoped } } : {}),
  };

  const eventWhere: Prisma.EventWhereInput = {
    AND: [
      { startDate: { lte: end } },
      { OR: [{ endDate: { gte: start } }, { endDate: null, startDate: { gte: start } }] },
      // `statuses` explicitamente vazio (usuário desmarcou todos os filtros) deve
      // resultar em zero eventos — por isso o teste é `!== undefined`, não `.length`.
      ...(statuses !== undefined ? [{ status: { in: statuses } }] : []),
      ...(scoped !== "all" ? [{ OR: [{ dealId: null }, { deal: { state: { in: scoped } } }] }] : []),
    ],
  };

  const [deals, events] = await Promise.all([
    includeDealDeadlines
      ? prisma.deal.findMany({ where: dealWhere, select: { id: true, title: true, client: true, category: true, deadline: true } })
      : Promise.resolve([]),
    prisma.event.findMany({
      where: eventWhere,
      include: { deal: { select: { id: true, title: true, client: true, state: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const deadlineItems: CalendarItem[] = deals.map((d) => ({
    id: `deal-${d.id}`,
    kind: "deal-deadline",
    title: d.title,
    description: null,
    startDate: d.deadline as Date,
    endDate: null,
    status: "ABERTO",
    statusLabel: CATEGORY_LABELS[d.category as DealCategory] ?? d.category,
    color: CATEGORY_COLORS[d.category as DealCategory] ?? "#94a3b8",
    estimatedValue: null,
    dealId: d.id,
    org: d.client,
  }));

  const eventItems: CalendarItem[] = events.map((e) => ({
    id: e.id,
    kind: "event",
    title: e.title,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    status: e.status as EventStatus,
    statusLabel: EVENT_STATUS_LABELS[e.status as EventStatus] ?? e.status,
    color: EVENT_STATUS_COLORS[e.status as EventStatus] ?? "#3b82f6",
    estimatedValue: e.estimatedValue,
    dealId: e.dealId,
    org: e.deal?.client ?? null,
  }));

  return [...deadlineItems, ...eventItems].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export async function createEvent(input: EventFormValues) {
  const user = await requireUser();
  const data = eventSchema.parse(input);

  if (data.dealId) {
    const deal = await prisma.deal.findUniqueOrThrow({ where: { id: data.dealId } });
    assertCanAccessState(user, deal.state);
  }

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description || null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      status: data.status,
      estimatedValue: data.estimatedValue ?? null,
      dealId: data.dealId || null,
      createdById: user.id,
    },
  });

  if (event.dealId) {
    await logAudit({
      dealId: event.dealId,
      userId: user.id,
      action: `Criou o evento de calendário "${event.title}"`,
    });
  }

  revalidatePath("/calendario");
  return event;
}

export async function updateEvent(id: string, input: EventFormValues) {
  const user = await requireUser();
  const data = eventSchema.parse(input);

  const existing = await prisma.event.findUniqueOrThrow({ where: { id }, include: { deal: true } });
  if (existing.deal) assertCanAccessState(user, existing.deal.state);
  if (data.dealId) {
    const deal = await prisma.deal.findUniqueOrThrow({ where: { id: data.dealId } });
    assertCanAccessState(user, deal.state);
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      status: data.status,
      estimatedValue: data.estimatedValue ?? null,
      dealId: data.dealId || null,
    },
  });

  const dealIdForLog = event.dealId ?? existing.dealId;
  if (dealIdForLog) {
    await logAudit({
      dealId: dealIdForLog,
      userId: user.id,
      action: `Atualizou o evento de calendário "${event.title}"`,
    });
  }

  revalidatePath("/calendario");
  return event;
}

export async function deleteEvent(id: string) {
  const user = await requireUser();
  const existing = await prisma.event.findUniqueOrThrow({ where: { id }, include: { deal: true } });
  if (existing.deal) assertCanAccessState(user, existing.deal.state);

  await prisma.event.delete({ where: { id } });

  if (existing.dealId) {
    await logAudit({
      dealId: existing.dealId,
      userId: user.id,
      action: `Excluiu o evento de calendário "${existing.title}"`,
    });
  }

  revalidatePath("/calendario");
}
