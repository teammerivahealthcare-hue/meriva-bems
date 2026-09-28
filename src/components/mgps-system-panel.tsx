"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowsLeftRight, CheckCircle, WarningOctagon, Wrench, ArrowSquareOut, QrCode, SquaresFour,
  Cylinder, ClipboardText, ClockCounterClockwise, ShieldCheck, Truck, CalendarBlank, User,
  type Icon,
} from "@phosphor-icons/react";
import {
  useDemo,
  equipmentName,
  getRoom,
  getUser,
  getVendor,
  calibrationsFor,
  ticketsFor,
  formatDate,
  equipmentStatusKey,
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_BADGE_CLASS,
  MGPS_EQUIPMENT_ID,
  MGPS_TELEMETRY,
  MGPS_GAUGE_MAX_BAR,
  mgpsRoomStatuses,
  mgpsZoneStatuses,
  type Equipment,
  type Ticket,
  type CylinderLogKind,
  type CylinderLogEntry,
  type MgpsRoomStatus,
  type MgpsZoneState,
  type MgpsZoneStatus,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockMovementDialog } from "@/components/stock-movement-dialog";
import { RoomLabelDialog } from "@/components/room-label-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 5;
const RECENT_ACTIVITY_LIMIT = 3;

// ─────────────────────────────────────────────────────────────
// Small shared primitives — deliberately duplicated from the equipment
// detail page's page-local versions (not exported there) rather than
// threading a shared-component refactor through an already-working file.
// ─────────────────────────────────────────────────────────────

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  neutral: "bg-neutral/10 text-neutral border-neutral/30",
};

function StatusChip({ tone, label }: { tone: Tone; label: string }) {
  return (
    <Badge variant="outline" className={TONE_CLASS[tone]}>
      {label}
    </Badge>
  );
}

/** Borderless capsule — reuses the equipment status badge palette so MGPS chips match the rest of the app. */
function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("h-6 px-3", className)}>
      {children}
    </Badge>
  );
}

const CHANGE_CHIP_CLASS = "h-5 bg-blue-50 px-2 text-blue-900 border-transparent";

function formatChange(value: number, unit: string): string {
  return `${value > 0 ? "+" : ""}${value}${unit} in last 24 hours`;
}

// ─────────────────────────────────────────────────────────────
// Log cylinder event dialog
// ─────────────────────────────────────────────────────────────

function LogCylinderDialog({
  open,
  onOpenChange,
  initialKind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKind: CylinderLogKind;
}) {
  const logCylinderEvent = useDemo((s) => s.logCylinderEvent);

  return (
    <StockMovementDialog
      open={open}
      onOpenChange={onOpenChange}
      initialKind={initialKind}
      title="Log cylinder movement"
      description="Record cylinders coming in or going out of stock."
      restockLabel="Restock — cylinders received"
      consumedLabel="Consumed — cylinders used/swapped in"
      onSubmit={({ kind, quantity, note }) => logCylinderEvent({ equipmentId: MGPS_EQUIPMENT_ID, kind, quantity, note })}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Activity — tickets, compliance tests, and cylinder movements merged
// into one timeline. Overview shows the latest few; History shows all.
// ─────────────────────────────────────────────────────────────

type ActivityKind = "incident" | "test" | "maintenance" | "delivery";

const ACTIVITY_KIND: Record<ActivityKind, { label: string; icon: Icon; wellClass: string; chipClass: string }> = {
  incident: { label: "Incident", icon: WarningOctagon, wellClass: "bg-red-50 text-red-600", chipClass: EQUIPMENT_STATUS_BADGE_CLASS.down },
  test: { label: "Test", icon: ShieldCheck, wellClass: "bg-teal-50 text-teal-700", chipClass: "bg-teal-50 text-teal-700 border-transparent" },
  maintenance: { label: "Maintenance", icon: Wrench, wellClass: "bg-sky-50 text-sky-700", chipClass: EQUIPMENT_STATUS_BADGE_CLASS.maintenance },
  delivery: { label: "Delivery", icon: Truck, wellClass: "bg-zinc-100 text-zinc-700", chipClass: EQUIPMENT_STATUS_BADGE_CLASS.condemned },
};

interface MgpsActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  occurredAt: string;
  actor: string;
  statusLabel: string;
  statusClass: string;
}

function ticketStatusClass(t: Ticket): string {
  if (t.status === "CLOSED" || t.status === "RESOLVED") return EQUIPMENT_STATUS_BADGE_CLASS.operational;
  if (t.priority === "CRITICAL" || t.responseOverdue) return EQUIPMENT_STATUS_BADGE_CLASS.down;
  return EQUIPMENT_STATUS_BADGE_CLASS.attention;
}

function titleCase(value: string): string {
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildActivity(eqId: string, cylinderLog: CylinderLogEntry[]): MgpsActivity[] {
  const tickets: MgpsActivity[] = ticketsFor(eqId).map((t) => ({
    id: t.id,
    kind: "incident",
    title: t.issueType,
    description: t.description,
    occurredAt: t.openedAt,
    actor: `${t.ticketNumber} · ${getUser(t.raisedByUserId)?.name ?? "Unknown"}`,
    statusLabel: titleCase(t.status),
    statusClass: ticketStatusClass(t),
  }));

  const tests: MgpsActivity[] = calibrationsFor(eqId).map((c) => ({
    id: c.id,
    kind: "test",
    title: `Compliance test · ${c.certificateNumber}`,
    description: c.accuracyNotes,
    occurredAt: c.performedAt,
    actor: (c.performedByUserId ? getUser(c.performedByUserId)?.name : getVendor(c.performedByVendorId)?.name) ?? "Unknown",
    statusLabel: c.passed ? "Passed" : "Failed",
    statusClass: c.passed ? EQUIPMENT_STATUS_BADGE_CLASS.operational : EQUIPMENT_STATUS_BADGE_CLASS.down,
  }));

  const cylinders: MgpsActivity[] = cylinderLog
    .filter((e) => e.equipmentId === eqId)
    .map((e) => ({
      id: e.id,
      kind: e.kind === "RESTOCK" ? "delivery" : "maintenance",
      title: e.kind === "RESTOCK" ? "Cylinder delivery received" : "Duty bank cylinder rotation",
      description: `${e.quantity} cylinder${e.quantity === 1 ? "" : "s"} ${e.kind === "RESTOCK" ? "added to stock" : "swapped in"}${e.note ? ` — ${e.note}` : "."}`,
      occurredAt: e.loggedAt,
      actor: getUser(e.performedByUserId)?.name ?? "Unknown",
      statusLabel: "Completed",
      statusClass: EQUIPMENT_STATUS_BADGE_CLASS.operational,
    }));

  return [...tickets, ...tests, ...cylinders].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function ActivityList({ items }: { items: MgpsActivity[] }) {
  if (items.length === 0) {
    return <EmptyState icon={ClockCounterClockwise} message="No activity logged for this system yet." />;
  }

  return (
    <ul className="divide-y">
      {items.map((item) => {
        const kind = ACTIVITY_KIND[item.kind];
        const KindIcon = kind.icon;
        return (
          <li key={item.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", kind.wellClass)}>
              <KindIcon size={16} />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{item.title}</p>
                <Badge variant="outline" className={kind.chipClass}>
                  {kind.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarBlank size={12} /> {formatDate(item.occurredAt)}
                </span>
                <span className="flex items-center gap-1">
                  <User size={12} /> {item.actor}
                </span>
              </p>
            </div>
            <Badge variant="outline" className={cn("shrink-0", item.statusClass)}>
              {item.statusLabel}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

// Cylinder deliveries sit under Maintenance — they're part of keeping the
// banks supplied, and not worth a filter of their own.
const HISTORY_FILTERS: { value: string; label: string; kinds: ActivityKind[] }[] = [
  { value: "all", label: "All", kinds: ["incident", "test", "maintenance", "delivery"] },
  { value: "tests", label: "Tests", kinds: ["test"] },
  { value: "incidents", label: "Incidents", kinds: ["incident"] },
  { value: "maintenance", label: "Maintenance", kinds: ["maintenance", "delivery"] },
];

function HistoryTab({ activity }: { activity: MgpsActivity[] }) {
  const [filter, setFilter] = useState("all");
  const kinds = HISTORY_FILTERS.find((f) => f.value === filter)!.kinds;
  const items = activity.filter((a) => kinds.includes(a.kind));

  return (
    <div className="space-y-4">
      <FilterChips
        label="Filter history"
        options={HISTORY_FILTERS}
        value={filter}
        onChange={setFilter}
        activeClassName="border-teal-600 bg-teal-50 text-teal-700"
      />
      <Card className="px-5 py-4">
        <ActivityList items={items} />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Overview — headline readings, per-zone pressure, recent activity.
// ─────────────────────────────────────────────────────────────

function StatCard({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <Card className="gap-1.5 px-5 py-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-2xl font-medium">{value}</p>
        {change && (
          <Badge variant="outline" className={CHANGE_CHIP_CLASS}>
            {change}
          </Badge>
        )}
      </div>
    </Card>
  );
}

const ZONE_STATE: Record<MgpsZoneState, { label: string; textClass: string; barClass: string }> = {
  NORMAL: { label: "Normal", textClass: "text-green-600", barClass: "bg-green-700" },
  LOW: { label: "Low pressure", textClass: "text-amber-600", barClass: "bg-amber-500" },
  HIGH: { label: "High pressure", textClass: "text-amber-600", barClass: "bg-amber-500" },
  FAULT: { label: "Fault reported", textClass: "text-red-600", barClass: "bg-red-500" },
};

function ZoneTile({ zone, onOpen }: { zone: MgpsZoneStatus; onOpen: () => void }) {
  const state = ZONE_STATE[zone.state];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-lg bg-muted p-5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label={`${zone.name}: ${state.label}, ${zone.pressureBar} bar. View rooms`}
    >
      <p className="flex flex-wrap items-center gap-2.5 text-sm font-medium">
        {zone.name}
        <span className={state.textClass}>{state.label}</span>
      </p>
      <p className="text-2xl font-medium">{zone.pressureBar} bar</p>
      <Progress
        value={Math.min(100, (zone.pressureBar / MGPS_GAUGE_MAX_BAR) * 100)}
        className="h-3 bg-border"
        indicatorClassName={cn("rounded-full", state.barClass)}
      />
    </button>
  );
}

/** Rooms behind one zone tile — each room's open fault (if any) plus its printable QR. */
function ZoneRoomsDialog({ zone, onOpenChange }: { zone: MgpsZoneStatus | null; onOpenChange: (open: boolean) => void }) {
  const [qrRoom, setQrRoom] = useState<MgpsRoomStatus | null>(null);

  return (
    <>
      <Dialog open={zone != null} onOpenChange={onOpenChange}>
        <DialogContent>
          {zone && (
            <>
              <DialogHeader>
                <DialogTitle>{zone.name}</DialogTitle>
                <DialogDescription>
                  {zone.pressureBar} bar · {zone.rooms.filter((r) => r.fault).length} of {zone.rooms.length} rooms need support
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {zone.rooms.map((status) => (
                  <RoomStatusCard key={status.roomId} status={status} onPrintQr={() => setQrRoom(status)} />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <RoomLabelDialog
        open={qrRoom != null}
        onOpenChange={(open) => !open && setQrRoom(null)}
        roomId={qrRoom?.roomId ?? ""}
        roomName={qrRoom?.roomName ?? ""}
        floorLabel={qrRoom?.roomLabel}
      />
    </>
  );
}

function OverviewTab({ activity, onViewAll }: { activity: MgpsActivity[]; onViewAll: () => void }) {
  const zones = mgpsZoneStatuses();
  const activeAlarms = mgpsRoomStatuses().filter((r) => r.fault).length;
  const [openZone, setOpenZone] = useState<MgpsZoneStatus | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Manifold pressure"
          value={`${MGPS_TELEMETRY.manifoldPressureBar} bar`}
          change={formatChange(MGPS_TELEMETRY.manifoldPressureChange24h, " bar")}
        />
        <StatCard
          label="Duty bank level"
          value={`${MGPS_TELEMETRY.dutyBankLevelPct}%`}
          change={formatChange(MGPS_TELEMETRY.dutyBankLevelChange24h, "%")}
        />
        <StatCard label="Active alarms" value={String(activeAlarms)} />
      </div>

      <Card className="gap-4 p-5">
        <p className="text-sm font-medium">Department pressure</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {zones.map((zone) => (
            <ZoneTile key={zone.id} zone={zone} onOpen={() => setOpenZone(zone)} />
          ))}
        </div>
      </Card>

      <Card className="gap-4 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Recent activity</p>
          {activity.length > RECENT_ACTIVITY_LIMIT && (
            <button type="button" onClick={onViewAll} className="text-sm font-medium text-primary hover:underline">
              View all
            </button>
          )}
        </div>
        <ActivityList items={activity.slice(0, RECENT_ACTIVITY_LIMIT)} />
      </Card>

      <ZoneRoomsDialog zone={openZone} onOpenChange={(open) => !open && setOpenZone(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Other tab panels
// ─────────────────────────────────────────────────────────────

function CylinderStockTab({ eq }: { eq: Equipment }) {
  const cylinderLog = useDemo((s) => s.cylinderLog);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState<CylinderLogKind>("RESTOCK");

  const entries = cylinderLog
    .filter((c) => c.equipmentId === eq.id)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const stock = entries.reduce((sum, e) => sum + (e.kind === "RESTOCK" ? e.quantity : -e.quantity), 0);
  const lowStock = stock < LOW_STOCK_THRESHOLD;

  function openDialog(kind: CylinderLogKind) {
    setDialogKind(kind);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Cylinders available</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-3xl font-semibold">{stock}</p>
              {lowStock && <StatusChip tone="danger" label="Low stock" />}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openDialog("RESTOCK")}>
              Log restock
            </Button>
            <Button variant="outline" size="sm" onClick={() => openDialog("CONSUMED")}>
              Log consumption
            </Button>
          </div>
        </CardContent>
      </Card>

      {entries.length > 0 ? (
        <Card className="overflow-hidden p-0 gap-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Logged by</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{formatDate(e.loggedAt)}</TableCell>
                    <TableCell>
                      <StatusChip tone={e.kind === "RESTOCK" ? "success" : "neutral"} label={e.kind === "RESTOCK" ? "Restock" : "Consumed"} />
                    </TableCell>
                    <TableCell>{e.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{getUser(e.performedByUserId)?.name ?? "Unknown"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={ArrowsLeftRight} message="No cylinder movements logged yet." />
      )}

      <LogCylinderDialog open={dialogOpen} onOpenChange={setDialogOpen} initialKind={dialogKind} />
    </div>
  );
}

function TestsTab({ eq }: { eq: Equipment }) {
  const records = calibrationsFor(eq.id);

  return records.length > 0 ? (
    <Card className="overflow-hidden p-0 gap-0">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Next due</TableHead>
              <TableHead>Performed by</TableHead>
              <TableHead>Certificate #</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground">{formatDate(c.performedAt)}</TableCell>
                <TableCell>
                  <StatusChip tone={c.passed ? "success" : "danger"} label={c.passed ? "Pass" : "Fail"} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(c.validUntil)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.performedByUserId ? getUser(c.performedByUserId)?.name : getVendor(c.performedByVendorId)?.name ?? "Unknown"}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.certificateNumber}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  ) : (
    <EmptyState icon={CheckCircle} message="No test history for this system yet." />
  );
}

// ─────────────────────────────────────────────────────────────
// Room status card — one gas-outlet room: what's broken (if anything),
// who reported it, and a QR to print and post in that room. Shown in
// the zone dialog behind each Department pressure tile.
// ─────────────────────────────────────────────────────────────

function RoomStatusCard({ status, onPrintQr }: { status: MgpsRoomStatus; onPrintQr: () => void }) {
  const fault = status.fault;
  return (
    <Card className="gap-0 p-0">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{status.roomName}</p>
            <p className="truncate text-xs text-muted-foreground">{status.roomLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onPrintQr}
            title={`Print QR for ${status.roomName}`}
            aria-label={`Print QR for ${status.roomName}`}
          >
            <QrCode size={16} />
          </Button>
        </div>
        {fault ? (
          <div
            className={cn(
              "space-y-1 rounded-lg border p-2",
              TONE_CLASS[fault.priority === "CRITICAL" || fault.responseOverdue ? "danger" : "warning"]
            )}
          >
            <p className="text-xs font-semibold">{fault.issueType}</p>
            <p className="text-xs text-muted-foreground">{fault.description}</p>
            <p className="text-[11px] text-muted-foreground">
              Reported by {fault.reportedByName} · {formatDate(fault.reportedAt)}
            </p>
          </div>
        ) : (
          <StatusChip tone="success" label="OK — no open issues" />
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Panel shell
// ─────────────────────────────────────────────────────────────

export function MgpsSystemPanel() {
  const eq = useDemo((s) => s.equipment.find((e) => e.id === MGPS_EQUIPMENT_ID));
  const cylinderLog = useDemo((s) => s.cylinderLog);
  const [tab, setTab] = useState("overview");

  if (!eq) {
    return <EmptyState icon={Wrench} message="No MGPS system on file for this facility yet." />;
  }

  const room = getRoom(eq.roomId);
  const statusKey = equipmentStatusKey(eq);
  const activity = buildActivity(eq.id, cylinderLog);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-medium">{equipmentName(eq)}</h2>
            <Chip className={EQUIPMENT_STATUS_BADGE_CLASS[statusKey]}>{EQUIPMENT_STATUS_LABEL[statusKey]}</Chip>
          </div>
          {room && <p className="text-base text-muted-foreground">{room.name}</p>}
        </div>
        <Link
          href={`/equipment/${eq.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View full record <ArrowSquareOut size={14} />
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="gap-2 group-data-horizontal/tabs:h-10">
          <TabsTrigger value="overview" className="gap-1.5 px-3">
            <SquaresFour size={14} /> Overview
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 px-3">
            <Cylinder size={14} /> Cylinder Stock
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-1.5 px-3">
            <ClipboardText size={14} /> Tests
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 px-3">
            <ClockCounterClockwise size={14} /> History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <OverviewTab activity={activity} onViewAll={() => setTab("history")} />
        </TabsContent>
        <TabsContent value="inventory" className="pt-4">
          <CylinderStockTab eq={eq} />
        </TabsContent>
        <TabsContent value="tests" className="pt-4">
          <TestsTab eq={eq} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab activity={activity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
