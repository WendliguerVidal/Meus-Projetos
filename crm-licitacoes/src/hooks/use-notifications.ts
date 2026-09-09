"use client";

import { useQuery } from "@tanstack/react-query";
import { getUrgentItems } from "@/app/actions/notifications";

/** Prazos urgentes (vencidos ou a vencer em até 3 dias) para o badge/popover do
 * cabeçalho — mesmo intervalo de 60s de useTodayReminders, leve o bastante para
 * manter o sino atualizado sem precisar de reload manual da página. */
export function useUrgentItems() {
  return useQuery({
    queryKey: ["urgent-items"],
    queryFn: () => getUrgentItems(),
    refetchInterval: 60_000,
  });
}
