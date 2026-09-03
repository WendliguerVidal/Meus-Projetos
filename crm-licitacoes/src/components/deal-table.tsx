"use client";

import * as React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatDate, initials, isOverdue } from "@/lib/utils";
import { DEAL_CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, type DealCategory } from "@/types/deal";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import type { DealWithRelations } from "@/types";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

const VISIBLE_CATEGORIES: DealCategory[] = DEAL_CATEGORIES.filter((c) => c !== "ARQUIVADO");

export function DealTable({ deals }: { deals: DealWithRelations[] }) {
  const { openDeal } = useDealUI();
  const [openItems, setOpenItems] = React.useState<string[]>(["ANDAMENTO"]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, DealWithRelations[]>();
    for (const category of VISIBLE_CATEGORIES) map.set(category, []);
    for (const deal of deals) {
      if (deal.category === "ARQUIVADO") continue;
      map.get(deal.category)?.push(deal);
    }
    return map;
  }, [deals]);

  const allOpen = openItems.length === VISIBLE_CATEGORIES.length;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setOpenItems(allOpen ? [] : [...VISIBLE_CATEGORIES])}
        >
          {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
          {allOpen ? "Recolher Tudo" : "Expandir Tudo"}
        </Button>
      </div>

      <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="rounded-lg border">
        {VISIBLE_CATEGORIES.map((category) => {
          const items = grouped.get(category) ?? [];
          return (
            <AccordionItem key={category} value={category} className="border-b px-3 last:border-b-0">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                  <span className="font-semibold">{CATEGORY_LABELS[category]}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {items.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground">Nenhum processo nesta categoria.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Cidade/UF</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Prazo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((deal) => {
                        const overdue =
                          isOverdue(deal.deadline) &&
                          !["GANHO", "PERDIDO", "CONCLUIDO", "ARQUIVADO"].includes(deal.category);
                        return (
                          <TableRow key={deal.id} className="cursor-pointer" onClick={() => openDeal(deal.id)}>
                            <TableCell className="max-w-[280px] truncate font-medium">{deal.title}</TableCell>
                            <TableCell className="max-w-[180px] truncate">{deal.client}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {deal.city}/{deal.state}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{deal.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {deal.assignedTo ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[9px]">{initials(deal.assignedTo.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate text-xs">{deal.assignedTo.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className={cn("whitespace-nowrap text-xs", overdue && "font-semibold text-destructive")}>
                              {formatDate(deal.deadline)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
