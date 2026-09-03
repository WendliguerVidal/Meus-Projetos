"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DealTable } from "@/components/deal-table";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DealsMapLoader } from "@/components/map/deals-map-loader";
import { useDeals } from "@/hooks/use-deals";
import { useSearch } from "@/components/layout/search-context";
import { exportDealsToExcel } from "@/lib/export-excel";
import { DEAL_CATEGORIES, CATEGORY_LABELS, type DealCategory } from "@/types/deal";
import { Download, LayoutGrid, Map as MapIcon, Table2 } from "lucide-react";

const KANBAN_CATEGORIES: DealCategory[] = DEAL_CATEGORIES.filter((c) => c !== "ARQUIVADO");

export default function HomePage() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category") as DealCategory | null;
  const { search } = useSearch();

  const [kanbanCategory, setKanbanCategory] = React.useState<DealCategory>(
    urlCategory && KANBAN_CATEGORIES.includes(urlCategory) ? urlCategory : "ANDAMENTO"
  );

  React.useEffect(() => {
    if (urlCategory && KANBAN_CATEGORIES.includes(urlCategory)) {
      setKanbanCategory(urlCategory);
    }
  }, [urlCategory]);

  const { data: deals, isLoading } = useDeals();

  const visibleDeals = React.useMemo(() => {
    const nonArchived = (deals ?? []).filter((d) => d.category !== "ARQUIVADO");
    if (!search.trim()) return nonArchived;
    const term = search.trim().toLowerCase();
    return nonArchived.filter(
      (d) =>
        d.title.toLowerCase().includes(term) ||
        d.client.toLowerCase().includes(term) ||
        d.city.toLowerCase().includes(term) ||
        (d.serialNumber ?? "").toLowerCase().includes(term) ||
        (d.equipment ?? "").toLowerCase().includes(term)
    );
  }, [deals, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Processos e Licitações</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${visibleDeals.length} processo(s) encontrados`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportDealsToExcel(visibleDeals, "processos")}
          disabled={visibleDeals.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <Tabs defaultValue="tabela">
        <TabsList>
          <TabsTrigger value="tabela" className="gap-1.5">
            <Table2 className="h-4 w-4" />
            Tabela
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="mapa" className="gap-1.5">
            <MapIcon className="h-4 w-4" />
            Mapa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabela">
          {isLoading ? <Skeleton className="h-64 w-full" /> : <DealTable deals={visibleDeals} />}
        </TabsContent>

        <TabsContent value="kanban" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Categoria:</span>
            <Select value={kanbanCategory} onValueChange={(v) => setKanbanCategory(v as DealCategory)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <KanbanBoard deals={visibleDeals} category={kanbanCategory} />
          )}
        </TabsContent>

        <TabsContent value="mapa">
          {isLoading ? <Skeleton className="h-96 w-full" /> : <DealsMapLoader deals={visibleDeals} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
