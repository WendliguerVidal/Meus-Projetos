"use client";

import { DealForm } from "@/components/deal-details/deal-form";
import { useUpdateDeal } from "@/hooks/use-deals";
import type { DealFormValues } from "@/types/deal";
import type { DealWithRelations } from "@/types";

export function GeneralTab({ deal }: { deal: DealWithRelations }) {
  const { mutate, isPending } = useUpdateDeal();

  const handleSubmit = (data: DealFormValues) => {
    mutate({ id: deal.id, input: data });
  };

  return (
    <DealForm
      defaultValues={{
        title: deal.title,
        client: deal.client,
        city: deal.city,
        state: deal.state as DealFormValues["state"],
        equipment: deal.equipment ?? "",
        model: deal.model ?? "",
        serialNumber: deal.serialNumber ?? "",
        category: deal.category,
        status: deal.status,
        lossReason: deal.lossReason,
        lossDetail: deal.lossDetail ?? "",
        deadline: deal.deadline,
        assignedToId: deal.assignedToId,
      }}
      onSubmit={handleSubmit}
      submitting={isPending}
      submitLabel="Salvar Alterações"
    />
  );
}
