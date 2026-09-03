"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  PauseCircle,
  Trophy,
  XCircle,
  ShieldCheck,
  CheckCircle2,
  Archive,
  Map as MapIcon,
  Users,
  ChevronsLeft,
  ChevronsRight,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_LABELS, type DealCategory } from "@/types/deal";

const CATEGORY_ICONS: Record<DealCategory, React.ElementType> = {
  ANDAMENTO: Clock,
  PARALISADA: PauseCircle,
  GANHO: Trophy,
  PERDIDO: XCircle,
  GARANTIA: ShieldCheck,
  CONCLUIDO: CheckCircle2,
  ARQUIVADO: Archive,
};

export function Sidebar({
  collapsed,
  onToggle,
  isAdmin,
}: {
  collapsed: boolean;
  onToggle: () => void;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  const categoryLink = (category: DealCategory) => {
    const params = new URLSearchParams();
    params.set("category", category);
    return `/?${params.toString()}`;
  };

  const isCategoryActive = (category: DealCategory) => pathname === "/" && activeCategory === category;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Gavel className="h-4 w-4" />
        </div>
        {!collapsed && <span className="truncate text-sm font-semibold">CRM Licitações</span>}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        <div>
          {!collapsed && (
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Visão Geral
            </p>
          )}
          <NavItem
            href="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            active={pathname === "/dashboard"}
            collapsed={collapsed}
          />
        </div>

        <div>
          {!collapsed && (
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Categorias
            </p>
          )}
          {(Object.keys(CATEGORY_LABELS) as DealCategory[])
            .filter((c) => c !== "ARQUIVADO")
            .map((category) => (
              <NavItem
                key={category}
                href={categoryLink(category)}
                icon={CATEGORY_ICONS[category]}
                label={CATEGORY_LABELS[category]}
                active={isCategoryActive(category)}
                collapsed={collapsed}
                dotColor={CATEGORY_COLORS[category]}
              />
            ))}
        </div>

        <div>
          {!collapsed && (
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Outros
            </p>
          )}
          <NavItem href="/arquivo" icon={Archive} label="Arquivo" active={pathname === "/arquivo"} collapsed={collapsed} />
          <NavItem href="/mapa" icon={MapIcon} label="Mapa" active={pathname === "/mapa"} collapsed={collapsed} />
          {isAdmin && (
            <NavItem
              href="/admin/usuarios"
              icon={Users}
              label="Usuários"
              active={pathname === "/admin/usuarios"}
              collapsed={collapsed}
            />
          )}
        </div>
      </nav>

      <button
        onClick={onToggle}
        className="flex h-11 items-center justify-center gap-2 border-t border-sidebar-border text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && "Recolher"}
      </button>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  dotColor,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  dotColor?: string;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative mb-0.5 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {dotColor && !collapsed && (
        <span className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      )}
      {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />}
    </Link>
  );
}
