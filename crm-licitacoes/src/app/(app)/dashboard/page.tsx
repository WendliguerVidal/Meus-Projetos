"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats, useDeals } from "@/hooks/use-deals";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import { exportDealsToExcel } from "@/lib/export-excel";
import {
  DEAL_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  LOSS_REASON_LABELS,
  type LossReason,
} from "@/types/deal";
import { cn, formatDate, isOverdue, daysUntil } from "@/lib/utils";
import { Download, TrendingUp, TrendingDown, CalendarClock } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: allDeals } = useDeals();
  const { openDeal } = useDealUI();

  const lossData = React.useMemo(() => {
    if (!stats) return [];
    return (Object.entries(stats.lossReasonCounts) as [LossReason, number][])
      .map(([reason, count]) => ({ reason: LOSS_REASON_LABELS[reason], count }))
      .sort((a, b) => b.count - a.count);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Painel de Indicadores</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada dos processos e negócios.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => allDeals && exportDealsToExcel(allDeals, "dashboard-processos")}
          disabled={!allDeals?.length}
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {isLoading || !stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DEAL_CATEGORIES.map((category) => (
            <Card key={category}>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                  <span className="text-xs font-medium text-muted-foreground">{CATEGORY_LABELS[category]}</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{stats.totalsByCategory[category] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {stats && stats.conversionRate >= 50 ? (
                <TrendingUp className="h-4 w-4 text-category-ganho" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              Taxa de Conversão
            </CardTitle>
            <CardDescription>Ganhos em relação a Ganhos + Perdidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading || !stats ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <p className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                <Progress value={stats.conversionRate} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ganhos: {stats.totalsByCategory.GANHO ?? 0}</span>
                  <span>Perdidos: {stats.totalsByCategory.PERDIDO ?? 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Motivos de Perda Mais Frequentes</CardTitle>
            <CardDescription>Distribuição dos processos marcados como Perdido</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : lossData.length === 0 ? (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                Nenhum processo perdido registrado.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={lossData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="reason" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {lossData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS.PERDIDO} fillOpacity={1 - i * 0.12} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Prazos Iminentes
          </CardTitle>
          <CardDescription>Processos ativos ordenados pelo prazo mais próximo</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !stats || stats.upcomingDeadlines.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum prazo pendente.</p>
          ) : (
            <div className="space-y-1">
              {stats.upcomingDeadlines.map((deal) => {
                const overdue = isOverdue(deal.deadline);
                const days = daysUntil(deal.deadline);
                return (
                  <button
                    key={deal.id}
                    onClick={() => openDeal(deal.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{deal.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {deal.client} · {deal.city}/{deal.state}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {CATEGORY_LABELS[deal.category]}
                    </Badge>
                    <span className={cn("shrink-0 text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
                      {formatDate(deal.deadline)}
                      {overdue ? " (atrasado)" : days !== null ? ` (${days}d)` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
