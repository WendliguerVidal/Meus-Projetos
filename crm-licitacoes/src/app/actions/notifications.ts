"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import {
  CLOSED_DEAL_CATEGORIES,
  CLOSED_EVENT_STATUSES,
  getDealUrgency,
  getEventUrgency,
  getDocumentUrgency,
  formatUrgencyMessage,
  type UrgencyLevel,
} from "@/lib/urgency";
import { STATE_NAMES } from "@/types/document";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Central de Notificações do cabeçalho — processos e compromissos vencidos ou a vencer
// nos próximos 3 dias, e documentos (certidões, CNDs, alvarás...) vencidos ou a vencer
// nos próximos NOTIFICATION_DOCUMENT_WINDOW_DAYS. Essa janela é bem menor que a usada
// no badge da página de Documentos (DOCUMENT_EXPIRY_SOON_DAYS, 30 dias — renovar uma
// certidão leva tempo, então o aviso amarelo lá começa cedo de propósito): aqui, com
// 30 dias, a Central de Notificações ficava poluída de avisos de documentos com muita
// antecedência. Consulta leve: as janelas de data e as categorias/status já encerrados
// são filtrados no próprio banco (não trazemos tudo para filtrar depois em memória),
// então o custo cresce só com a quantidade de itens realmente urgentes.
// ---------------------------------------------------------------------------

/** Janela de antecedência para documentos aparecerem na Central de Notificações —
 * bem menor que a do badge de "vencendo" na página de Documentos (30 dias), só para
 * não poluir essa área com avisos de meses de antecedência. */
const NOTIFICATION_DOCUMENT_WINDOW_DAYS = 7;

export type UrgentItem = {
  id: string;
  kind: "deal" | "event" | "document";
  title: string;
  /** Cliente/órgão (deal/event) ou trilha da pasta (document) — ex: "MG / FGTS". */
  org: string | null;
  date: Date;
  urgencyLevel: UrgencyLevel;
  /** Mensagem já formatada em português — "Vence hoje às 14:00", "Atrasado há 1 dia". */
  message: string;
  dealId: string | null;
  /** Só para documentos: rota direta da pasta que contém o arquivo. `null` para
   * deal/event, que usam `dealId` (ou o Calendário) para navegar. */
  href: string | null;
};

const SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // mesma janela de 3 dias de lib/urgency
const DOCUMENT_WINDOW_MS = NOTIFICATION_DOCUMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const MAX_ITEMS_PER_KIND = 30;

export async function getUrgentItems(): Promise<UrgentItem[]> {
  const user = await requireUser();
  const scoped = user.role === "ADMIN" ? "all" : user.allowedStates;
  if (scoped !== "all" && scoped.length === 0) return [];

  const windowEnd = new Date(Date.now() + SOON_WINDOW_MS);
  const documentWindowEnd = new Date(Date.now() + DOCUMENT_WINDOW_MS);

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

  const [deals, events, documents] = await Promise.all([
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
    // Repositório de Documentos não tem RBAC por estado (ver actions/documents.ts) —
    // qualquer usuário autenticado vê os alertas de todas as pastas.
    prisma.documentFile
      .findMany({
        where: { expiryDate: { lte: documentWindowEnd } },
        select: {
          id: true,
          name: true,
          expiryDate: true,
          folderId: true,
          folder: {
            select: {
              name: true,
              state: true,
              parent: { select: { name: true, state: true } },
            },
          },
        },
        orderBy: { expiryDate: "asc" },
        take: MAX_ITEMS_PER_KIND,
      })
      .catch((err) => {
        console.error("[notifications] Falha ao buscar Documentos urgentes:", err);
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
      message: formatUrgencyMessage(d.deadline, true),
      dealId: d.id,
      href: null,
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
    href: null,
  }));

  const documentItems: UrgentItem[] = documents
    .filter((f) => f.expiryDate !== null)
    .map((f) => {
      // `expiryDate` é opcional no schema — o filtro acima já garante que só chegam
      // aqui arquivos com validade definida, mas o WHERE do findMany já cuida disso
      // também (assertão só evita um cast repetido abaixo).
      const expiryDate = f.expiryDate!;
      // Arquivo direto numa pasta de Estado (folder.state preenchido) -> "MG"; dentro de
      // uma subpasta (folder.parent preenchido) -> "MG / FGTS".
      const stateCode = f.folder.state ?? f.folder.parent?.state ?? null;
      const stateLabel = stateCode ? STATE_NAMES[stateCode as keyof typeof STATE_NAMES] ?? stateCode : null;
      const org = f.folder.parent ? `${stateLabel} / ${f.folder.name}` : stateLabel;

      return {
        id: `doc-${f.id}`,
        kind: "document" as const,
        title: f.name,
        org,
        date: expiryDate,
        urgencyLevel: getDocumentUrgency(expiryDate)!,
        message: formatUrgencyMessage(expiryDate, true),
        dealId: null,
        href: `/documentos/${f.folderId}`,
      };
    });

  return [...dealItems, ...eventItems, ...documentItems].sort((a, b) => a.date.getTime() - b.date.getTime());
}
