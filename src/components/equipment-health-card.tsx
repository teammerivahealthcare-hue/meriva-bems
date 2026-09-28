"use client";

import { Info } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeFlags, type Equipment } from "@/lib/bems";
import { cn } from "@/lib/utils";

export type EquipmentHealthKey = "operational" | "attention" | "pmApproaching" | "warrantyExpired" | "maintenance";

export interface EquipmentHealthDatum {
  key: EquipmentHealthKey;
  value: number;
}

const HEALTH_LABEL: Record<EquipmentHealthKey, string> = {
  operational: "Operational",
  attention: "Needs attention",
  pmApproaching: "PM approaching",
  warrantyExpired: "Warranty expired",
  maintenance: "Under maintenance",
};

const HEALTH_COLOR_CLASS: Record<EquipmentHealthKey, string> = {
  operational: "bg-green-600",
  attention: "bg-orange-400",
  pmApproaching: "bg-amber-300",
  warrantyExpired: "bg-red-500",
  maintenance: "bg-slate-300",
};

const HEALTH_ORDER = Object.keys(HEALTH_LABEL) as EquipmentHealthKey[];

/**
 * Buckets each unit into exactly one health group so the stacked bar adds up
 * to the headline count. A unit with several issues lands in the first
 * matching group: under maintenance → down (needs attention) → warranty
 * expired → PM approaching → any other flag (needs attention) → operational.
 * Condemned units are left out — they're no longer part of the working fleet.
 */
export function equipmentHealthBreakdown(list: Equipment[]): EquipmentHealthDatum[] {
  const tally: Record<EquipmentHealthKey, number> = {
    operational: 0,
    attention: 0,
    pmApproaching: 0,
    warrantyExpired: 0,
    maintenance: 0,
  };
  for (const eq of list) {
    if (eq.financialStatus === "CONDEMNED") continue;
    if (eq.operationalStatus === "UNDER_MAINTENANCE") {
      tally.maintenance++;
      continue;
    }
    if (eq.operationalStatus === "DOWN") {
      tally.attention++;
      continue;
    }
    const flags = computeFlags(eq);
    if (flags.includes("WARRANTY_EXPIRED")) tally.warrantyExpired++;
    else if (flags.includes("PM_DUE")) tally.pmApproaching++;
    else if (flags.length > 0) tally.attention++;
    else tally.operational++;
  }
  return HEALTH_ORDER.map((key) => ({ key, value: tally[key] }));
}

export function EquipmentHealthCard({ data, className }: { data: EquipmentHealthDatum[]; className?: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-lg">
          Equipment health ({total})
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="About equipment health">
                <Info size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              Each unit is counted once, in its most pressing group. Condemned units are excluded.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex h-3 w-full gap-1.5">
          {total === 0 ? (
            <div className="flex-1 rounded-md bg-muted" />
          ) : (
            data
              .filter((d) => d.value > 0)
              .map((d) => (
                <Tooltip key={d.key}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn("h-full rounded-md", HEALTH_COLOR_CLASS[d.key])}
                      style={{ flexGrow: d.value, flexBasis: 0 }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {HEALTH_LABEL[d.key]} · {d.value} ({Math.round((d.value / total) * 100)}%)
                  </TooltipContent>
                </Tooltip>
              ))
          )}
        </div>

        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2.5">
                <span className={cn("size-3.5 shrink-0 rounded-[4px]", HEALTH_COLOR_CLASS[d.key])} />
                {HEALTH_LABEL[d.key]}
              </span>
              <span className="tabular-nums">
                {d.value} {d.value === 1 ? "unit" : "units"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
