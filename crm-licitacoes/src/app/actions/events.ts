"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { eventSchema, type EventFormValues, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/types/event";
import { CATEGORY_COLORS, CATEGORY_LABELS, NON_ARCHIVED_CATEGORIES, type DealCategory } from "@/types/deal";
import type { CalendarItem, EventStatus } from "@/types/event";
import type { Prisma } from "@prisma/client";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";
import { getDealUrgency, getEventUrgency } from "@/lib/urgency";

export type { ActionResult };

export type CalendarFilters = {
  start: Date;
  end: Date;
  /** Quando informado, restringe os Events (não os prazos de Deal) a esses status. */
  statuses?: EventStatus[];
  /** Categorias de processo (Deal) a exibir — vazio explícito ([]) esconde todos os
   * processos; `undefined` usa o padrão (todas exceto Arquivado). */
  dealCategories?: DealCategory[];
};

/** Lista os itens do calendário: TODOS os processos que casarem com `dealCategories`
 * (sem nenhum filtro de data — um processo nunca é descartado por ter prazo passado,
 * futuro ou ausente) + Events criados manualmente no intervalo informado, já filtrados
 * pelo RBAC por estado do usuário. Cada processo é posicionado pela sua "data principal":
 * `deadline`, e quando ausente, `createdAt` (sempre presente) como fallback. */
export async function listCalendarItems(filters: CalendarFilters): Promise<CalendarItem[]> {
  const user = await requireUser();
  const scoped = user.role === "ADMIN" ? "all" : user.allowedStates;
  const { start, end, statuses, dealCategories } = filters;

  const dealWhere: Prisma.DealWhereInput = {
    category: { in: dealCategories ?? NON_ARCHIVED_CATEGORIES },
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
    // Sem filtro de data proposital: um processo precisa aparecer no calendário
    // independentemente de quando seu prazo cai (passado, futuro, ou nem preenchido) —
    // é o cliente (agrupado por dia) que decide o que renderizar na visão atual.
    // `dealCategories` explicitamente vazio ({in: []}) já resulta em zero processos.
    prisma.deal.findMany({
      where: dealWhere,
      select: { id: true, title: true, client: true, category: true, deadline: true, createdAt: true, updatedAt: true },
    }),
    // Isolado num catch próprio: se a tabela `events` ainda não existir no banco (schema
    // pendente de `prisma db push`) ou qualquer outro erro específico de Event ocorrer,
    // isso não pode derrubar a listagem de processos — o calendário deve continuar
    // funcional mesmo com o recurso de Eventos manuais temporariamente indisponível.
    prisma.event
      .findMany({
        where: eventWhere,
        include: { deal: { select: { id: true, title: true, client: true, state: true } } },
        orderBy: { startDate: "asc" },
      })
      .catch((err) => {
        console.error("[calendario] Falha ao buscar Events (rode `npx prisma db push` se a tabela `events` não existir ainda):", err);
        return [];
      }),
  ]);

  const deadlineItems: CalendarItem[] = deals.map((d) => ({
    id: `deal-${d.id}`,
    kind: "deal-deadline",
    title: d.title,
    description: null,
    startDate: d.deadline ?? d.createdAt ?? d.updatedAt,
    endDate: null,
    status: "ABERTO",
    statusLabel: CATEGORY_LABELS[d.category as DealCategory] ?? d.category,
    color: CATEGORY_COLORS[d.category as DealCategory] ?? "#94a3b8",
    estimatedValue: null,
    dealId: d.id,
    org: d.client,
    // Urgência calculada a partir do prazo de verdade (`deadline`), nunca do fallback
    // usado só para posicionar o marcador no dia (createdAt/updatedAt) — sem prazo
    // definido não há nada de "atrasado" a destacar.
    urgencyLevel: getDealUrgency(d.deadline, d.category),
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
    urgencyLevel: getEventUrgency(e.startDate, e.status),
  }));

  return [...deadlineItems, ...eventItems].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export async function createEvent(input: EventFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    // `.parse` lança ZodError em dados inválidos — capturado abaixo e convertido numa
    // mensagem amigável (nunca deixamos a exceção crua chegar ao cliente).
    const data = eventSchema.parse(input);

    if (data.dealId) {
      const deal = await prisma.deal.findUniqueOrThrow({ where: { id: data.dealId } });
      assertCanAccessState(user, deal.state);
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description || null,
        // `startDate`/`endDate` já chegam aqui como `Date` válidos — convertidos pelo
        // schema Zod (z.coerce.date()) a partir da string do <input type="datetime-local">.
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        status: data.status,
        // Zod já normaliza para Number ou null antes de chegar aqui (ver eventSchema).
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
    return { success: true, data: { id: event.id } };
  } catch (err) {
    console.error("[events] createEvent falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

export async function updateEvent(id: string, input: EventFormValues): Promise<ActionResult<{ id: string }>> {
  try {
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
    return { success: true, data: { id: event.id } };
  } catch (err) {
    console.error("[events] updateEvent falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
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
    return { success: true, data: null };
  } catch (err) {
    console.error("[events] deleteEvent falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}
