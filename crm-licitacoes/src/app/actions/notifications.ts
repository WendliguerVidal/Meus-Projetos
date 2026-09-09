"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { CLOSED_DEAL_CATEGORIES, CLOSED_EVENT_STATUSES, getDealUrgency, getEventUrgency, formatUrgencyMessage, type UrgencyLevel } from "@/lib/urgency";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Central de Notificações do cabeçalho — processos e compromissos vencidos ou a
// vencer nos próximos 3 dias. Consulta leve: as janelas de data e as categorias/status
// já encerrados são filtrados no próprio banco (não trazemos tudo para filtrar depois
// em memória), então o custo cresce só com a quantidade de itens realmente urgentes.
// ---------------------------------------------------------------------------

export type UrgentItem = {
  id: string;
  kind: "deal" | "event";
  title: string;
  /** Cliente/órgão — do próprio processo, ou do processo vinculado ao evento. */
  org: string | null;
  date: Date;
  urgencyLevel: UrgencyLevel;
  /** Mensagem já formatada em português — "Vence hoje às 14:00", "Atrasado há 1 dia". */
  message: string;
  dealId: string | null;
};

const SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // mesma janela de 3 dias de lib/urgency
const MAX_ITEMS_PER_KIND = 30;

export async function getUrgentItems(): Promise<UrgentItem[]> {
  const user = await requireUser();
  const scoped = user.role === "ADMIN" ? "all" : user.allowedStates;
  if (scoped !== "all" && scoped.length === 0) return [];

  const windowEnd = new Date(Date.now() + SOON_WINDOW_MS);

  const dealWhere: Prisma.DealWhereInput = {
    // `lte` num campo opcional já exclui registros sem prazo — cobre tanto os vencidos
    // (deadline no passado) quanto os que vencem dentro da janela dos próximos 3 dias.
    deadline: { lte: windowEnd },
    category: { notIn: CLOSED_DEAL_CATEGORIES },
    ...(scoped !== "all" ? { state: { in: scoped } } : {}),
  };

  const eventWhere: Prisma.EventWhereInput = {
    startDate: { lte: windowEnd },
    status: { notIn: CLOSED_EVENT_STATUSES },
    ...(scoped !== "all" ? { OR: [{ dealId: null }, { deal: { state: { in: scoped } } }] } : {}),
  };

  const [deals, events] = await Promise.all([
    prisma.deal.findMany({
      where: dealWhere,
      select: { id: true, title: true, client: true, category: true, deadline: true },
      orderBy: { deadline: "asc" },
      take: MAX_ITEMS_PER_KIND,
    }),
    // Isolado num catch próprio, mesmo padrão de listCalendarItems: se a tabela `events`
    // ainda não existir no banco, a Central de Notificações continua funcional só com
    // os prazos de processo em vez de derrubar a página inteira.
    prisma.event
      .findMany({
        where: eventWhere,
        select: { id: true, title: true, startDate: true, status: true, dealId: true, deal: { select: { client: true } } },
        orderBy: { startDate: "asc" },
        take: MAX_ITEMS_PER_KIND,
      })
      .catch((err) => {
        console.error("[notifications] Falha ao buscar Events urgentes:", err);
        return [];
      }),
  ]);

  const dealItems: UrgentItem[] = deals
    // `deadline` é opcional no schema — o filtro do WHERE já garante que só chegam aqui
    // registros com prazo definido, mas o narrowing aqui evita um cast forçado abaixo.
    .filter((d): d is typeof d & { deadline: Date } => d.deadline !== null)
    .map((d) => ({
      id: `deal-${d.id}`,
      kind: "deal" as const,
      title: d.title,
      org: d.client,
      date: d.deadline,
      // Categoria e janela de data já garantidas pelo WHERE acima — nunca null aqui.
      urgencyLevel: getDealUrgency(d.deadline, d.category)!,
      message: formatUrgencyMessage(d.deadline),
      dealId: d.id,
    }));

  const eventItems: UrgentItem[] = events.map((e) => ({
    id: e.id,
    kind: "event" as const,
    title: e.title,
    org: e.deal?.client ?? null,
    date: e.startDate,
    urgencyLevel: getEventUrgency(e.startDate, e.status)!,
    message: formatUrgencyMessage(e.startDate),
    dealId: e.dealId,
  }));

  return [...dealItems, ...eventItems].sort((a, b) => a.date.getTime() - b.date.getTime());
}
