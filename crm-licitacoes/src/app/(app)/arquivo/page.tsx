"use client";

import * as React from "react";
import { useDeals } from "@/hooks/use-deals";
import { useSearch } from "@/components/layout/search-context";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import { monthLabel } from "@/lib/utils";
import { Archive } from "lucide-react";

export default function ArquivoPage() {
  const { data: allDeals, isLoading } = useDeals({ category: "ARQUIVADO" });
  const { search } = useSearch();
  const { openDeal } = useDealUI();

  const deals = React.useMemo(() => {
    if (!search.trim()) return allDeals ?? [];
    const term = search.trim().toLowerCase();
    return (allDeals ?? []).filter(
      (d) => d.title.toLowerCase().includes(term) || d.client.toLowerCase().includes(term) || d.city.toLowerCase().includes(term)
    );
  }, [allDeals, search]);

  const grouped = React.useMemo(() => {
    const byYear = new Map<number, Map<number, typeof deals>>();
    for (const deal of deals) {
      const year = deal.archivedYear ?? new Date(deal.updatedAt).getFullYear();
      const month = deal.archivedMonth ?? new Date(deal.updatedAt).getMonth() + 1;
      if (!byYear.has(year)) byYear.set(year, new Map());
      const byMonth = byYear.get(year)!;
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(deal);
    }
    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries()).sort((a, b) => b[0] - a[0]),
      }));
  }, [deals]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Archive className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Arquivo</h1>
          <p className="text-sm text-muted-foreground">Processos arquivados agrupados por ano e mês.</p>
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && deals.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhum processo arquivado.</p>
      )}

      {grouped.map(({ year, months }) => (
        <div key={year} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{year}</h2>
          <Accordion type="multiple" className="rounded-lg border">
            {months.map(([month, items]) => (
              <AccordionItem key={month} value={`${year}-${month}`} className="border-b px-3 last:border-b-0">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{monthLabel(month)}</span>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Cidade/UF</TableHead>
                        <TableHead>Status Original</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((deal) => (
                        <TableRow key={deal.id} className="cursor-pointer" onClick={() => openDeal(deal.id)}>
                          <TableCell className="max-w-[280px] truncate font-medium">{deal.title}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{deal.client}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {deal.city}/{deal.state}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{deal.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
