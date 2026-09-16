import "server-only";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PROPOSAL_ASSETS } from "./proposal-assets";

// ---------------------------------------------------------------------------
// Documento da Proposta Comercial (PDF) — molde de "Nova_Proposta_Comercial_35U.docx":
// capa, apresentação + dados do cliente, apresentação IRMEN, apresentação SANY, um bloco
// por máquina (título/modelo/fotos), tabela de preços com o descritivo técnico dentro da
// célula, condições comerciais, unidades/pós-venda e contato (com o consultor sobreposto).
// As seis primeiras/últimas páginas são sempre as mesmas imagens fixas (ver proposal-
// assets.ts); só o texto sobreposto e o bloco de cada item mudam por processo.
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLOR = {
  ink2: "#1e2128",
  text: "#22252b",
  muted: "#6b6f7a",
  accent: "#c81d15",
  line: "#d8d5cd",
  paperDim: "#f4f2ee",
};

export type ProposalDocumentItem = {
  object: string;
  model: string | null;
  quantity: number;
  unitValue: number;
  totalValue: number;
  descriptiveText: string;
  /** Data URIs (já vêm prontos de EquipmentFile.fileUrl) — até 4. */
  photos: string[];
};

export type ProposalDocumentData = {
  dealTitle: string;
  dataProposta: string;
  clienteNome: string;
  aliquotaIcms: string;
  condicoesPagamento: string;
  prazoGarantia: string;
  localEntrega: string;
  prazoEntrega: string;
  validadeProposta: string;
  consultorNome: string;
  consultorCargo: string;
  consultorContato: string;
  consultorEmail: string;
  items: ProposalDocumentItem[];
};

function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: COLOR.text },
  fullBleed: { width: PAGE_W, height: PAGE_H },
  content: { padding: MARGIN },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  brandIrmen: { fontFamily: "Helvetica-Bold", fontSize: 12, color: "#141517" },
  brandSany: { fontFamily: "Helvetica-Bold", fontSize: 12, color: COLOR.accent, marginLeft: 8 },
  footer: {
    position: "absolute",
    bottom: 24,
    right: MARGIN,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#b7b9be",
  },
  irmenLetterhead: { fontSize: 11, color: COLOR.text, lineHeight: 1.5, marginBottom: 2 },
  label: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: COLOR.text, marginBottom: 3 },
  value: { fontSize: 13, color: COLOR.text, marginBottom: 12 },
  paragraph: { fontSize: 11, color: "#3a3d44", lineHeight: 1.6, marginBottom: 18 },
  equipTitle: { fontFamily: "Helvetica-Bold", fontSize: 20, color: COLOR.text, marginBottom: 2 },
  equipModel: { fontFamily: "Helvetica-Bold", fontSize: 13, color: COLOR.accent, marginBottom: 16 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  photoBox: { width: CONTENT_W / 2 - 10, height: (CONTENT_W / 2 - 10) * 0.75, margin: 5 },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLOR.ink2 },
  tableHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    padding: 8,
    textTransform: "uppercase",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.line },
  tableCell: { padding: 8, fontSize: 8.5 },
  totalRow: { flexDirection: "row", backgroundColor: COLOR.paperDim, borderTopWidth: 2, borderTopColor: COLOR.ink2 },
  totalCell: { padding: 8, fontSize: 9, fontFamily: "Helvetica-Bold" },
  descrLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 4 },
  condHeaderRow: { flexDirection: "row", backgroundColor: COLOR.ink2 },
  condHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    padding: 8,
    textTransform: "uppercase",
  },
  condValueRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.line },
  condValueCell: { padding: 9, fontSize: 9.5 },
  consultantOverlay: { position: "absolute", top: 88, left: 48, width: 340 },
  consultantName: { fontFamily: "Helvetica-Bold", fontSize: 21, marginBottom: 12, color: "#1c1e22" },
  consultantLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    textTransform: "uppercase",
    color: "#1c1e22",
    marginTop: 11,
  },
  consultantValue: { fontSize: 14, color: "#3a3d44", lineHeight: 1.4 },
});

/** Coluna com largura fixa (soma ≈ CONTENT_W) reaproveitada nas tabelas de preços/
 * condições comerciais. */
const COL = { descr: 237, qty: 77, unit: 100, total: 100 };

function BrandLockup() {
  return (
    <View style={styles.brandRow}>
      <Text style={styles.brandIrmen}>IRMEN</Text>
      <Text style={styles.brandSany}>SANY</Text>
    </View>
  );
}

function Footer({ fixed }: { fixed?: boolean }) {
  return (
    <Text style={styles.footer} fixed={fixed}>
      irmen.com.br
    </Text>
  );
}

export function ProposalDocument({ data }: { data: ProposalDocumentData }) {
  const totalGeral = data.items.reduce((sum, it) => sum + it.totalValue, 0);

  return (
    <Document title="Proposta Comercial — IRMEN SANY">
      {/* Página 1 — Capa (fixa) */}
      <Page size="A4">
        <Image src={PROPOSAL_ASSETS.cover} style={styles.fullBleed} />
      </Page>

      {/* Página 2 — Apresentação (foto + QR fixos) e Dados do Cliente (editável) */}
      <Page size="A4" style={styles.page}>
        <View style={{ position: "relative" }}>
          <Image src={PROPOSAL_ASSETS.introStrip} style={{ width: PAGE_W, height: PAGE_W / (1400 / 516) }} />
          <Image
            src={PROPOSAL_ASSETS.qrBadge}
            style={{
              position: "absolute",
              right: PAGE_W * 0.05,
              bottom: -28,
              width: PAGE_W * 0.24,
              height: (PAGE_W * 0.24) / (312 / 420),
            }}
          />
        </View>

        <View style={{ padding: MARGIN, flex: 1 }}>
          <Text style={styles.irmenLetterhead}>Empresa: IRMEN MAQUINAS E EQUIPAMENTOS</Text>
          <Text style={styles.irmenLetterhead}>CNPJ: 10.657.159/0001-37</Text>
          <Text style={styles.irmenLetterhead}>Filial – São Paulo</Text>
          <Text style={[styles.irmenLetterhead, { marginBottom: 18 }]}>
            Rua Valença, n° 542 B. Palmeiras de São José – CEP: 12.237-824 São Jose dos Campos
          </Text>

          <Text style={{ fontSize: 10.5, color: COLOR.muted, marginBottom: 6 }}>À</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 15, marginBottom: 18 }}>{data.clienteNome}</Text>

          <Text style={styles.paragraph}>
            Temos o prazer de trazer uma breve introdução sobre a Irmen e apresentar as nossas condições
            comerciais referentes ao {data.dealTitle}.
          </Text>

          <View style={{ marginTop: "auto" }}>
            <Text style={styles.label}>Data</Text>
            <Text style={styles.value}>{data.dataProposta}</Text>
          </View>
        </View>
        <Footer />
      </Page>

      {/* Página 3 — Apresentação IRMEN (fixa) */}
      <Page size="A4">
        <Image src={PROPOSAL_ASSETS.irmenPage} style={styles.fullBleed} />
      </Page>

      {/* Página 4 — Apresentação SANY (fixa) */}
      <Page size="A4">
        <Image src={PROPOSAL_ASSETS.sanyPage} style={styles.fullBleed} />
      </Page>

      {/* Uma página por item — título (preto) + modelo (vermelho) + até 4 fotos */}
      {data.items.map((item, index) => (
        <Page key={`item-${index}`} size="A4" style={styles.page}>
          <View style={styles.content}>
            <BrandLockup />
            <Text style={styles.equipTitle}>{item.object}</Text>
            {!!item.model && <Text style={styles.equipModel}>{item.model}</Text>}
            {item.photos.length > 0 && (
              <View style={styles.photosGrid}>
                {item.photos.slice(0, 4).map((photo, photoIndex) => (
                  <View key={photoIndex} style={styles.photoBox}>
                    <Image src={photo} style={styles.photoImg} />
                  </View>
                ))}
              </View>
            )}
          </View>
          <Footer />
        </Page>
      ))}

      {/* Tabela de Preços — descritivo técnico dentro da própria célula, um bloco por
          página inicial; itens/linhas extras fluem automaticamente para novas páginas. */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <BrandLockup />

          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.tableHeaderCell, { width: COL.descr }]}>Descritivo</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.qty }]}>Quantidade</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.unit }]}>Preço Unit.</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.total }]}>Preço Total</Text>
          </View>

          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <View style={[styles.tableCell, { width: COL.descr }]}>
                <Text style={styles.descrLabel}>
                  {item.object.toUpperCase()}
                  {item.model ? ` ${item.model.toUpperCase()}` : ""}
                </Text>
                <Text style={{ fontSize: 8, lineHeight: 1.5, color: "#3a3d44" }}>
                  {item.descriptiveText || "—"}
                </Text>
              </View>
              <Text style={[styles.tableCell, { width: COL.qty }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { width: COL.unit }]}>{formatBRL(item.unitValue)}</Text>
              <Text style={[styles.tableCell, { width: COL.total }]}>{formatBRL(item.totalValue)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={[styles.totalCell, { width: COL.descr + COL.qty + COL.unit }]}>Total</Text>
            <Text style={[styles.totalCell, { width: COL.total }]}>{formatBRL(totalGeral)}</Text>
          </View>
        </View>
        <Footer fixed />
      </Page>

      {/* Condições Comerciais — mesmo formato de tabela, continuação da anterior */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <BrandLockup />

          <View style={styles.condHeaderRow}>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 2 }]}>Classificação Fiscal</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 2 }]}>Alíquota de ICMS</Text>
          </View>
          <View style={styles.condValueRow}>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 2, color: COLOR.muted, fontStyle: "italic" }]}>
              Conforme NCM do item
            </Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 2 }]}>{data.aliquotaIcms || "—"}</Text>
          </View>

          <View style={styles.condHeaderRow}>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W }]}>Condições de Pagamento</Text>
          </View>
          <View style={styles.condValueRow}>
            <Text style={[styles.condValueCell, { width: CONTENT_W }]}>{data.condicoesPagamento || "—"}</Text>
          </View>

          <View style={styles.condHeaderRow}>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W }]}>Garantia</Text>
          </View>
          <View style={styles.condValueRow}>
            <Text style={[styles.condValueCell, { width: CONTENT_W }]}>{data.prazoGarantia || "—"}</Text>
          </View>

          <View style={styles.condHeaderRow}>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 2 }]}>Local de Entrega</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 2 }]}>Prazo de Entrega</Text>
          </View>
          <View style={styles.condValueRow}>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 2 }]}>{data.localEntrega || "—"}</Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 2 }]}>{data.prazoEntrega || "—"}</Text>
          </View>

          <View style={styles.condHeaderRow}>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W }]}>Validade da Proposta</Text>
          </View>
          <View style={styles.condValueRow}>
            <Text style={[styles.condValueCell, { width: CONTENT_W }]}>{data.validadeProposta || "—"}</Text>
          </View>
        </View>
        <Footer />
      </Page>

      {/* Unidades + Pós-venda (fixa) */}
      <Page size="A4">
        <Image src={PROPOSAL_ASSETS.unitsPostSale} style={styles.fullBleed} />
      </Page>

      {/* Contato/QR (fixa) + dados de quem está enviando a proposta (editável por
          geração — muda conforme o processo: coordenadora, outro consultor etc.) */}
      <Page size="A4">
        <View style={{ position: "relative" }}>
          <Image src={PROPOSAL_ASSETS.contactPage} style={styles.fullBleed} />
          <View style={styles.consultantOverlay}>
            <Text style={styles.consultantName}>{data.consultorNome.toUpperCase()}</Text>
            {!!data.consultorCargo && <Text style={styles.consultantLabel}>{data.consultorCargo}</Text>}
            {!!data.consultorContato && (
              <>
                <Text style={styles.consultantLabel}>Contato</Text>
                <Text style={styles.consultantValue}>{data.consultorContato}</Text>
              </>
            )}
            {!!data.consultorEmail && (
              <>
                <Text style={styles.consultantLabel}>Email</Text>
                <Text style={styles.consultantValue}>{data.consultorEmail}</Text>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
