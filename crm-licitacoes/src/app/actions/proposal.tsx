"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState } from "@/lib/rbac";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";
import { generateProposalSchema, type GenerateProposalFormValues, type ProposalDefaults, type ProposalItemDefault } from "@/types/proposal";
import { ProposalDocument, type ProposalDocumentItem } from "@/lib/pdf/proposal-document";

export type { ActionResult };

// ---------------------------------------------------------------------------
// Geração da Proposta Comercial (PDF) a partir de um processo (Deal) e seus Itens —
// ver types/proposal.ts para os campos e lib/pdf/proposal-document.tsx para o layout.
// Mesmo RBAC por estado (UF) já usado no restante do Deal (assertCanAccessState).
// ---------------------------------------------------------------------------

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Encontra o equipamento do Cadastro de Máquinas correspondente a um item do processo —
 * por Objeto (obrigatório) e, quando informado, também por Modelo. Sem correspondência de
 * modelo, usa o primeiro equipamento com o mesmo objeto como sugestão de partida (o
 * usuário revisa/edita o descritivo antes de gerar). */
async function findMatchingEquipment(object: string, model: string | null) {
  const objNorm = normalize(object);
  if (!objNorm) return null;

  const candidates = await prisma.equipment.findMany({
    where: { object: { equals: object, mode: "insensitive" } },
    select: { id: true, object: true, model: true },
  });
  if (candidates.length === 0) return null;

  if (model && model.trim()) {
    const modelNorm = normalize(model);
    const exact = candidates.find((c) => c.model && normalize(c.model) === modelNorm);
    if (exact) return exact;
  }
  return candidates[0];
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
      if (matched) {
        const files = await prisma.equipmentFile.findMany({
          where: { equipmentId: matched.id, category: "FOTO" },
          orderBy: { uploadedAt: "asc" },
          take: 4,
          select: { fileUrl: true },
        });
        photos = files.map((f) => f.fileUrl);
      }

      documentItems.push({
        object: dealItem.object,
        model: dealItem.model,
        quantity: dealItem.quantity,
        unitValue: itemInput.unitValue,
        totalValue: itemInput.totalValue,
        descriptiveText: itemInput.descriptiveText || "",
        photos,
      });
    }

    if (documentItems.length === 0) {
      return { success: false, error: "Nenhum item válido para gerar a proposta." };
    }

    const pdfBuffer = await renderToBuffer(
      <ProposalDocument
        data={{
          dealTitle: deal.title,
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

    return {
      success: true,
      data: { base64: pdfBuffer.toString("base64"), fileName: `Proposta-Comercial-${safeClientSlug}.pdf` },
    };
  } catch (err) {
    console.error("[proposal] generateProposalPdf falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}
