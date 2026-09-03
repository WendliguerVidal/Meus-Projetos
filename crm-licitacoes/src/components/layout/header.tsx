"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Plus, Search, User as UserIcon } from "lucide-react";
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
import { initials, formatDate, isOverdue } from "@/lib/utils";
import { useTodayReminders } from "@/hooks/use-reminders";
import { useDealUI } from "@/components/deal-details/deal-ui-context";

export function Header({ search, onSearchChange }: { search: string; onSearchChange: (v: string) => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { openNewDeal, openDeal } = useDealUI();
  const { data: reminders } = useTodayReminders();
  const pendingCount = reminders?.length ?? 0;

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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {pendingCount > 0 && (
                <Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-2.5 text-sm font-semibold">Lembretes de Hoje</div>
            <div className="max-h-80 overflow-y-auto">
              {!reminders || reminders.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum lembrete pendente para hoje.
                </p>
              ) : (
                reminders.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openDeal(r.dealId)}
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
