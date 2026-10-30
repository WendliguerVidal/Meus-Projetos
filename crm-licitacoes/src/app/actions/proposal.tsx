"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin, assertCanAccessState } from "@/lib/rbac";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";
import { logAudit } from "@/lib/audit";
import {
  generateProposalSchema,
  type GenerateProposalFormValues,
  type ProposalDefaults,
  type ProposalItemDefault,
  type SavedProposalListItem,
} from "@/types/proposal";
import { ProposalDocument, type ProposalDocumentItem } from "@/lib/pdf/proposal-document";

export type { ActionResult };

// ---------------------------------------------------------------------------
// Geração da Proposta Comercial (PDF) a partir de um processo (Deal) e seus Itens —
// ver types/proposal.ts para os campos e lib/pdf/proposal-document.tsx para o layout.
// Mesmo RBAC por estado (UF) já usado no restante do Deal (assertCanAccessState).
// ---------------------------------------------------------------------------

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Para o Objeto — tolera acentos e espaços extras digitados diferente no item do
 * processo e no Cadastro de Equipamentos (ambos os campos são de digitação livre, a
 * busca no Cadastro é só uma sugestão, ver deal-form.tsx). */
function normalize(value: string): string {
  return stripAccents(value.trim().toLowerCase()).replace(/\s+/g, " ");
}

/** Para o Modelo — além de acentos/espaços, ignora hífens/pontos (ex.: "SSR120C-10S" e
 * "SSR120C10S" devem casar), senão um item sem o mesmo formato do Cadastro cai no
 * equipamento errado (ou em nenhum) e perde a foto na proposta gerada. */
function normalizeModel(value: string): string {
  return stripAccents(value.trim().toLowerCase()).replace(/[^a-z0-9]+/g, "");
}

/** Encontra o equipamento do Cadastro de Máquinas correspondente a um item do processo.
 *
 * O Modelo é tentado PRIMEIRO, antes do Objeto: no formulário do processo (ver
 * deal-form.tsx) o campo Modelo normalmente vem escolhido de uma sugestão vinda do
 * próprio Cadastro (texto idêntico ao de Equipment.model), mas o campo Objeto é 100%
 * digitação livre — o usuário pode digitar "ESCAVADEIRA" enquanto o Cadastro tem
 * "ESCAVADEIRA HIDRÁULICA SANY", por exemplo. Exigir também o Objeto igual (como era
 * antes) fazia a busca falhar mesmo com o Modelo batendo certinho, perdendo a foto na
 * proposta. Só cai para a busca por Objeto quando não há Modelo informado ou nenhum
 * equipamento tem esse Modelo cadastrado. */
async function findMatchingEquipment(object: string, model: string | null) {
  const all = await prisma.equipment.findMany({ select: { id: true, object: true, model: true } });

  if (model && model.trim()) {
    const modelNorm = normalizeModel(model);
    const modelMatches = all.filter((c) => c.model && normalizeModel(c.model) === modelNorm);
    if (modelMatches.length === 1) return modelMatches[0];
    if (modelMatches.length > 1) {
      // Mais de um equipamento com o mesmo Modelo (raro) — prioriza o que também bate o
      // Objeto; sem isso, usa o primeiro mesmo.
      const objNorm = normalize(object);
      return modelMatches.find((c) => normalize(c.object) === objNorm) ?? modelMatches[0];
    }
  }

  const objNorm = normalize(object);
  if (!objNorm) return null;
  return all.find((c) => normalize(c.object) === objNorm) ?? null;
}

/** Junta os campos de "Características" do equipamento (label/valor) num texto único —
 * reaproveita o que já está salvo no Cadastro de Equipamentos, sem exigir um campo novo. */
function buildDescriptiveText(fields: { label: string; value: string | null }[]): string {
  return fields
    .map((f) => {
      const value = f.value?.trim();
      if (!value) return null;
      return f.label ? `${f.label}: ${value}` : value;
    })
    .filter((v): v is string => !!v)
    .join("\n\n");
}

/** Sugestões para pré-preencher o formulário de geração — descritivo técnico (a partir do
 * equipamento correspondente), valores e a contagem de fotos disponíveis. Não inclui as
 * fotos em si (mantém a resposta leve); elas só são buscadas na geração do PDF. */
export async function getProposalDefaults(dealId: string): Promise<ActionResult<ProposalDefaults>> {
  try {
    const user = await requireUser();
    const deal = await prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    assertCanAccessState(user, deal.state);

    if (deal.items.length === 0) {
      return { success: false, error: "Adicione ao menos um item ao processo antes de gerar a proposta." };
    }

    const items: ProposalItemDefault[] = [];
    for (const item of deal.items) {
      const matched = await findMatchingEquipment(item.object, item.model);
      let suggestedDescriptiveText = "";
      let photoCount = 0;

      if (matched) {
        const full = await prisma.equipment.findUnique({
          where: { id: matched.id },
          include: {
            fields: { orderBy: { order: "asc" } },
            files: { where: { category: "FOTO" }, select: { id: true } },
          },
        });
        if (full) {
          suggestedDescriptiveText = buildDescriptiveText(full.fields);
          photoCount = full.files.length;
        }
      }

      const total = item.negotiatedValue ?? item.estimatedValue ?? 0;
      const unit = item.quantity > 0 ? total / item.quantity : total;

      items.push({
        dealItemId: item.id,
        object: item.object,
        model: item.model,
        quantity: item.quantity,
        suggestedUnitValue: unit,
        suggestedTotalValue: total,
        suggestedDescriptiveText,
        matchedEquipmentId: matched?.id ?? null,
        photoCount,
      });
    }

    return {
      success: true,
      data: {
        dataProposta: new Date().toLocaleDateString("pt-BR"),
        clienteNome: deal.client,
        localEntrega: `${deal.city}/${deal.state}`,
        // Sugestão de partida — quem está gerando a proposta pode não ser quem vai
        // assinar (ex: a coordenadora gera para outro consultor), por isso é só um
        // padrão inicial editável, nunca fixo no documento.
        consultorNome: user.name ?? "",
        consultorEmail: user.email ?? "",
        items,
      },
    };
  } catch (err) {
    console.error("[proposal] getProposalDefaults falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

// Margem de segurança abaixo do limite de resposta de Serverless Functions da Vercel
// (plano Hobby, ~4.5MB) — mesmo raciocínio de MAX_FILE_SIZE em actions/attachments.ts.
const MAX_PDF_SIZE = 4 * 1024 * 1024;

export async function generateProposalPdf(
  input: GenerateProposalFormValues
): Promise<ActionResult<{ base64: string; fileName: string }>> {
  try {
    const user = await requireUser();
    const data = generateProposalSchema.parse(input);

    const deal = await prisma.deal.findUniqueOrThrow({
      where: { id: data.dealId },
      include: { items: true },
    });
    assertCanAccessState(user, deal.state);

    const itemsById = new Map(deal.items.map((it) => [it.id, it]));
    const documentItems: ProposalDocumentItem[] = [];

    for (const itemInput of data.items) {
      const dealItem = itemsById.get(itemInput.dealItemId);
      if (!dealItem) continue;

      const matched = await findMatchingEquipment(dealItem.object, dealItem.model);
      let photos: string[] = [];
      let specFields: { label: string; value: string }[] = [];
      if (matched) {
        const [files, fields] = await Promise.all([
          prisma.equipmentFile.findMany({
            where: { equipmentId: matched.id, category: "FOTO" },
            orderBy: { uploadedAt: "asc" },
            take: 4,
            select: { fileUrl: true },
          }),
          prisma.equipmentField.findMany({
            where: { equipmentId: matched.id },
            orderBy: { order: "asc" },
            select: { label: true, value: true },
          }),
        ]);
        photos = files.map((f) => f.fileUrl);
        specFields = fields
          .filter((f): f is { label: string; value: string } => !!f.value?.trim())
          .map((f) => ({ label: f.label, value: f.value }));
      }

      documentItems.push({
        object: dealItem.object,
        model: dealItem.model,
        quantity: dealItem.quantity,
        unitValue: itemInput.unitValue,
        totalValue: itemInput.totalValue,
        descriptiveText: itemInput.descriptiveText || "",
        photos,
        specFields,
      });
    }

    if (documentItems.length === 0) {
      return { success: false, error: "Nenhum item válido para gerar a proposta." };
    }

    const pdfBuffer = await renderToBuffer(
      <ProposalDocument
        data={{
          dealTitle: deal.title,
          dealState: deal.state,
          dataProposta: data.dataProposta,
          clienteNome: data.clienteNome,
          aliquotaIcms: data.aliquotaIcms ?? "",
          condicoesPagamento: data.condicoesPagamento ?? "",
          prazoGarantia: data.prazoGarantia ?? "",
          localEntrega: data.localEntrega ?? "",
          prazoEntrega: data.prazoEntrega ?? "",
          validadeProposta: data.validadeProposta ?? "",
          consultorNome: data.consultorNome,
          consultorCargo: data.consultorCargo ?? "",
          consultorContato: data.consultorContato ?? "",
          consultorEmail: data.consultorEmail ?? "",
          items: documentItems,
        }}
      />
    );

    if (pdfBuffer.length > MAX_PDF_SIZE) {
      return {
        success: false,
        error:
          "A proposta ficou grande demais para download (muitas fotos anexadas nos equipamentos). Remova algumas fotos e tente novamente.",
      };
    }

    const safeClientSlug =
      deal.client
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "proposta";
    const fileName = `Proposta-Comercial-${safeClientSlug}.pdf`;
    const base64 = pdfBuffer.toString("base64");

    // Fica salva no processo — permite baixar de novo ou reabrir pré-preenchida para
    // editar e reenviar (ver listProposalsForDeal/getSavedProposalPdf abaixo), sem perder
    // o que já foi gerado antes. Mesmo padrão de armazenamento em base64 do Attachment/
    // EquipmentFile (ver Proposal em schema.prisma).
    await prisma.proposal.create({
      data: {
        dealId: data.dealId,
        createdById: user.id,
        fileName,
        pdfData: `data:application/pdf;base64,${base64}`,
        formData: data as unknown as Prisma.InputJsonValue,
      },
    });

    return { success: true, data: { base64, fileName } };
  } catch (err) {
    console.error("[proposal] generateProposalPdf falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Propostas já geradas e salvas para um processo, mais recentes primeiro — sem o PDF em
 * si (mantém a resposta leve); ver getSavedProposalPdf para baixar uma sob demanda. */
export async function listProposalsForDeal(dealId: string): Promise<ActionResult<SavedProposalListItem[]>> {
  try {
    const user = await requireUser();
    const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, select: { state: true } });
    assertCanAccessState(user, deal.state);

    const proposals = await prisma.proposal.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        createdAt: true,
        formData: true,
        createdBy: { select: { name: true } },
      },
    });

    return {
      success: true,
      data: proposals.map((p) => ({
        id: p.id,
        fileName: p.fileName,
        createdAt: p.createdAt.toISOString(),
        createdByName: p.createdBy.name,
        formData: p.formData as unknown as GenerateProposalFormValues,
      })),
    };
  } catch (err) {
    console.error("[proposal] listProposalsForDeal falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Baixa de novo uma proposta já gerada, sem regenerar o PDF — mesmo arquivo enviado na
 * época. */
export async function getSavedProposalPdf(id: string): Promise<ActionResult<{ base64: string; fileName: string }>> {
  try {
    const user = await requireUser();
    const proposal = await prisma.proposal.findUniqueOrThrow({
      where: { id },
      include: { deal: { select: { state: true } } },
    });
    assertCanAccessState(user, proposal.deal.state);

    const base64 = proposal.pdfData.split(",")[1] ?? proposal.pdfData;
    return { success: true, data: { base64, fileName: proposal.fileName } };
  } catch (err) {
    console.error("[proposal] getSavedProposalPdf falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Restrito a administradores — mesmo padrão de deleteAttachment/deleteFile. Remove só o
 * registro salvo; não desfaz nada que já tenha sido enviado ao cliente. */
export async function deleteProposal(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    requireAdmin(user);

    const proposal = await prisma.proposal.findUniqueOrThrow({
      where: { id },
      include: { deal: { select: { state: true } } },
    });
    assertCanAccessState(user, proposal.deal.state);

    await prisma.proposal.delete({ where: { id } });
    await logAudit({
      dealId: proposal.dealId,
      userId: user.id,
      action: `Excluiu a proposta comercial "${proposal.fileName}"`,
    });

    return { success: true, data: null };
  } catch (err) {
    console.error("[proposal] deleteProposal falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}
