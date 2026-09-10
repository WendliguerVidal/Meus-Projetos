import * as XLSX from "xlsx";
import type { DealWithRelations } from "@/types";
import { CATEGORY_LABELS, LOSS_REASON_LABELS } from "@/types/deal";
import { formatDate } from "./utils";

/** Resume os itens (objeto/lote/quantidade) de um processo em uma única célula de texto,
 * ex: "Retroescavadeira BHL75C (Lote 01) x1; Motoniveladora (Lote 02) x2". */
function summarizeItems(items: DealWithRelations["items"]): string {
  if (!items || items.length === 0) return "";
  return items
    .map((item) => {
      const parts = [item.object, item.model].filter(Boolean).join(" ");
      const lot = item.lot ? ` (${item.lot})` : "";
      return `${parts}${lot} x${item.quantity}`;
    })
    .join("; ");
}

/** Gera e baixa uma planilha .xlsx a partir de uma lista de processos/licitações. */
export function exportDealsToExcel(deals: DealWithRelations[], fileName = "processos") {
  const rows = deals.map((d) => ({
    Título: d.title,
    Cliente: d.client,
    Cidade: d.city,
    UF: d.state,
    Itens: summarizeItems(d.items),
    Categoria: CATEGORY_LABELS[d.category as keyof typeof CATEGORY_LABELS] ?? d.category,
    Status: d.status,
    "Motivo da Perda": d.lossReason
      ? LOSS_REASON_LABELS[d.lossReason as keyof typeof LOSS_REASON_LABELS]
      : "",
    "Detalhe da Perda": d.lossDetail ?? "",
    Responsável: d.assignedTo?.name ?? "",
    "Criado por": d.createdBy?.name ?? "",
    Prazo: d.deadline ? formatDate(d.deadline) : "",
    "Criado em": formatDate(d.createdAt),
    "Atualizado em": formatDate(d.updatedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Processos");

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${fileName}-${timestamp}.xlsx`);
}
