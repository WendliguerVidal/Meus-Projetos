import "server-only";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PROPOSAL_ASSETS } from "./proposal-assets";

// ---------------------------------------------------------------------------
// Documento da Proposta Comercial (PDF) — molde de
// "Proposta-Comercial-Itarare-STG190C8.docx" (modelo aprovado pelo usuário): banner +
// dados do cliente/proponente, "Quem somos", um bloco por máquina (título/modelo/fotos/
// principais características), tabela de preços com o descritivo técnico dentro da
// própria célula, condições comerciais, estrutura/atendimento e contato (consultor
// responsável). Fotos de cada máquina e a tabela de "Principais Características" vêm do
// Cadastro de Equipamentos (ver actions/proposal.ts); as demais imagens (banner, "quem
// somos", fachada da filial, apresentação SANY, infográfico de estrutura/atendimento e QR)
// são fixas — ver proposal-assets.ts.
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
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
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: COLOR.text },
  content: { padding: MARGIN },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  brandIrmen: { fontFamily: "Helvetica-Bold", fontSize: 12, color: "#141517" },
  brandSany: { fontFamily: "Helvetica-Bold", fontSize: 12, color: COLOR.accent, marginLeft: 8 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: MARGIN,
    right: MARGIN,
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: "#9a9a9a",
    textAlign: "center",
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "stretch", marginBottom: 12, marginTop: 4 },
  sectionHeaderBar: { width: 3, backgroundColor: COLOR.accent, marginRight: 8 },
  sectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.5,
    color: COLOR.text,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  hr: { borderBottomWidth: 1, borderBottomColor: COLOR.line },
  headerBlockRow: { flexDirection: "row", paddingVertical: 14 },
  headerBlockLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: COLOR.text, marginBottom: 2 },
  headerBlockValue: { fontSize: 9.5, color: COLOR.body, marginBottom: 7 },
  proponenteLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  proponenteLine: { fontSize: 9, color: COLOR.body, lineHeight: 1.5 },
  paragraph: { fontSize: 10, color: COLOR.body, lineHeight: 1.6, marginBottom: 16 },
  equipTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 19,
    color: COLOR.text,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  equipModel: { fontFamily: "Helvetica-Bold", fontSize: 12.5, color: COLOR.accent, marginBottom: 14 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5, marginBottom: 14 },
  photoBox: { width: CONTENT_W / 2 - 10, height: (CONTENT_W / 2 - 10) * 0.72, margin: 5 },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  specTable: { marginBottom: 14 },
  specRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.line },
  specLabelCell: { width: 150, backgroundColor: COLOR.shade, padding: 7, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  specValueCell: { flex: 1, padding: 7, fontSize: 8.5, color: COLOR.body },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLOR.ink },
  tableHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    padding: 8,
    textTransform: "uppercase",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.line },
  tableCell: { padding: 8, fontSize: 8.5 },
  totalRow: { flexDirection: "row", backgroundColor: COLOR.shade, borderTopWidth: 2, borderTopColor: COLOR.ink },
  totalCell: { padding: 8, fontSize: 9, fontFamily: "Helvetica-Bold" },
  totalCellValue: { padding: 8, fontSize: 10, fontFamily: "Helvetica-Bold", color: COLOR.accent },
  descrLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 4 },
  condHeaderRow: { flexDirection: "row", backgroundColor: COLOR.ink, marginTop: 14 },
  condHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    padding: 8,
    textTransform: "uppercase",
  },
  condValueRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR.line },
  condValueCell: { padding: 9, fontSize: 9 },
  consultantName: { fontFamily: "Helvetica-Bold", fontSize: 19, marginBottom: 4, color: "#1c1e22" },
  consultantRole: { fontFamily: "Helvetica-Bold", fontSize: 11, color: COLOR.accent, marginBottom: 16 },
  consultantLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: COLOR.text, marginTop: 9, marginBottom: 2 },
  consultantValue: { fontSize: 9.5, color: COLOR.body },
  qrBadgeImg: { width: 108, height: 108 * (350 / 260) },
});

/** Coluna com largura fixa (soma ≈ CONTENT_W) reaproveitada na tabela de preços. */
const COL = { descr: 237, qty: 77, unit: 100, total: 100 };

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

  return (
    <Document title="Proposta Comercial — IRMEN SANY">
      {/* Página 1 — Banner + dados do cliente/proponente + "Quem somos" */}
      <Page size="A4" style={styles.page}>
        <Image src={PROPOSAL_ASSETS.heroBanner} style={{ width: PAGE_W, height: PAGE_W * (411 / 1400) }} />

        <View style={styles.content}>
          <View style={[styles.hr, styles.headerBlockRow]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 15, marginBottom: 2 }}>PROPOSTA COMERCIAL</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5, color: COLOR.accent, marginBottom: 12 }}>
                {data.dealTitle}
              </Text>
              <Text style={styles.headerBlockLabel}>Destinatário</Text>
              <Text style={styles.headerBlockValue}>{data.clienteNome}</Text>
              <Text style={styles.headerBlockLabel}>Data</Text>
              <Text style={styles.headerBlockValue}>{data.dataProposta}</Text>
              <Text style={styles.headerBlockLabel}>Validade</Text>
              <Text style={[styles.headerBlockValue, { marginBottom: 0 }]}>{data.validadeProposta || "—"}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: COLOR.line }}>
              <Text style={styles.proponenteLabel}>Proponente</Text>
              <Text style={[styles.proponenteLine, { fontFamily: "Helvetica-Bold", marginBottom: 3 }]}>
                {IRMEN_INFO.razaoSocial}
              </Text>
              <Text style={styles.proponenteLine}>CNPJ: {IRMEN_INFO.cnpj}</Text>
              <Text style={styles.proponenteLine}>{IRMEN_INFO.filial}</Text>
              <Text style={styles.proponenteLine}>{IRMEN_INFO.endereco}</Text>
              <Text style={styles.proponenteLine}>{IRMEN_INFO.cep}</Text>
            </View>
          </View>

          <Text style={[styles.paragraph, { marginTop: 18 }]}>
            Temos o prazer de apresentar uma breve introdução sobre a Irmen e as nossas condições comerciais
            referentes ao {data.dealTitle}.
          </Text>

          <SectionHeader>Quem somos</SectionHeader>
          <Image
            src={PROPOSAL_ASSETS.irmenLogoLockup}
            style={{ width: 170, height: 170 * (184 / 719), marginBottom: 16 }}
          />
          <Image src={PROPOSAL_ASSETS.quemSomosStats} style={{ width: CONTENT_W, height: CONTENT_W * (504 / 1200) }} />
        </View>
        <Footer clienteNome={data.clienteNome} />
      </Page>

      {/* Uma página por item — título/modelo, fotos do Cadastro de Equipamentos e a
          tabela de Principais Características (auto-preenchida a partir dos mesmos
          "Campos" cadastrados no equipamento). */}
      {data.items.map((item, index) => (
        <Page key={`item-${index}`} size="A4" style={styles.page}>
          <View style={styles.content}>
            <BrandLockup />
            <SectionHeader>Equipamento ofertado</SectionHeader>
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

            {item.specFields.length > 0 && (
              <>
                <SectionHeader>Principais características</SectionHeader>
                <View style={styles.specTable}>
                  {item.specFields.map((field, fieldIndex) => (
                    <View key={fieldIndex} style={styles.specRow} wrap={false}>
                      <Text style={styles.specLabelCell}>{field.label}</Text>
                      <Text style={styles.specValueCell}>{field.value}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {index === 0 && (
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                <Image
                  src={PROPOSAL_ASSETS.facilityPhoto}
                  style={{ width: CONTENT_W / 2 - 6, height: (CONTENT_W / 2 - 6) * (471 / 1000), marginRight: 12 }}
                />
                <Image
                  src={PROPOSAL_ASSETS.sanyBrandBlock}
                  style={{ width: CONTENT_W / 2 - 6, height: (CONTENT_W / 2 - 6) * (509 / 1200) }}
                />
              </View>
            )}
          </View>
          <Footer clienteNome={data.clienteNome} />
        </Page>
      ))}

      {/* Proposta de Preço + Condições Comerciais */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <BrandLockup />
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
                <Text style={{ fontSize: 8, lineHeight: 1.5, color: COLOR.body }}>{item.descriptiveText || "—"}</Text>
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

      {/* Estrutura e Atendimento + Consultora Responsável (contato) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <BrandLockup />
          <SectionHeader>Estrutura e atendimento</SectionHeader>
          <Image
            src={PROPOSAL_ASSETS.estruturaAtendimento}
            style={{ width: CONTENT_W, height: CONTENT_W * (842 / 1200), marginBottom: 28 }}
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

        <View style={{ position: "absolute", bottom: 30, left: 0, right: 0, alignItems: "center" }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, color: COLOR.text }}>
            {IRMEN_INFO.razaoSocial}
          </Text>
          <Text style={{ fontSize: 7.5, color: COLOR.muted, marginTop: 2 }}>CNPJ {IRMEN_INFO.cnpj}</Text>
        </View>
      </Page>
    </Document>
  );
}
