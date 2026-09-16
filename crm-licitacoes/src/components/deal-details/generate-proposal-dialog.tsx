"use client";

import * as React from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useProposalDefaults, useGenerateProposalPdf } from "@/hooks/use-proposal";

type ItemFormState = {
  dealItemId: string;
  object: string;
  model: string | null;
  quantity: number;
  descriptiveText: string;
  unitValue: number;
  totalValue: number;
  photoCount: number;
};

/** Modal "Gerar Proposta Comercial" — ao abrir, busca sugestões (cliente, descritivo
 * técnico de cada item a partir do Cadastro de Equipamentos, valores já salvos no
 * processo) e deixa tudo editável antes de gerar o PDF. O restante do documento (capa,
 * apresentação IRMEN/SANY, unidades e contato) segue sempre o mesmo modelo fixo — ver
 * lib/pdf/proposal-document.tsx. */
export function GenerateProposalDialog({
  dealId,
  open,
  onOpenChange,
}: {
  dealId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate: loadDefaults, isPending: loading } = useProposalDefaults();
  const { mutate: generate, isPending: generating } = useGenerateProposalPdf();

  const [dataProposta, setDataProposta] = React.useState("");
  const [clienteNome, setClienteNome] = React.useState("");
  const [aliquotaIcms, setAliquotaIcms] = React.useState("");
  const [condicoesPagamento, setCondicoesPagamento] = React.useState("");
  const [prazoGarantia, setPrazoGarantia] = React.useState("");
  const [localEntrega, setLocalEntrega] = React.useState("");
  const [prazoEntrega, setPrazoEntrega] = React.useState("");
  const [validadeProposta, setValidadeProposta] = React.useState("60 dias");
  const [items, setItems] = React.useState<ItemFormState[]>([]);
  const [loadError, setLoadError] = React.useState(false);

  // Sempre que o modal abre, busca do zero — evita mostrar dados de uma abertura anterior
  // (de outro processo, ou já alterados) numa nova geração.
  React.useEffect(() => {
    if (!open) return;
    setLoadError(false);
    setItems([]);
    loadDefaults(dealId, {
      onSuccess: (data) => {
        setDataProposta(data.dataProposta);
        setClienteNome(data.clienteNome);
        setLocalEntrega(data.localEntrega);
        setAliquotaIcms("");
        setCondicoesPagamento("");
        setPrazoGarantia("");
        setPrazoEntrega("");
        setValidadeProposta("60 dias");
        setItems(
          data.items.map((it) => ({
            dealItemId: it.dealItemId,
            object: it.object,
            model: it.model,
            quantity: it.quantity,
            descriptiveText: it.suggestedDescriptiveText,
            unitValue: it.suggestedUnitValue,
            totalValue: it.suggestedTotalValue,
            photoCount: it.photoCount,
          }))
        );
      },
      onError: () => setLoadError(true),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dealId]);

  const updateItem = (index: number, patch: Partial<ItemFormState>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const handleGenerate = () => {
    generate(
      {
        dealId,
        dataProposta,
        clienteNome,
        aliquotaIcms,
        condicoesPagamento,
        prazoGarantia,
        localEntrega,
        prazoEntrega,
        validadeProposta,
        items: items.map((it) => ({
          dealItemId: it.dealItemId,
          descriptiveText: it.descriptiveText,
          unitValue: it.unitValue,
          totalValue: it.totalValue,
        })),
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Proposta Comercial
          </DialogTitle>
          <DialogDescription>
            Confira e ajuste os dados abaixo. O restante do documento (capa, apresentação, unidades e contato)
            segue sempre o modelo padrão da IRMEN.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando dados do processo...
          </div>
        )}

        {!loading && loadError && (
          <p className="py-6 text-center text-sm text-destructive">
            Não foi possível carregar os dados da proposta. Feche e tente novamente.
          </p>
        )}

        {!loading && !loadError && items.length > 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="proposal-data">Data</Label>
                <Input id="proposal-data" value={dataProposta} onChange={(e) => setDataProposta(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proposal-cliente">Cliente / Órgão Público</Label>
                <Input id="proposal-cliente" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-semibold text-muted-foreground">Itens e Descritivo Técnico</p>
              {items.map((item, index) => (
                <div key={item.dealItemId} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {item.object}
                      {item.model ? ` · ${item.model}` : ""}
                      <span className="ml-1 font-normal text-muted-foreground">(Qtd. {item.quantity})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.photoCount > 0
                        ? `${item.photoCount} foto${item.photoCount > 1 ? "s" : ""} do equipamento incluída${item.photoCount > 1 ? "s" : ""}`
                        : "Nenhuma foto anexada a este equipamento"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Descritivo Técnico</Label>
                    <Textarea
                      rows={4}
                      value={item.descriptiveText}
                      onChange={(e) => updateItem(index, { descriptiveText: e.target.value })}
                      placeholder={
                        item.descriptiveText
                          ? undefined
                          : "Nenhuma característica salva para este equipamento — descreva manualmente."
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Unitário</Label>
                      <CurrencyInput
                        value={item.unitValue}
                        onValueChange={(v) => updateItem(index, { unitValue: v ?? 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Total</Label>
                      <CurrencyInput
                        value={item.totalValue}
                        onValueChange={(v) => updateItem(index, { totalValue: v ?? 0 })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-semibold text-muted-foreground">Condições Comerciais</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Alíquota de ICMS</Label>
                  <Input value={aliquotaIcms} onChange={(e) => setAliquotaIcms(e.target.value)} placeholder="Ex: 12%" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Condições de Pagamento</Label>
                  <Input
                    value={condicoesPagamento}
                    onChange={(e) => setCondicoesPagamento(e.target.value)}
                    placeholder="Ex: À vista"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Garantia</Label>
                  <Input
                    value={prazoGarantia}
                    onChange={(e) => setPrazoGarantia(e.target.value)}
                    placeholder="Ex: 24 meses sem limite de horas"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Local de Entrega</Label>
                  <Input value={localEntrega} onChange={(e) => setLocalEntrega(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo de Entrega</Label>
                  <Input value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} placeholder="Ex: 90 dias" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Validade da Proposta</Label>
                  <Input value={validadeProposta} onChange={(e) => setValidadeProposta(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            disabled={loading || loadError || items.length === 0 || generating}
            onClick={handleGenerate}
          >
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
