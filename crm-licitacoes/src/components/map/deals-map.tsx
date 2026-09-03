"use client";

import * as React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { coordsFor } from "@/lib/geocode";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/deal";
import { useDealUI } from "@/components/deal-details/deal-ui-context";
import type { DealWithRelations, DealCategory } from "@/types";

type CityGroup = {
  key: string;
  city: string;
  state: string;
  coords: [number, number];
  deals: DealWithRelations[];
};

function groupByCity(deals: DealWithRelations[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const deal of deals) {
    const key = `${deal.city.toLowerCase()}|${deal.state}`;
    let group = map.get(key);
    if (!group) {
      group = { key, city: deal.city, state: deal.state, coords: coordsFor(deal.city, deal.state), deals: [] };
      map.set(key, group);
    }
    group.deals.push(deal);
  }
  return Array.from(map.values());
}

function dominantCategory(deals: DealWithRelations[]): DealCategory {
  const counts: Partial<Record<DealCategory, number>> = {};
  for (const d of deals) counts[d.category] = (counts[d.category] ?? 0) + 1;
  const sorted = (Object.entries(counts) as [DealCategory, number][]).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "ANDAMENTO";
}

export function DealsMap({ deals }: { deals: DealWithRelations[] }) {
  const { openDeal } = useDealUI();
  const groups = React.useMemo(() => groupByCity(deals), [deals]);

  return (
    <div className="h-[calc(100vh-9rem)] w-full overflow-hidden rounded-lg border">
      <MapContainer center={[-14.235, -51.9253]} zoom={4} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {groups.map((group) => {
          const category = dominantCategory(group.deals);
          const color = CATEGORY_COLORS[category];
          return (
            <CircleMarker
              key={group.key}
              center={group.coords}
              radius={8 + Math.min(group.deals.length, 10)}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
            >
              <Popup maxWidth={280}>
                <div className="space-y-1.5">
                  <p className="font-semibold">
                    {group.city}/{group.state}{" "}
                    <span className="font-normal text-muted-foreground">({group.deals.length} processo{group.deals.length > 1 ? "s" : ""})</span>
                  </p>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {group.deals.map((d) => (
                      <li key={d.id}>
                        <button
                          onClick={() => openDeal(d.id)}
                          className="flex w-full items-center gap-1.5 text-left hover:underline"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[d.category] }}
                          />
                          <span className="truncate">
                            {d.client} — {CATEGORY_LABELS[d.category]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
