import "server-only";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PROPOSAL_ASSETS } from "./proposal-assets";

// ---------------------------------------------------------------------------
// Documento da Proposta Comercial (PDF) — molde de
// "Proposta-Comercial-Itarare-STG190C8.docx" (modelo aprovado pelo usuário), em 3
// páginas fixas (como no original): (1) banner + dados do cliente/proponente + "Quem
// somos" + foto da filial; (2) apresentação SANY + equipamento (foto/modelo/principais
// características) + proposta de preço + condições comerciais; (3) estrutura/atendimento
// + contato (consultor responsável). Fotos de cada máquina e a tabela de "Principais
// Características" vêm do Cadastro de Equipamentos (ver actions/proposal.ts); as demais
// imagens (banner, "quem somos", fachada da filial, apresentação SANY, infográfico de
// estrutura/atendimento e QR) são fixas — ver proposal-assets.ts. Textos e tabelas usam
// fontes/paddings compactos de propósito, para caber tudo nas mesmas 3 páginas do molde
// mesmo com processos de vários itens.
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLOR = {
  ink: "#161616",
  text: "#22252b",
  body: "#3a3a3a",
  muted: "#6b6b6b",
  accent: "#d71920",
  line: "#d8d5cd",
  shade: "#f3f3f3",
};

export type ProposalDocumentSpecField = { label: string; value: string };

export type ProposalDocumentItem = {
  object: string;
  model: string | null;
  quantity: number;
  unitValue: number;
  totalValue: number;
  descriptiveText: string;
  /** Data URIs (já vêm prontos de EquipmentFile.fileUrl) — até 4. */
  photos: string[];
  /** "Características" do equipamento no Cadastro de Máquinas — vira a tabela de
   * Principais Características (auto-preenchida, não editável nesta tela). */
  specFields: ProposalDocumentSpecField[];
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
  page: { fontFamily: "Helvetica", fontSize: 9, color: COLOR.text },
  content: { padding: MARGIN },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  brandIrmen: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#141517" },
  brandSany: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COLOR.accent, marginLeft: 6 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: MARGIN,
    right: MARGIN,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: "#9a9a9a",
    textAlign: "center",
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "stretch", marginBottom: 3 },
  sectionHeaderBar: { width: 3, backgroundColor: COLOR.accent, marginRight: 6 },
  sectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: COLOR.text,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  hr: { borderBottomWidth: 1, borderBottomColor: COLOR.line },
  headerBlockRow: { flexDirection: "row", paddingVertical: 5 },
  headerBlockLabel: { fontFamily: "Helvetica-Bold", fontSize: 8, color: COLOR.text, marginBottom: 1 },
  headerBlockValue: { fontSize: 8.5, color: COLOR.body, marginBottom: 2 },
  proponenteLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  proponenteLine: { fontSize: 8, color: COLOR.body, lineHeight: 1.4 },
  paragraph: { fontSize: 8.5, color: COLOR.body, lineHeight: 1.35, marginBottom: 2 },
  equipTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: COLOR.text,
    marginBottom: 1,
    textTransform: "uppercase",
  },
  equipModel: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COLOR.accent, marginBottom: 8 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLOR.ink },
  tableHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.8,
    padding: 5,
    textTransform: "uppercase",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.line },
  tableCell: { padding: 5, fontSize: 7 },
  totalRow: { flexDirection: "row", backgroundColor: COLOR.shade, borderTopWidth: 2, borderTopColor: COLOR.ink },
  totalCell: { padding: 5, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  totalCellValue: { padding: 5, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: COLOR.accent },
  descrLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, marginBottom: 2 },
  condHeaderRow: { flexDirection: "row", backgroundColor: COLOR.ink, marginTop: 8 },
  condHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.3,
    padding: 5,
    textTransform: "uppercase",
  },
  condValueRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.line },
  condValueCell: { padding: 5, fontSize: 7.3 },
  consultantName: { fontFamily: "Helvetica-Bold", fontSize: 17, marginBottom: 3, color: "#1c1e22" },
  consultantRole: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COLOR.accent, marginBottom: 12 },
  consultantLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: COLOR.text, marginTop: 8, marginBottom: 2 },
  consultantValue: { fontSize: 8.5, color: COLOR.body },
  qrBadgeImg: { width: 100, height: 100 * (350 / 260) },
});

/** Coluna com largura fixa (soma ≈ CONTENT_W) reaproveitada na tabela de preços. */
const COL = { descr: 245, qty: 77, unit: 96, total: 105 };

/** Dados fixos da IRMEN (proponente) — mesmos em toda proposta gerada. */
const IRMEN_INFO = {
  razaoSocial: "IRMEN MÁQUINAS E EQUIPAMENTOS",
  cnpj: "10.657.159/0001-37",
  filial: "Filial São Paulo",
  endereco: "Rua Valença, nº 542 – B. Palmeiras de São José",
  cep: "CEP 12.237-824 – São José dos Campos/SP",
  site: "irmen.com.br",
  linkedin: "/company/irmenmaquinas",
  instagram: "@irmen_maquinas",
};

function BrandLockup() {
  return (
    <View style={styles.brandRow}>
      <Text style={styles.brandIrmen}>IRMEN</Text>
      <Text style={styles.brandSany}>SANY</Text>
    </View>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderBar} />
      <Text style={styles.sectionHeaderText}>{children}</Text>
    </View>
  );
}

function Footer({ clienteNome }: { clienteNome: string }) {
  return (
    <Text
      style={styles.footer}
      fixed
      render={({ pageNumber, totalPages }) =>
        `IRMEN | SANY  •  irmen.com.br  •  Proposta Comercial – ${clienteNome}  •  Página ${pageNumber} de ${totalPages}`
      }
    />
  );
}

export function ProposalDocument({ data }: { data: ProposalDocumentData }) {
  const totalGeral = data.items.reduce((sum, it) => sum + it.totalValue, 0);
  const totalQuantidade = data.items.reduce((sum, it) => sum + it.quantity, 0);
  const firstItem = data.items[0];

  return (
    <Document title="Proposta Comercial — IRMEN SANY">
      {/* Página 1 — Banner + dados do cliente/proponente + "Quem somos" + foto da filial */}
      <Page size="A4" style={styles.page}>
        <Image src={PROPOSAL_ASSETS.heroBanner} style={{ width: PAGE_W, height: PAGE_W * (411 / 1400) }} />

        <View style={styles.content}>
          <View style={[styles.hr, styles.headerBlockRow]}>
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 1 }}>PROPOSTA COMERCIAL</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5, color: COLOR.accent, marginBottom: 8 }}>
                {data.dealTitle}
              </Text>
              <Text style={styles.headerBlockLabel}>Destinatário</Text>
              <Text style={styles.headerBlockValue}>{data.clienteNome}</Text>
              <Text style={styles.headerBlockLabel}>Data</Text>
              <Text style={styles.headerBlockValue}>{data.dataProposta}</Text>
              <Text style={styles.headerBlockLabel}>Validade</Text>
              <Text style={[styles.headerBlockValue, { marginBottom: 0 }]}>{data.validadeProposta || "—"}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: COLOR.line }}>
              <Text style={styles.proponenteLabel}>Proponente</Text>
              <Text style={[styles.proponenteLine, { fontFamily: "Helvetica-Bold", marginBottom: 2 }]}>
                {IRMEN_INFO.razaoSocial}
              </Text>
              <Text style={styles.proponenteLine}>CNPJ: {IRMEN_INFO.cnpj}</Text>
              <Text style={styles.proponenteLine}>{IRMEN_INFO.filial}</Text>
              <Text style={styles.proponenteLine}>{IRMEN_INFO.endereco}</Text>
              <Text style={styles.proponenteLine}>{IRMEN_INFO.cep}</Text>
            </View>
          </View>

          <Text style={[styles.paragraph, { marginTop: 6 }]}>
            Temos o prazer de apresentar uma breve introdução sobre a Irmen e as nossas condições comerciais
            referentes ao {data.dealTitle}.
          </Text>

          <SectionHeader>Quem somos</SectionHeader>
          <Image
            src={PROPOSAL_ASSETS.irmenLogoLockup}
            style={{ width: 85, height: 85 * (184 / 719), marginBottom: 2 }}
          />
          <Image
            src={PROPOSAL_ASSETS.quemSomosStats}
            style={{ width: CONTENT_W * 0.92, height: CONTENT_W * 0.92 * (504 / 1200), alignSelf: "center" }}
          />
          <Image
            src={PROPOSAL_ASSETS.facilityPhoto}
            style={{ width: CONTENT_W * 0.85, height: CONTENT_W * 0.85 * (471 / 1000), marginTop: 4, alignSelf: "center" }}
          />
        </View>
        <Footer clienteNome={data.clienteNome} />
      </Page>

      {/* Página 2 — apresentação SANY, equipamento (foto + principais características) e,
          logo abaixo, a proposta de preço e as condições comerciais. Quando o processo
          tem mais de um item, cada item extra ganha sua própria foto/tabela antes da
          proposta de preço; a apresentação SANY aparece só uma vez. */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <BrandLockup />

          {!!firstItem && (
            <Image
              src={PROPOSAL_ASSETS.sanyBrandBlock}
              style={{ width: CONTENT_W, height: CONTENT_W * (509 / 1200), marginBottom: 10 }}
            />
          )}

          {data.items.map((item, index) => (
            <View key={index} wrap={false}>
              <SectionHeader>{index === 0 ? "Equipamento ofertado" : `Equipamento ofertado ${index + 1}`}</SectionHeader>
              <Text style={styles.equipTitle}>{item.object}</Text>
              {!!item.model && <Text style={styles.equipModel}>{item.model}</Text>}

              <View style={{ width: CONTENT_W / 2 - 8, marginBottom: 10 }}>
                {item.photos.slice(0, 1).map((photo, photoIndex) => (
                  <Image
                    key={photoIndex}
                    src={photo}
                    style={{
                      width: CONTENT_W / 2 - 8,
                      height: (CONTENT_W / 2 - 8) * 0.62,
                      objectFit: "cover",
                    }}
                  />
                ))}
              </View>
            </View>
          ))}

          <SectionHeader>Proposta de preço</SectionHeader>

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
                <Text style={{ fontSize: 6.5, lineHeight: 1.35, color: COLOR.body }}>{item.descriptiveText || "—"}</Text>
              </View>
              <Text style={[styles.tableCell, { width: COL.qty }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { width: COL.unit }]}>{formatBRL(item.unitValue)}</Text>
              <Text style={[styles.tableCell, { width: COL.total }]}>{formatBRL(item.totalValue)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={[styles.totalCell, { width: COL.descr + COL.qty + COL.unit }]}>Valor Total</Text>
            <Text style={[styles.totalCellValue, { width: COL.total }]}>{formatBRL(totalGeral)}</Text>
          </View>

          <View style={styles.condHeaderRow}>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Classificação Fiscal</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Alíquota de ICMS</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Condição de Pagamento</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Garantia</Text>
          </View>
          <View style={styles.condValueRow}>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4, color: COLOR.muted, fontStyle: "italic" }]}>
              Conforme NCM do item
            </Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4 }]}>{data.aliquotaIcms || "—"}</Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4 }]}>{data.condicoesPagamento || "—"}</Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4 }]}>{data.prazoGarantia || "—"}</Text>
          </View>

          <View style={styles.condHeaderRow}>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Local de Entrega</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Prazo de Entrega</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Validade da Proposta</Text>
            <Text style={[styles.condHeaderCell, { width: CONTENT_W / 4 }]}>Quantidade</Text>
          </View>
          <View style={styles.condValueRow}>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4 }]}>{data.localEntrega || "—"}</Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4 }]}>{data.prazoEntrega || "—"}</Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4 }]}>{data.validadeProposta || "—"}</Text>
            <Text style={[styles.condValueCell, { width: CONTENT_W / 4 }]}>
              {totalQuantidade} {totalQuantidade === 1 ? "unidade" : "unidades"}
            </Text>
          </View>
        </View>
        <Footer clienteNome={data.clienteNome} />
      </Page>

      {/* Página 3 — Estrutura e Atendimento + Consultora Responsável (contato) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <BrandLockup />
          <SectionHeader>Estrutura e atendimento</SectionHeader>
          <Image
            src={PROPOSAL_ASSETS.estruturaAtendimento}
            style={{ width: CONTENT_W, height: CONTENT_W * (842 / 1200), marginBottom: 22 }}
          />

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.proponenteLabel}>Consultora Responsável</Text>
              <Text style={styles.consultantName}>{data.consultorNome}</Text>
              <Text style={styles.consultantRole}>
                {data.consultorCargo || "Consultor"} – IRMEN/SANY
              </Text>

              {!!data.consultorEmail && (
                <Text style={styles.consultantValue}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>E-mail: </Text>
                  {data.consultorEmail}
                </Text>
              )}
              {!!data.consultorContato && (
                <Text style={[styles.consultantValue, { marginTop: 3 }]}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Telefone: </Text>
                  {data.consultorContato}
                </Text>
              )}
              <Text style={[styles.consultantValue, { marginTop: 3 }]}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Site: </Text>
                {IRMEN_INFO.site}
              </Text>
              <Text style={[styles.consultantValue, { marginTop: 3 }]}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>LinkedIn: </Text>
                {IRMEN_INFO.linkedin}
              </Text>
              <Text style={[styles.consultantValue, { marginTop: 3 }]}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Instagram: </Text>
                {IRMEN_INFO.instagram}
              </Text>
            </View>

            <Image src={PROPOSAL_ASSETS.qrBadge} style={styles.qrBadgeImg} />
          </View>
        </View>

        <View style={{ position: "absolute", bottom: 26, left: 0, right: 0, alignItems: "center" }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, color: COLOR.text }}>
            {IRMEN_INFO.razaoSocial}
          </Text>
          <Text style={{ fontSize: 7, color: COLOR.muted, marginTop: 2 }}>CNPJ {IRMEN_INFO.cnpj}</Text>
        </View>
      </Page>
    </Document>
  );
}
