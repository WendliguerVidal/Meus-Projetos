import "server-only";
import fs from "fs";
import path from "path";

/** Imagens fixas do molde da Proposta Comercial (capa, apresentação IRMEN/SANY, unidades/
 * pós-venda, contato) — extraídas e recomprimidas de "Nova_Proposta_Comercial_35U.docx",
 * lidas uma única vez do disco (ver src/assets/proposal/) e reaproveitadas em toda geração
 * dentro da mesma instância da função serverless. `fs.readFileSync(path.join(process.cwd(), ...))`
 * com caminho estático é o padrão que o rastreamento de arquivos da Vercel (`@vercel/nft`)
 * reconhece e inclui automaticamente no bundle da função — por isso os caminhos abaixo são
 * literais, nunca montados dinamicamente. */
function loadAsset(fileName: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), "src/assets/proposal", fileName));
}

export const PROPOSAL_ASSETS = {
  cover: loadAsset("cover.jpg"),
  introStrip: loadAsset("intro-strip.jpg"),
  qrBadge: loadAsset("qr-badge.png"),
  irmenPage: loadAsset("irmen-page.jpg"),
  sanyPage: loadAsset("sany-page.jpg"),
  unitsPostSale: loadAsset("units-postsale.jpg"),
  contactPage: loadAsset("contact-page.jpg"),
};
