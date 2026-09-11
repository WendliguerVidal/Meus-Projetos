"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AlertTriangle, Bell, LogOut, Plus, Search, Sparkles, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { initials, formatDate, isOverdue } from "@/lib/utils";
import { useTodayReminders } from "@/hooks/use-reminders";
import { useUrgentItems } from "@/hooks/use-notifications";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import { ImportEditalDialog } from "@/components/deal-details/import-edital-dialog";

export function Header({ search, onSearchChange }: { search: string; onSearchChange: (v: string) => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { openNewDeal, openDeal } = useDealUI();
  const { data: reminders } = useTodayReminders();
  const { data: urgentItems } = useUrgentItems();
  const pendingCount = reminders?.length ?? 0;
  const urgentCount = urgentItems?.length ?? 0;
  const totalNotifications = pendingCount + urgentCount;
  const [importOpen, setImportOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const goToUrgentItem = (item: { kind: "deal" | "event" | "document"; dealId: string | null; href: string | null }) => {
    setNotificationsOpen(false);
    if (item.kind === "document") {
      // Documento (certidão, CND, alvará...) — leva direto à pasta que contém o arquivo.
      if (item.href) router.push(item.href);
      return;
    }
    if (item.dealId) {
      openDeal(item.dealId);
    } else {
      // Evento avulso (sem processo vinculado) — só existe no Calendário.
      router.push("/calendario");
    }
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por título, cliente, cidade, série..."
          className="pl-8"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => openNewDeal()} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Processo
        </Button>

        <Button onClick={() => setImportOpen(true)} size="sm" variant="outline" className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          Importar Edital (PDF)
        </Button>
        <ImportEditalDialog open={importOpen} onOpenChange={setImportOpen} />

        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative" aria-label="Central de notificações">
              <Bell className="h-4 w-4" />
              {totalNotifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]"
                >
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="max-h-96 overflow-y-auto">
              <div className="flex items-center gap-1.5 border-b px-4 py-2.5 text-sm font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                Prazos Urgentes
                {urgentCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {urgentCount}
                  </Badge>
                )}
              </div>
              {urgentCount === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-muted-foreground">
                  Nenhum prazo vencido ou vencendo nos próximos 3 dias.
                </p>
              ) : (
                (urgentItems ?? []).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goToUrgentItem(item)}
                    className="flex w-full flex-col gap-1 border-b px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent"
                  >
                    <span className="line-clamp-1 font-medium">{item.title}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <UrgencyBadge date={item.date} level={item.urgencyLevel} dateOnly={item.kind !== "event"} />
                      {item.org && <span className="truncate text-xs text-muted-foreground">{item.org}</span>}
                    </span>
                  </button>
                ))
              )}

              <div className="border-b px-4 py-2.5 text-sm font-semibold">Lembretes de Hoje</div>
              {!reminders || reminders.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum lembrete pendente para hoje.
                </p>
              ) : (
                reminders.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setNotificationsOpen(false);
                      openDeal(r.dealId);
                    }}
                    className="flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent"
                  >
                    <span className="font-medium">{r.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.deal?.title} · {formatDate(r.dueDate)}
                      {isOverdue(r.dueDate) && <span className="ml-1 text-destructive">(atrasado)</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>{session?.user?.name ? initials(session.user.name) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{session?.user?.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{session?.user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="text-destructive">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
