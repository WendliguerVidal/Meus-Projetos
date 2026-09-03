"use client";

import * as React from "react";

type SearchContextValue = { search: string; setSearch: (v: string) => void };

const SearchContext = React.createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = React.useState("");
  const value = React.useMemo(() => ({ search, setSearch }), [search]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useSearch deve ser usado dentro de SearchProvider");
  return ctx;
}
