"use client";

import { useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import type { MgpsHistoryKind } from "@/lib/bems";
import { FilterChips } from "@/components/filter-chips";
import { EmptyState } from "@/components/empty-state";
import { HISTORY_TONE, Pill, SectionCard, formatDateTime, type MgpsData } from "./mgps-shared";

const KIND_ORDER: MgpsHistoryKind[] = ["Incident", "Alarm", "Reading", "Test", "Cylinder", "Changeover", "Service"];

export function HistoryTab({ data }: { data: MgpsData }) {
  const [kind, setKind] = useState<"All" | MgpsHistoryKind>("All");
  const present = KIND_ORDER.filter((k) => data.history.some((h) => h.kind === k));
  const items = data.history.filter((h) => kind === "All" || h.kind === kind);

  return (
    <div className="space-y-4">
      <FilterChips
        label="Filter history"
        options={[
          { value: "All" as const, label: "All", count: data.history.length },
          ...present.map((k) => ({ value: k, label: k, count: data.history.filter((h) => h.kind === k).length })),
        ]}
        value={kind}
        onChange={setKind}
      />
      <SectionCard>
        {items.length > 0 ? (
          <ul className="divide-y">
            {items.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Pill tone={HISTORY_TONE[h.kind]} className="w-24 justify-center">
                  {h.kind}
                </Pill>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(h.at)} · {h.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ClockCounterClockwise} message="Nothing recorded here yet." />
        )}
      </SectionCard>
    </div>
  );
}
