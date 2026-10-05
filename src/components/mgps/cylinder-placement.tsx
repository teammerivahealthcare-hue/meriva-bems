"use client";

import { WarningCircle } from "@phosphor-icons/react";
import {
  placement,
  CYLINDER_GASES,
  MIN_READY_STOCK,
  readyInStock,
  type CylinderFilter,
  type CylinderGroup,
  type CylinderReason,
  type GasCylinder,
} from "@/lib/bems";
import { cn } from "@/lib/utils";
import { PART_COLOR } from "./mgps-shared";

const GROUPS: { name: CylinderGroup; hint: string; color: string }[] = [
  { name: "In service", hint: "Out in departments: on patients, on the manifold or standing by", color: PART_COLOR.inUse },
  { name: "Not in service", hint: "Held in central stock or away at a vendor, with the reason", color: PART_COLOR.idle },
];

/**
 * Two-part bar plus the reason counts for each group. Every cylinder sits
 * in exactly one line. With `onPick`, every line filters the register.
 */
export function PlacementSplit({
  cylinders,
  filter,
  onPick,
}: {
  cylinders: GasCylinder[];
  filter?: CylinderFilter;
  onPick?: (f: Partial<CylinderFilter>) => void;
}) {
  const p = placement(cylinders);
  const totals: Record<CylinderGroup, number> = { "In service": p.serviceTotal, "Not in service": p.idleTotal };
  const rows: Record<CylinderGroup, readonly (readonly [CylinderReason, number])[]> = { "In service": p.service, "Not in service": p.idle };
  const all = cylinders.length || 1;

  return (
    <div className="space-y-3">
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${p.serviceTotal} in service, ${p.idleTotal} not in service`}
      >
        {GROUPS.map((g) =>
          totals[g.name] > 0 ? (
            <div key={g.name} style={{ width: `${(totals[g.name] / all) * 100}%`, background: g.color }} />
          ) : null
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {GROUPS.map((g) => {
          const groupActive = filter?.group === g.name && !filter?.reason;
          return (
            <div key={g.name} className="rounded-lg bg-muted p-3">
              <button
                type="button"
                disabled={!onPick}
                onClick={() => onPick?.({ group: g.name, reason: "" })}
                aria-pressed={onPick ? groupActive : undefined}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-md p-1 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  onPick && "hover:bg-surface/60",
                  groupActive && "bg-surface"
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
                    {g.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{g.hint}</span>
                </span>
                <span className="text-2xl font-semibold tabular-nums">{totals[g.name]}</span>
              </button>
              <ul className="mt-2 divide-y overflow-hidden rounded-md border bg-surface">
                {rows[g.name].map(([reason, count]) => {
                  const active = filter?.reason === reason;
                  return (
                    <li key={reason}>
                      <button
                        type="button"
                        disabled={!onPick}
                        onClick={() => onPick?.({ group: g.name, reason })}
                        aria-pressed={onPick ? active : undefined}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
                          active ? "bg-primary text-primary-foreground" : onPick && "hover:bg-gray-50"
                        )}
                      >
                        <span>{reason}</span>
                        <span className="font-medium tabular-nums">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {p.overdue > 0 && (
        <p className="flex items-center gap-2 text-sm font-medium text-red-600">
          <WarningCircle size={16} />
          {p.overdue} cylinder{p.overdue === 1 ? " is" : "s are"} overdue to return from a vendor
        </p>
      )}
    </div>
  );
}

/** Ready-in-stock against the minimum, per gas. Each chip filters the register to that gas in central stock. */
export function MinimumStockChips({ cylinders, onPick }: { cylinders: GasCylinder[]; onPick: (f: Partial<CylinderFilter>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Ready in central stock against minimum:</span>
      {CYLINDER_GASES.map((gas) => {
        const ready = readyInStock(cylinders, gas);
        const low = ready < MIN_READY_STOCK[gas];
        return (
          <button
            key={gas}
            type="button"
            onClick={() => onPick({ gas, location: "STOCK" })}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              low ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            )}
          >
            {gas} {ready} / {MIN_READY_STOCK[gas]}
            {low && " · below minimum"}
          </button>
        );
      })}
    </div>
  );
}
