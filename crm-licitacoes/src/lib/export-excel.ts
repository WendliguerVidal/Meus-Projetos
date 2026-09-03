import * as XLSX from "xlsx";
import type { DealWithRelations } from "@/types";
import { CATEGORY_LABELS, LOSS_REASON_LABELS } from "@/types/deal";
import { formatDate } from "./utils";

/** Gera e baixa uma planilha .xlsx a partir de uma lista de processos/licitações. */
export function exportDealsToExcel(deals: DealWithRelations[], fileName = "processos") {
  const rows = deals.map((d) => ({
    Título: d.title,
    Cliente: d.client,
    Cidade: d.city,
    UF: d.state,
    Equipamento: d.equipment ?? "",
    Modelo: d.model ?? "",
    "Número de Série": d.serialNumber ?? "",
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
