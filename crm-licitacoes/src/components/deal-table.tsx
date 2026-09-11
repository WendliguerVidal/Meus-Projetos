"use client";

import * as React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn, formatDate, initials } from "@/lib/utils";
import { getDealUrgency } from "@/lib/urgency";
import { DEAL_CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_STATUSES, type DealCategory } from "@/types/deal";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import { useDeleteDeal } from "@/hooks/use-deals";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { DealWithRelations } from "@/types";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronsDownUp, ChevronsUpDown, ListFilter, Trash2 } from "lucide-react";

const VISIBLE_CATEGORIES: DealCategory[] = DEAL_CATEGORIES.filter((c) => c !== "ARQUIVADO");

type SortDir = "asc" | "desc" | null;

/** Botão pequeno com funil — filtra as linhas da seção pelos Status marcados. Vazio
 * (nenhum marcado) equivale a "mostrar todos", igual ao estado inicial. */
function StatusFilterButton({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const active = selected.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-5 w-5 shrink-0", active && "text-primary")}
          onClick={(e) => e.stopPropagation()}
          aria-label="Filtrar por status"
        >
          <ListFilter className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Filtrar por status</span>
          {active && (
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => onChange([])}>
              Limpar
            </button>
          )}
        </div>
        <div className="space-y-1">
          {options.map((status) => {
            const checked = selected.includes(status);
            const toggle = () => onChange(checked ? selected.filter((s) => s !== status) : [...selected, status]);
            return (
              <div
                key={status}
                role="button"
                tabIndex={0}
                onClick={toggle}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-accent"
              >
                <Checkbox checked={checked} onClick={(e) => e.stopPropagation()} onCheckedChange={toggle} />
                <span className="truncate">{status}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Botão pequeno que alterna a ordenação da coluna Prazo: sem ordenação → crescente →
 * decrescente → sem ordenação. Processos sem prazo definido sempre ficam por último. */
function SortButton({ direction, onToggle }: { direction: SortDir; onToggle: () => void }) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-5 w-5 shrink-0", direction && "text-primary")}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label="Ordenar por prazo"
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function nextSortDir(current: SortDir): SortDir {
  if (current === null) return "asc";
  if (current === "asc") return "desc";
  return null;
}

export function DealTable({
  deals,
  selectedCategory,
}: {
  deals: DealWithRelations[];
  /** Categoria escolhida na Sidebar — é aberta automaticamente e recebe destaque visual. */
  selectedCategory?: DealCategory | null;
}) {
  const { openDeal } = useDealUI();
  const [openItems, setOpenItems] = React.useState<string[]>(["ANDAMENTO"]);
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; title: string } | null>(null);
  const { mutate: removeDeal, isPending: deleting } = useDeleteDeal();
  const isAdmin = useIsAdmin();

  // Filtro de Status e ordenação por Prazo são independentes por categoria — cada seção
  // do accordion tem seu próprio conjunto de status possíveis (ver CATEGORY_STATUSES) e
  // faz sentido poder ordenar/filtrar uma seção sem afetar as outras.
  const [statusFilters, setStatusFilters] = React.useState<Partial<Record<DealCategory, string[]>>>({});
  const [sortDirs, setSortDirs] = React.useState<Partial<Record<DealCategory, SortDir>>>({});

  // Ao selecionar uma categoria na Sidebar: garante que a seção correspondente esteja
  // expandida (sem recolher as demais) e rola a tela até ela.
  React.useEffect(() => {
    if (!selectedCategory || !VISIBLE_CATEGORIES.includes(selectedCategory)) return;
    setOpenItems((prev) => (prev.includes(selectedCategory) ? prev : [...prev, selectedCategory]));
    document
      .getElementById(`categoria-${selectedCategory}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedCategory]);

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
          const isSelected = category === selectedCategory;
          const activeStatuses = statusFilters[category] ?? [];
          const sortDir = sortDirs[category] ?? null;

          let visibleItems = activeStatuses.length > 0 ? items.filter((d) => activeStatuses.includes(d.status)) : items;
          if (sortDir) {
            // Sem prazo definido sempre por último, em qualquer direção — não faz
            // sentido "ordenar" o que não tem data.
            visibleItems = [...visibleItems].sort((a, b) => {
              if (!a.deadline && !b.deadline) return 0;
              if (!a.deadline) return 1;
              if (!b.deadline) return -1;
              const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
              return sortDir === "asc" ? diff : -diff;
            });
          }

          return (
            <AccordionItem
              key={category}
              id={`categoria-${category}`}
              value={category}
              className={cn(
                "border-b px-3 last:border-b-0 transition-colors",
                isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30 rounded-md"
              )}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                  <span className="font-semibold">{CATEGORY_LABELS[category]}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                  {isSelected && <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Selecionada</Badge>}
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
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Status
                            <StatusFilterButton
                              options={CATEGORY_STATUSES[category]}
                              selected={activeStatuses}
                              onChange={(next) => setStatusFilters((prev) => ({ ...prev, [category]: next }))}
                            />
                          </div>
                        </TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Prazo
                            <SortButton
                              direction={sortDir}
                              onToggle={() =>
                                setSortDirs((prev) => ({ ...prev, [category]: nextSortDir(prev[category] ?? null) }))
                              }
                            />
                          </div>
                        </TableHead>
                        {isAdmin && <TableHead className="w-10 text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 7 : 6} className="py-6 text-center text-sm text-muted-foreground">
                            Nenhum processo com o status selecionado.
                          </TableCell>
                        </TableRow>
                      )}
                      {visibleItems.map((deal) => {
                        const urgency = getDealUrgency(deal.deadline, deal.category);
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
                            <TableCell className={cn("whitespace-nowrap text-xs", urgency === "OVERDUE" && "font-semibold text-destructive")}>
                              <div className="flex flex-col items-start gap-1">
                                <span>{formatDate(deal.deadline)}</span>
                                {deal.deadline && urgency && <UrgencyBadge date={deal.deadline} level={urgency} dateOnly />}
                              </div>
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingDelete({ id: deal.id, title: deal.title });
                                      }}
                                      aria-label="Excluir processo"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir Processo</TooltipContent>
                                </Tooltip>
                              </TableCell>
                            )}
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

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir processo"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir o processo "${pendingDelete.title}"? Esta ação não pode ser desfeita e remove notas, lembretes, anexos e histórico vinculados a ele.`
            : ""
        }
        confirmLabel="Excluir"
        loading={deleting}
        confirmText={pendingDelete?.title}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeDeal(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}
