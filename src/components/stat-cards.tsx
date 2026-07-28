"use client";

import {
  Stack,
  Pulse,
  Prohibit,
  WarningOctagon,
  Ticket as TicketIcon,
  ShieldWarning,
  Clock,
  ClipboardText,
  ArrowsLeftRight,
  TrashSimple,
  ListChecks,
  UserMinus,
  HourglassHigh,
  ArrowsClockwise,
  CheckCircle,
  Wrench,
  Truck,
  type Icon,
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

export interface StatCardSpec {
  key:
    | "total"
    | "uptime"
    | "down"
    | "condemned"
    | "tickets"
    | "critical"
    | "warrantySoon"
    | "jobAssignments"
    | "movementApprovals"
    | "condemnationApprovals"
    | "totalApprovals"
    | "unassigned"
    | "slaBreach"
    | "inMotion"
    | "atRest"
    | "activeSessions"
    | "inTransit"
    | "internalRepairs"
    | "externalRepairs";
  label: string;
  value: string;
  subtext?: string;
}

const ICON: Record<StatCardSpec["key"], Icon> = {
  total: Stack,
  uptime: Pulse,
  down: Prohibit,
  condemned: WarningOctagon,
  tickets: TicketIcon,
  critical: ShieldWarning,
  warrantySoon: Clock,
  jobAssignments: ClipboardText,
  movementApprovals: ArrowsLeftRight,
  condemnationApprovals: TrashSimple,
  totalApprovals: ListChecks,
  unassigned: UserMinus,
  slaBreach: HourglassHigh,
  inMotion: ArrowsClockwise,
  atRest: CheckCircle,
  activeSessions: Pulse,
  inTransit: ArrowsLeftRight,
  internalRepairs: Wrench,
  externalRepairs: Truck,
};

const ICON_BOX_CLASS: Record<StatCardSpec["key"], string> = {
  total: "bg-muted",
  uptime: "bg-emerald-50",
  down: "bg-red-50",
  condemned: "bg-zinc-100",
  tickets: "bg-amber-50",
  critical: "bg-red-50",
  warrantySoon: "bg-amber-50",
  jobAssignments: "bg-sky-50",
  movementApprovals: "bg-amber-50",
  condemnationApprovals: "bg-zinc-100",
  totalApprovals: "bg-muted",
  unassigned: "bg-red-50",
  slaBreach: "bg-red-50",
  inMotion: "bg-sky-50",
  atRest: "bg-emerald-50",
  activeSessions: "bg-sky-50",
  inTransit: "bg-amber-50",
  internalRepairs: "bg-sky-50",
  externalRepairs: "bg-amber-50",
};

const ICON_CLASS: Record<StatCardSpec["key"], string> = {
  total: "text-foreground",
  uptime: "text-emerald-600",
  down: "text-red-600",
  condemned: "text-zinc-700",
  tickets: "text-amber-600",
  critical: "text-red-600",
  warrantySoon: "text-amber-600",
  jobAssignments: "text-sky-600",
  movementApprovals: "text-amber-600",
  condemnationApprovals: "text-zinc-700",
  totalApprovals: "text-foreground",
  unassigned: "text-red-600",
  slaBreach: "text-red-600",
  inMotion: "text-sky-600",
  atRest: "text-emerald-600",
  activeSessions: "text-sky-600",
  inTransit: "text-amber-600",
  internalRepairs: "text-sky-600",
  externalRepairs: "text-amber-600",
};

const GRID_COLS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export function StatCards({ stats }: { stats: StatCardSpec[] }) {
  const gridClass = GRID_COLS[stats.length] ?? "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridClass} gap-4`}>
      {stats.map((s) => {
        const IconCmp = ICON[s.key];
        return (
          <Card key={s.key}>
            <CardContent className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_BOX_CLASS[s.key]}`}>
                <IconCmp size={20} className={ICON_CLASS[s.key]} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold leading-tight">{s.value}</p>
                {s.subtext && <p className="mt-0.5 text-xs text-muted-foreground">{s.subtext}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
