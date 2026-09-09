"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FileText, Loader2, Sparkles, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { editalImportSchema, type EditalImportFormValues, type EditalExtractionData } from "@/types/edital-import";
import { BRAZIL_STATES } from "@/types/deal";
import { useExtractEdital, useCreateDealFromEdital } from "@/hooks/use-edital-import";

type Step = "upload" | "preview";

function toLocalInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/** Converte o resultado bruto da IA (campos possivelmente nulos) nos valores iniciais do
 * formulário de prévia — nunca deixa um campo obrigatório "quebrado": preenche com um
 * padrão seguro para o usuário revisar/corrigir em vez de travar o formulário. */
function extractionToFormDefaults(data: EditalExtractionData): EditalImportFormValues {
  return {
    title: data.title ?? "",
    client: data.client ?? "",
    city: data.city ?? "",
    state: (data.state as EditalImportFormValues["state"]) ?? "MG",
    equipment: data.equipment ?? "",
    model: data.model ?? "",
    serialNumber: data.serialNumber ?? "",
    deadline: (data.deadline
      ? toLocalInputValue(new Date(data.deadline))
      : "") as unknown as EditalImportFormValues["deadline"],
    estimatedValue: data.estimatedValue ?? null,
    summary: data.summary ?? "",
  };
}

export function ImportEditalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { mutate: extract, isPending: extracting } = useExtractEdital();
  const { mutate: createDeal, isPending: saving } = useCreateDealFromEdital();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditalImportFormValues>({
    resolver: zodResolver(editalImportSchema),
  });

  // Sempre volta para o passo de upload (e limpa tudo) quando o modal fecha e reabre —
  // evita mostrar a prévia de uma importação anterior por engano.
  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName(null);
      setDragOver(false);
    }
  }, [open]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const formData = new FormData();
    formData.set("file", file);
    extract(formData, {
      onSuccess: (data) => {
        reset(extractionToFormDefaults(data));
        setStep("preview");
      },
      // Em caso de erro (PDF ilegível, sem chave de IA configurada, etc.) o toast de erro
      // já é disparado pelo hook — aqui só garantimos que o usuário continua no passo de
      // upload para tentar novamente, sem qualquer crash de tela.
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const state = watch("state");
  const estimatedValue = watch("estimatedValue");

  const onSubmit = (data: EditalImportFormValues) => {
    createDeal(data, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Importar Edital (PDF)
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Envie o PDF do edital — a IA lê o documento e pré-preenche o cadastro do processo e do compromisso no calendário."
              : "Confira os dados extraídos do edital e ajuste o que for necessário antes de salvar."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? "border-primary bg-accent" : ""
              }`}
            >
              {extracting ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Lendo edital e extraindo informações via IA...</p>
                  {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
                  <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Arraste o PDF do edital aqui ou</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                    Selecionar arquivo
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <p className="text-xs text-muted-foreground">PDF · tamanho máximo 3,5MB</p>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{fileName}</span>
              <span className="ml-auto shrink-0 font-medium text-foreground">Dados extraídos — revise antes de salvar</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edital-title">Título do Processo *</Label>
                <Input id="edital-title" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edital-client">Cliente/Órgão *</Label>
                <Input id="edital-client" {...register("client")} />
                {errors.client && <p className="text-xs text-destructive">{errors.client.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edital-city">Cidade *</Label>
                <Input id="edital-city" {...register("city")} />
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>UF *</Label>
                <Select value={state} onValueChange={(v) => setValue("state", v as EditalImportFormValues["state"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZIL_STATES.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edital-deadline">Prazo / Abertura</Label>
                <Input id="edital-deadline" type="datetime-local" {...register("deadline")} />
                {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edital-value">Valor Estimado</Label>
                <CurrencyInput
                  id="edital-value"
                  value={typeof estimatedValue === "number" ? estimatedValue : null}
                  onValueChange={(v) => setValue("estimatedValue", v)}
                />
                {errors.estimatedValue && <p className="text-xs text-destructive">{errors.estimatedValue.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edital-equipment">Equipamento</Label>
                <Input id="edital-equipment" {...register("equipment")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edital-model">Modelo/Especificação</Label>
                <Input id="edital-model" {...register("model")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edital-serial">Número de Série/Código do Processo</Label>
                <Input id="edital-serial" {...register("serialNumber")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edital-summary">Resumo (vira a descrição do evento no calendário)</Label>
                <Textarea id="edital-summary" rows={3} {...register("summary")} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Processo
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
