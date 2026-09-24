import "server-only";
import {
  heroBannerBase64,
  quemSomosStatsBase64,
  irmenLogoLockupBase64,
  facilityPhotoBase64,
  sanyBrandBlockBase64,
  estruturaAtendimentoBase64,
  qrBadgeBase64,
} from "./proposal-assets.generated";

/** Imagens fixas do molde da Proposta Comercial (banner, estatísticas IRMEN, logo,
 * fachada da filial, apresentação SANY, infográfico de estrutura/pós-venda e QR de
 * contato) — extraídas e recomprimidas de "Proposta-Comercial-Itarare-STG190C8.docx"
 * (modelo aprovado pelo usuário). Embutidas como base64 (ver proposal-assets.generated.ts)
 * em vez de lidas do disco em runtime: `fs.readFileSync` depende do rastreamento de
 * arquivos estáticos da função serverless (@vercel/nft) incluir o caminho corretamente, o
 * que nem sempre acontece de forma confiável — como string dentro do próprio módulo, os
 * bytes viajam garantidamente com o bundle da função, qualquer que seja a plataforma. */
export const PROPOSAL_ASSETS = {
  heroBanner: Buffer.from(heroBannerBase64, "base64"),
  quemSomosStats: Buffer.from(quemSomosStatsBase64, "base64"),
  irmenLogoLockup: Buffer.from(irmenLogoLockupBase64, "base64"),
  facilityPhoto: Buffer.from(facilityPhotoBase64, "base64"),
  sanyBrandBlock: Buffer.from(sanyBrandBlockBase64, "base64"),
  estruturaAtendimento: Buffer.from(estruturaAtendimentoBase64, "base64"),
  qrBadge: Buffer.from(qrBadgeBase64, "base64"),
};
