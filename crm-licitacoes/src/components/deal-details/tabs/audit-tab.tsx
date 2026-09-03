"use client";

import { useAuditLogs } from "@/hooks/use-deal-details";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { History } from "lucide-react";

export function AuditTab({ dealId }: { dealId: string }) {
  const { data: logs, isLoading } = useAuditLogs(dealId);

  return (
    <div className="space-y-3">
      {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}

      {!isLoading && logs?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro de auditoria.</p>
      )}

      <ol className="space-y-0">
        {logs?.map((log, idx) => (
          <li key={log.id} className="relative flex gap-3 pb-4 pl-1">
            {idx !== logs.length - 1 && (
              <span className="absolute left-[13px] top-6 h-full w-px bg-border" aria-hidden />
            )}
            <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <History className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Avatar className="mr-1 inline-flex h-4 w-4 align-middle">
                  <AvatarFallback className="text-[8px]">{initials(log.user.name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{log.user.name}</span> — {log.action}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
