"use client";

import Link from "next/link";
import { ArrowSquareOut, MapPin } from "@phosphor-icons/react";
import {
  manifoldBanks,
  getVendor,
  EQUIPMENT_STATUS_BADGE_CLASS,
  EQUIPMENT_STATUS_LABEL,
  type GasCylinder,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDay, type MgpsData } from "./mgps-shared";

/**
 * One manifold bank, cylinder by cylinder. Slots past the cylinders on the
 * bank are drawn empty and dashed. Each cylinder opens its record.
 */
function Bank({
  label,
  cylinders,
  slots,
  levelPct,
  onDuty,
  onOpenCylinder,
}: {
  label: string;
  cylinders: GasCylinder[];
  slots: number;
  /** How full each cylinder on this bank is, as a percentage. */
  levelPct: number;
  onDuty?: boolean;
  onOpenCylinder: (id: string) => void;
}) {
  const empties = Math.max(0, slots - cylinders.length);
  return (
    <div className="min-w-0">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {label} · {cylinders.length}
        {onDuty && <Badge variant="outline" className="h-5 border-transparent bg-blue-50 px-2 text-blue-700">On duty</Badge>}
      </p>
      <div className="flex flex-wrap gap-1" role="list" aria-label={`${label}: ${cylinders.length} of ${slots} slots filled`}>
        {cylinders.map((c) => (
          <button
            key={c.id}
            type="button"
            role="listitem"
            onClick={() => onOpenCylinder(c.id)}
            title={`${c.id}: ${levelPct}%`}
            aria-label={`${c.id}, ${levelPct}% full`}
            className="flex h-12 w-4 items-end overflow-hidden rounded bg-border transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className={cn("w-full", levelPct < 30 ? "bg-red-500" : "bg-emerald-600")} style={{ height: `${levelPct}%` }} />
          </button>
        ))}
        {Array.from({ length: empties }, (_, i) => (
          <span key={i} role="listitem" aria-label="Empty slot" className="h-12 w-4 rounded border border-dashed border-muted-foreground/40" />
        ))}
      </div>
    </div>
  );
}

export function SourcesTab({ data, onOpenCylinder }: { data: MgpsData; onOpenCylinder: (id: string) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data.sources.map(({ source, gas, equipment, name, location, statusKey }) => {
        const banks = equipment ? manifoldBanks(source, equipment.departmentId, data.cylinders) : null;
        const facts: [string, string][] = [
          ["Type", source.type],
          ["Changeover", source.changeover],
          ["Duty level", `${source.dutyLevelPct}%`],
          ["Reserve level", `${source.reserveLevelPct}%`],
          ["Last service", formatDay(source.lastServiceAt)],
          ["Service vendor", getVendor(source.serviceVendorId)?.name ?? "—"],
        ];
        return (
          <Card key={source.gasId} className="min-w-0 gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{gas.name}</p>
                <h3 className="mt-0.5 text-base font-semibold">{name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin size={14} className="shrink-0" /> {location}
                </p>
              </div>
              {statusKey && (
                <Badge variant="outline" className={cn("shrink-0", EQUIPMENT_STATUS_BADGE_CLASS[statusKey])}>
                  {EQUIPMENT_STATUS_LABEL[statusKey]}
                </Badge>
              )}
            </div>

            {banks && source.bank ? (
              <div className="space-y-3 rounded-lg bg-muted p-4">
                <div className="flex flex-wrap gap-6">
                  <Bank label="Duty bank" cylinders={banks.duty} slots={source.bank.slotsPerBank} levelPct={source.dutyLevelPct} onDuty onOpenCylinder={onOpenCylinder} />
                  <Bank label="Reserve bank" cylinders={banks.reserve} slots={source.bank.slotsPerBank} levelPct={100} onOpenCylinder={onOpenCylinder} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Drawn from the {source.bank.gas.toLowerCase()} {source.bank.size.split(" (")[0]} cylinders placed in this room
                  {banks.empty.length > 0 && ` · ${banks.empty.length} empty waiting to come off`}.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <p className="text-xs font-medium text-muted-foreground">Duty unit: {source.dutyUnit}</p>
                <Progress value={source.dutyLevelPct} className="h-2 bg-border" indicatorClassName="rounded-full bg-emerald-600" />
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            {equipment && (
              <div className="border-t pt-3">
                <Link href={`/equipment/${equipment.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  View equipment record {equipment.assetId} <ArrowSquareOut size={14} />
                </Link>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
