"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DealForm } from "./deal-form";
import { useCreateDeal } from "@/hooks/use-deals";
import type { DealFormValues } from "@/types/deal";
import { defaultStatusFor, type DealCategory } from "@/types/deal";

export function NewDealDialog({
  open,
  onOpenChange,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: DealCategory | null;
}) {
  const { mutate, isPending } = useCreateDeal();

  const handleSubmit = (data: DealFormValues) => {
    mutate(data, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Processo</DialogTitle>
          <DialogDescription>Cadastre um novo processo de licitação ou negócio.</DialogDescription>
        </DialogHeader>
        {open && (
          <DealForm
            key={defaultCategory ?? "default"}
            defaultValues={
              defaultCategory
                ? { category: defaultCategory, status: defaultStatusFor(defaultCategory) }
                : undefined
            }
            onSubmit={handleSubmit}
            submitting={isPending}
            submitLabel="Criar Processo"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
