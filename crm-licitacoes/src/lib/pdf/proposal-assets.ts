import "server-only";
import {
  coverBase64,
  introStripBase64,
  qrBadgeBase64,
  irmenPageBase64,
  sanyPageBase64,
  unitsPostSaleBase64,
  contactPageBase64,
} from "./proposal-assets.generated";

/** Imagens fixas do molde da Proposta Comercial (capa, apresentação IRMEN/SANY, unidades/
 * pós-venda, contato) — extraídas e recomprimidas de "Nova_Proposta_Comercial_35U.docx".
 * Embutidas como base64 (ver proposal-assets.generated.ts) em vez de lidas do disco em
 * runtime: `fs.readFileSync` depende do rastreamento de arquivos estáticos da função
 * serverless (@vercel/nft) incluir o caminho corretamente, o que nem sempre acontece de
 * forma confiável — como string dentro do próprio módulo, os bytes viajam garantidamente
 * com o bundle da função, qualquer que seja a plataforma. */
export const PROPOSAL_ASSETS = {
  cover: Buffer.from(coverBase64, "base64"),
  introStrip: Buffer.from(introStripBase64, "base64"),
  qrBadge: Buffer.from(qrBadgeBase64, "base64"),
  irmenPage: Buffer.from(irmenPageBase64, "base64"),
  sanyPage: Buffer.from(sanyPageBase64, "base64"),
  unitsPostSale: Buffer.from(unitsPostSaleBase64, "base64"),
  contactPage: Buffer.from(contactPageBase64, "base64"),
};
