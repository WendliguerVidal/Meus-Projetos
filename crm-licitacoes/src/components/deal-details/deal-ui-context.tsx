"use client";

import * as React from "react";
import type { DealCategory } from "@/types/deal";

type DealUIState = {
  newDealOpen: boolean;
  newDealDefaultCategory: DealCategory | null;
  openDealId: string | null;
};

type DealUIContextValue = DealUIState & {
  openNewDeal: (defaultCategory?: DealCategory) => void;
  closeNewDeal: () => void;
  openDeal: (id: string) => void;
  closeDeal: () => void;
};

const DealUIContext = React.createContext<DealUIContextValue | null>(null);

export function DealUIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DealUIState>({
    newDealOpen: false,
    newDealDefaultCategory: null,
    openDealId: null,
  });

  const value = React.useMemo<DealUIContextValue>(
    () => ({
      ...state,
      openNewDeal: (defaultCategory) =>
        setState((s) => ({ ...s, newDealOpen: true, newDealDefaultCategory: defaultCategory ?? null })),
      closeNewDeal: () => setState((s) => ({ ...s, newDealOpen: false })),
      openDeal: (id) => setState((s) => ({ ...s, openDealId: id })),
      closeDeal: () => setState((s) => ({ ...s, openDealId: null })),
    }),
    [state]
  );

  return <DealUIContext.Provider value={value}>{children}</DealUIContext.Provider>;
}

export function useDealUI() {
  const ctx = React.useContext(DealUIContext);
  if (!ctx) throw new Error("useDealUI deve ser usado dentro de DealUIProvider");
  return ctx;
}
