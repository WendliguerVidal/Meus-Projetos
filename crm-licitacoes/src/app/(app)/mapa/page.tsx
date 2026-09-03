"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DealsMapLoader } from "@/components/map/deals-map-loader";
import { useDeals } from "@/hooks/use-deals";
import { useSearch } from "@/components/layout/search-context";
import * as React from "react";

export default function MapaPage() {
  const { data: deals, isLoading } = useDeals();
  const { search } = useSearch();

  const visibleDeals = React.useMemo(() => {
    const nonArchived = (deals ?? []).filter((d) => d.category !== "ARQUIVADO");
    if (!search.trim()) return nonArchived;
    const term = search.trim().toLowerCase();
    return nonArchived.filter(
      (d) => d.title.toLowerCase().includes(term) || d.client.toLowerCase().includes(term) || d.city.toLowerCase().includes(term)
    );
  }, [deals, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Mapa de Processos</h1>
        <p className="text-sm text-muted-foreground">Visualização geográfica por cidade e categoria.</p>
      </div>
      {isLoading ? <Skeleton className="h-[calc(100vh-9rem)] w-full" /> : <DealsMapLoader deals={visibleDeals} />}
    </div>
  );
}
