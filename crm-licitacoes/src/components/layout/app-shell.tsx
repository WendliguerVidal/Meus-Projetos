"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { DealUIProvider, useDealUI } from "@/components/deal-details/deal-ui-context";
import { NewDealDialog } from "@/components/deal-details/new-deal-dialog";
import { DealDetailsSheet } from "@/components/deal-details/deal-details-sheet";
import { SearchProvider, useSearch } from "@/components/layout/search-context";

function GlobalDealSurfaces() {
  const { newDealOpen, closeNewDeal, newDealDefaultCategory, openDealId, closeDeal } = useDealUI();
  return (
    <>
      <NewDealDialog open={newDealOpen} onOpenChange={(o) => !o && closeNewDeal()} defaultCategory={newDealDefaultCategory} />
      <DealDetailsSheet dealId={openDealId} onOpenChange={(o) => !o && closeDeal()} />
    </>
  );
}

function ShellInner({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const { search, setSearch } = useSearch();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header search={search} onSearchChange={setSearch} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      <GlobalDealSurfaces />
    </div>
  );
}

export function AppShell({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  return (
    <DealUIProvider>
      <SearchProvider>
        <ShellInner isAdmin={isAdmin}>{children}</ShellInner>
      </SearchProvider>
    </DealUIProvider>
  );
}
