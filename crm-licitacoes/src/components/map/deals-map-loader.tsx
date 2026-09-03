"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const DealsMapLoader = dynamic(() => import("./deals-map").then((m) => m.DealsMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[calc(100vh-9rem)] w-full rounded-lg" />,
});
