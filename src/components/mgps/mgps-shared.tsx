"use client";

import { useMemo, type ReactNode } from "react";
import {
  useDemo,
  PIPED_GASES,
  MGPS_SOURCES,
  pipedGas,
  readingState,
  zoneViews,
  mgpsAlarms,
  testState,
  testDue,
  cylinderAlerts,
  overallStatus,
  isReturnOverdue,
  buildMgpsHistory,
  locationLabel,
  equipmentStatusKey,
  equipmentName,
  getRoom,
  type CylinderLocation,
  type CylinderMovementKind,
  type CylinderStatus,
  type Department,
  type MgpsHistoryKind,
  type PipedGasId,
  type ReadingState,
  type TestState,
  type ZoneStatus,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Tones — the same badge palette as equipment status, so MGPS chips
// match the rest of the app.
// ─────────────────────────────────────────────────────────────

export const TONE_BADGE = {
  good: "bg-emerald-50 text-emerald-700 border-transparent",
  warn: "bg-amber-50 text-amber-800 border-transparent",
  bad: "bg-red-50 text-red-700 border-transparent",
  info: "bg-sky-50 text-sky-700 border-transparent",
  blue: "bg-blue-50 text-blue-700 border-transparent",
  neutral: "bg-zinc-100 text-zinc-700 border-transparent",
} as const;

export type Tone = keyof typeof TONE_BADGE;

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-600",
  info: "text-sky-700",
  blue: "text-blue-700",
  neutral: "text-muted-foreground",
};

export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn("shrink-0", TONE_BADGE[tone], className)}>
      {children}
    </Badge>
  );
}

export const READING_TONE: Record<ReadingState, Tone> = { Normal: "good", Low: "bad", High: "bad" };
export const ZONE_STATUS_TONE: Record<ZoneStatus, Tone> = { Normal: "good", "Fault reported": "bad", "Out of range": "bad" };
export const TEST_STATE_TONE: Record<TestState, Tone> = { Overdue: "bad", "Due soon": "warn", "Up to date": "good" };

export const CYLINDER_STATUS_TONE: Record<CylinderStatus, Tone> = {
  Available: "good",
  Allocated: "blue",
  Empty: "warn",
  Refilling: "info",
  Outside: "neutral",
  Damaged: "bad",
};

export const MOVEMENT_TONE: Record<CylinderMovementKind, Tone> = {
  Registered: "neutral",
  Transfer: "blue",
  Refilling: "info",
  "Hydro testing": "warn",
  Repair: "warn",
  Receiving: "good",
  "Marked empty": "neutral",
  "Damage reported": "bad",
};

export const HISTORY_TONE: Record<MgpsHistoryKind, Tone> = {
  Incident: "bad",
  Alarm: "bad",
  Test: "warn",
  Reading: "neutral",
  Cylinder: "blue",
  Changeover: "info",
  Service: "neutral",
};

// Raw hex for chart fills and inline bars, validated as a set for CVD and
// contrast (blue-700 / emerald-600 / amber-600 / rose-700). Neutral gray is
// the "not in service" half of a two-part bar, never a series of its own.
export const PART_COLOR = {
  inUse: "#1d4ed8",
  full: "#059669",
  empty: "#d97706",
  damaged: "#be123c",
  idle: "#a1a1aa",
} as const;

// ─────────────────────────────────────────────────────────────
// Layout bits
// ─────────────────────────────────────────────────────────────

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-0 p-0", className)}>
      {(title || action) && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b bg-gray-50 px-5 py-2.5">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {action}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">{children}</div>
    </Card>
  );
}

export function TextButton({ onClick, children, className }: { onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

/** Plain-language rule message shown in dialogs when an action isn't allowed. */
export function Problem({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

/** "24 Jul 2026" for a YYYY-MM-DD key, read as local midnight. */
export function formatDay(key: string): string {
  return new Date(`${key.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function floorName(floors: { number: number; name: string }[], floor: number): string {
  return floors.find((f) => f.number === floor)?.name ?? `Floor ${floor}`;
}

/** Location keys used by selects: "STOCK" or a department id. */
export function locationFromKey(key: string): CylinderLocation | null {
  if (!key) return null;
  return key === "STOCK" ? { kind: "STOCK" } : { kind: "DEPARTMENT", departmentId: key };
}

// ─────────────────────────────────────────────────────────────
// Everything the page derives from the store, in one place.
// ─────────────────────────────────────────────────────────────

export interface GasSummary {
  gasId: PipedGasId;
  name: string;
  short: string;
  unit: string;
  supplyValue: number;
  supplyState: ReadingState;
  zonesPiped: number;
  zonesOutOfRange: number;
  ok: boolean;
  stateLabel: string;
}

export function useMgps() {
  const tickets = useDemo((s) => s.tickets);
  const readings = useDemo((s) => s.mgpsReadings);
  const readingAlarms = useDemo((s) => s.mgpsReadingAlarms);
  const acknowledgedIds = useDemo((s) => s.mgpsAcknowledgedAlarmIds);
  const tests = useDemo((s) => s.mgpsTests);
  const cylinders = useDemo((s) => s.cylinders);
  const movements = useDemo((s) => s.cylinderMovements);
  const departments = useDemo((s) => s.departments);
  const floors = useDemo((s) => s.floors);
  const equipment = useDemo((s) => s.equipment);
  const calibrationRecords = useDemo((s) => s.calibrationRecords);

  return useMemo(() => {
    const zones = zoneViews(readings, tickets);
    const alarms = mgpsAlarms({ tickets, readingAlarms, acknowledgedIds });
    const activeAlarms = alarms.filter((a) => !a.acknowledged).length;

    const gases: GasSummary[] = PIPED_GASES.map((gas) => {
      const source = MGPS_SOURCES.find((s) => s.gasId === gas.id)!;
      const values = zones.map((z) => z.readings[gas.id]).filter((r) => r != null);
      const zonesOutOfRange = values.filter((r) => readingState(r.value, gas.range) !== "Normal").length;
      const supplyState = readingState(source.supplyValue, gas.range);
      const ok = supplyState === "Normal" && zonesOutOfRange === 0;
      return {
        gasId: gas.id, name: gas.name, short: gas.short, unit: gas.unit,
        supplyValue: source.supplyValue, supplyState, zonesPiped: values.length, zonesOutOfRange, ok,
        stateLabel: supplyState !== "Normal" ? `Supply ${supplyState.toLowerCase()}` : zonesOutOfRange ? `${zonesOutOfRange} zone${zonesOutOfRange === 1 ? "" : "s"} out of range` : "Normal",
      };
    });

    const sources = MGPS_SOURCES.map((source) => {
      const eq = equipment.find((e) => e.id === source.equipmentId);
      const room = eq ? getRoom(eq.roomId) : undefined;
      return {
        source,
        gas: pipedGas(source.gasId),
        equipment: eq,
        name: eq ? equipmentName(eq) : "Equipment record missing",
        location: room?.name ?? "—",
        statusKey: eq ? equipmentStatusKey(eq) : undefined,
      };
    });

    const testRows = tests.map((t) => ({ test: t, due: testDue(t), state: testState(t) }));
    const overdueTests = testRows.filter((t) => t.state === "Overdue").length;
    const overdueReturns = cylinders.filter((c) => isReturnOverdue(c)).length;
    const alerts = cylinderAlerts(cylinders);
    const status = overallStatus({ activeAlarms, overdueTests, overdueReturns });

    const history = buildMgpsHistory({ tickets, calibrationRecords, tests, readings, readingAlarms, movements, departments });
    const label = (loc: CylinderLocation | null) => locationLabel(loc, departments);

    return {
      zones, alarms, activeAlarms, gases, sources, testRows, overdueTests, overdueReturns, alerts, status, history,
      cylinders, movements, departments, floors, calibrationRecords, label,
    };
  }, [tickets, readings, readingAlarms, acknowledgedIds, tests, cylinders, movements, departments, floors, equipment, calibrationRecords]);
}

export type MgpsData = ReturnType<typeof useMgps>;

export function departmentById(departments: Department[], id: string | null | undefined) {
  return id ? departments.find((d) => d.id === id) : undefined;
}
