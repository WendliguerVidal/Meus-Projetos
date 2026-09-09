"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// A ajuda de saída estruturada da SDK (`zodOutputFormat`) exige um schema construído com
// `zod/v4` — mantido isolado deste arquivo apenas para a chamada à IA. O restante da
// aplicação continua em "zod" (v3) normalmente; nada daqui vaza para fora deste módulo.
import { z as zv4 } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCanAccessState } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toFriendlyErrorMessage, type ActionResult } from "@/lib/action-errors";
import { editalImportSchema, type EditalImportFormValues, type EditalExtractionData } from "@/types/edital-import";
import { BRAZIL_STATES } from "@/types/deal";

// ~3.5MB — margem abaixo do limite de payload de Server Actions configurado em
// next.config.mjs (bodySizeLimit: "4mb"), que por sua vez já tem margem em relação ao
// teto de ~4.5MB de Serverless Functions da Vercel (plano Hobby). Ver MAX_FILE_SIZE em
// actions/attachments.ts para o mesmo raciocínio aplicado a anexos.
const MAX_PDF_SIZE = 3.5 * 1024 * 1024;

const ExtractionSchema = zv4.object({
  // A IA sinaliza aqui se o PDF não pôde ser lido como um edital (ilegível, corrompido,
  // ou de outra natureza) — nunca inventamos dados quando isso acontece.
  success: zv4.boolean(),
  failureReason: zv4.string().nullable(),
  title: zv4.string().nullable(),
  client: zv4.string().nullable(),
  city: zv4.string().nullable(),
  state: zv4.string().nullable(),
  equipment: zv4.string().nullable(),
  model: zv4.string().nullable(),
  serialNumber: zv4.string().nullable(),
  deadline: zv4.string().nullable(),
  estimatedValue: zv4.number().nullable(),
  summary: zv4.string().nullable(),
});

/** Lê um PDF de edital e extrai os dados estruturados do processo via IA (Claude). Nunca
 * lança — falhas de upload, de configuração, de rede ou de extração (PDF ilegível/não é
 * um edital) sempre voltam como `{ success: false, error }` com mensagem amigável. */
export async function extractEditalFromPdf(formData: FormData): Promise<ActionResult<EditalExtractionData>> {
  try {
    await requireUser();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "Nenhum arquivo enviado." };
    }
    const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) {
      return { success: false, error: "Envie um arquivo em formato PDF." };
    }
    if (file.size > MAX_PDF_SIZE) {
      return { success: false, error: `Arquivo excede o limite de ${(MAX_PDF_SIZE / (1024 * 1024)).toFixed(1)}MB.` };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        error: "Extração por IA indisponível: configure a variável de ambiente ANTHROPIC_API_KEY no servidor.",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const today = new Date().toISOString().slice(0, 10);

    const client = new Anthropic();

    let response;
    try {
      response = await client.messages.parse({
        model: "claude-opus-5",
        max_tokens: 4000,
        system:
          "Você é um assistente especialista em analisar editais de licitação pública brasileiros " +
          "(pregões, tomadas de preço, concorrências, dispensas). Leia o PDF anexado e extraia os dados " +
          `estruturados do processo licitatório. A data de hoje é ${today} (use-a só como referência para ` +
          "interpretar datas relativas, se necessário). Regras: " +
          "(1) 'deadline' é o prazo/data de abertura da sessão pública ou prazo final para envio de propostas — " +
          "retorne em formato ISO 8601 (ex: 2026-03-15T09:00:00) ou null se não encontrado. " +
          "(2) 'state' é a sigla de UF (2 letras maiúsculas) do órgão/cidade, ou null se não identificável. " +
          "(3) 'estimatedValue' é o valor estimado/valor total do objeto em reais (apenas número, sem formatação " +
          "de moeda), ou null se não informado. " +
          "(4) 'summary' é um resumo curto (2 a 4 frases, em português) do objeto da licitação, equipamento/" +
          "especificação e regras de prazo relevantes. " +
          "(5) Se o arquivo não for um edital de licitação, estiver ilegível, corrompido, ou não permitir extrair " +
          "nenhum dado confiável, retorne success:false com uma failureReason clara e objetiva em português " +
          "explicando o motivo. Caso contrário, retorne success:true com os campos preenchidos (nulo quando " +
          "genuinamente não encontrado no documento).",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              { type: "text", text: "Extraia os dados estruturados deste edital de licitação." },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(ExtractionSchema) },
      });
    } catch (apiErr) {
      console.error("[import-pdf] Chamada à API Claude falhou:", apiErr);
      if (apiErr instanceof Anthropic.AuthenticationError) {
        return { success: false, error: "Chave de API da Anthropic inválida. Verifique a variável ANTHROPIC_API_KEY." };
      }
      if (apiErr instanceof Anthropic.RateLimitError) {
        return { success: false, error: "Limite de requisições à IA atingido. Tente novamente em instantes." };
      }
      if (apiErr instanceof Anthropic.APIError) {
        return { success: false, error: `Erro ao processar o PDF via IA (código ${apiErr.status ?? "desconhecido"}). Tente novamente.` };
      }
      return { success: false, error: "Não foi possível processar o PDF. Tente novamente." };
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return { success: false, error: "Não foi possível interpretar a resposta da IA. Tente novamente ou preencha o processo manualmente." };
    }
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.failureReason || "Não foi possível extrair dados deste PDF — verifique se é um edital legível.",
      };
    }

    const normalizedState = parsed.state?.trim().toUpperCase() ?? null;
    const validState = normalizedState && (BRAZIL_STATES as readonly string[]).includes(normalizedState) ? normalizedState : null;

    const data: EditalExtractionData = {
      title: parsed.title,
      client: parsed.client,
      city: parsed.city,
      state: validState,
      equipment: parsed.equipment,
      model: parsed.model,
      serialNumber: parsed.serialNumber,
      deadline: parsed.deadline,
      estimatedValue: parsed.estimatedValue,
      summary: parsed.summary,
    };

    return { success: true, data };
  } catch (err) {
    console.error("[import-pdf] extractEditalFromPdf falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}

/** Cria o Deal e o Event vinculado a partir dos dados confirmados pelo usuário na prévia
 * de importação. Sempre roda em uma transação — ou os dois registros são criados, ou
 * nenhum é. Categoria/status do Deal e status do Event vêm fixos, conforme a regra de
 * negócio pedida (todo processo importado entra como "Licitação em Aberto"). */
export async function createDealFromEdital(input: EditalImportFormValues): Promise<ActionResult<{ dealId: string; eventId: string }>> {
  try {
    const user = await requireUser();
    const data = editalImportSchema.parse(input);
    assertCanAccessState(user, data.state);

    const result = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          title: data.title,
          client: data.client,
          city: data.city,
          state: data.state,
          equipment: data.equipment || null,
          model: data.model || null,
          serialNumber: data.serialNumber || null,
          category: "ANDAMENTO",
          status: "Licitação em Aberto",
          deadline: data.deadline ?? null,
          createdById: user.id,
        },
      });

      const descriptionParts = [
        data.equipment ? `Equipamento: ${data.equipment}` : null,
        data.model ? `Modelo/Especificação: ${data.model}` : null,
        data.summary || null,
      ].filter((p): p is string => !!p);

      const event = await tx.event.create({
        data: {
          title: `${data.title} — ${data.client}`,
          description: descriptionParts.length > 0 ? descriptionParts.join(" | ") : null,
          // Se o prazo não foi identificado no edital, o evento ainda assim precisa de uma
          // data (startDate é obrigatório no schema) — usamos hoje como fallback visível;
          // o usuário pode corrigi-la a qualquer momento pelo Calendário.
          startDate: data.deadline ?? new Date(),
          status: "ABERTO",
          estimatedValue: data.estimatedValue ?? null,
          dealId: deal.id,
          createdById: user.id,
        },
      });

      return { deal, event };
    });

    await logAudit({
      dealId: result.deal.id,
      userId: user.id,
      action: `Importou o processo "${result.deal.title}" via leitura automática de edital (PDF)`,
      details: { source: "pdf-import", eventId: result.event.id },
    });

    revalidatePath("/");
    revalidatePath("/calendario");
    return { success: true, data: { dealId: result.deal.id, eventId: result.event.id } };
  } catch (err) {
    console.error("[import-pdf] createDealFromEdital falhou:", err);
    return { success: false, error: toFriendlyErrorMessage(err) };
  }
}
