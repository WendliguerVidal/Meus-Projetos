"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeal } from "@/hooks/use-deals";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/deal";
import { GeneralTab } from "./tabs/general-tab";
import { HistoryTab } from "./tabs/history-tab";
import { RemindersTab } from "./tabs/reminders-tab";
import { AttachmentsTab } from "./tabs/attachments-tab";
import { AuditTab } from "./tabs/audit-tab";

export function DealDetailsSheet({
  dealId,
  onOpenChange,
}: {
  dealId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: deal, isLoading } = useDeal(dealId);

  return (
    <Sheet open={!!dealId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          {isLoading || !deal ? (
            <Skeleton className="h-6 w-2/3" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[deal.category] }}
                />
                <SheetTitle className="truncate">{deal.title}</SheetTitle>
              </div>
              <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{deal.client}</span>
                <span>·</span>
                <span>{deal.city}/{deal.state}</span>
                <Badge variant="secondary">{CATEGORY_LABELS[deal.category]}</Badge>
                <Badge variant="outline">{deal.status}</Badge>
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {deal && (
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="geral">
              <TabsList className="mb-4 flex w-full flex-wrap h-auto">
                <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="lembretes">Lembretes</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
                <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
              </TabsList>
              <TabsContent value="geral">
                <GeneralTab deal={deal} />
              </TabsContent>
              <TabsContent value="historico">
                <HistoryTab dealId={deal.id} />
              </TabsContent>
              <TabsContent value="lembretes">
                <RemindersTab dealId={deal.id} />
              </TabsContent>
              <TabsContent value="anexos">
                <AttachmentsTab dealId={deal.id} />
              </TabsContent>
              <TabsContent value="auditoria">
                <AuditTab dealId={deal.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
