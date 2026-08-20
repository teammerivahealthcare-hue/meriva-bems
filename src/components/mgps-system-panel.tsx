"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowsLeftRight, CheckCircle, WarningOctagon, MapPin, Wrench, ArrowSquareOut, QrCode,
} from "@phosphor-icons/react";
import {
  useDemo,
  equipmentName,
  getDepartment,
  getRoom,
  getUser,
  getVendor,
  modelFor,
  contractsFor,
  calibrationsFor,
  ticketsFor,
  formatDate,
  expiryStatus,
  MGPS_EQUIPMENT_ID,
  mgpsRoomStatuses,
  type Ticket,
  type ExpiryStatus,
  type CylinderLogKind,
  type MgpsRoomStatus,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockMovementDialog } from "@/components/stock-movement-dialog";
import { RoomLabelDialog } from "@/components/room-label-dialog";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 5;

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

const EXPIRY_TONE: Record<ExpiryStatus, Tone> = { ACTIVE: "success", EXPIRING: "warning", EXPIRED: "danger" };
const EXPIRY_LABEL: Record<ExpiryStatus, string> = { ACTIVE: "Active", EXPIRING: "Expiring soon", EXPIRED: "Expired" };

function Field({ label, value, hint, empty = "Not recorded" }: { label: string; value?: React.ReactNode; hint?: string; empty?: string }) {
  const isEmpty = value === undefined || value === null || value === "";
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={cn("text-sm", isEmpty ? "text-muted-foreground" : "text-foreground")}>{isEmpty ? empty : value}</div>
      {hint && !isEmpty && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ticketTone(t: Ticket): Tone {
  if (t.status === "CLOSED" || t.status === "RESOLVED") return "success";
  if (t.priority === "CRITICAL" || t.responseOverdue) return "danger";
  return "warning";
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
// Tab panels
// ─────────────────────────────────────────────────────────────

function OverviewTab({ eq }: { eq: NonNullable<ReturnType<typeof useMgpsEquipment>> }) {
  const dept = getDepartment(eq.departmentId);
  const room = getRoom(eq.roomId);
  const responsible = getUser(eq.responsibleUserId);
  const model = modelFor(eq);
  const amcContract = contractsFor(eq.id).find((c) => c.type === "AMC");
  const amcVendor = amcContract ? getVendor(amcContract.vendorId) : undefined;
  const amcExpiry = amcContract ? expiryStatus(amcContract.endDate) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="System" value={model ? `${model.modelName}${model.series ? ` (${model.series})` : ""}` : equipmentName(eq)} hint={eq.assetId} />
          <Field
            label="Location"
            value={dept ? dept.name : undefined}
            hint={room ? `Floor ${room.floor} · ${room.name}` : undefined}
            empty="Unassigned"
          />
          <Field label="Responsible engineer" value={responsible?.name} />
          <Field label="Criticality" value={<Badge variant="outline">{eq.criticality.replace(/_/g, " ")}</Badge>} />
          <Field
            label="AMC vendor"
            value={amcVendor?.name}
            hint={amcContract ? `${amcContract.contractNumber} · response ${amcContract.responseHours}h / resolution ${amcContract.resolutionHours}h` : undefined}
            empty="No AMC on file"
          />
          <Field
            label="AMC expiry"
            value={
              amcContract ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  {formatDate(amcContract.endDate)}
                  <StatusChip tone={EXPIRY_TONE[amcExpiry!.status]} label={EXPIRY_LABEL[amcExpiry!.status]} />
                </span>
              ) : undefined
            }
            empty="No AMC on file"
          />
        </CardContent>
      </Card>
      <Link
        href={`/equipment/${eq.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        View full equipment record <ArrowSquareOut size={14} />
      </Link>
    </div>
  );
}

function CylinderStockTab({ eq }: { eq: NonNullable<ReturnType<typeof useMgpsEquipment>> }) {
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

function TestsTab({ eq }: { eq: NonNullable<ReturnType<typeof useMgpsEquipment>> }) {
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

function IncidentsTab({ eq }: { eq: NonNullable<ReturnType<typeof useMgpsEquipment>> }) {
  const tickets = ticketsFor(eq.id);

  return tickets.length > 0 ? (
    <div className="space-y-3">
      {tickets.map((t) => (
        <Card key={t.id}>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {t.ticketNumber} · {t.issueType}
              </p>
              <StatusChip tone={ticketTone(t)} label={t.status.replace(/_/g, " ")} />
            </div>
            <p className="text-sm text-muted-foreground">
              {t.description}
              <span className="text-xs">
                {" · Opened "}
                {formatDate(t.openedAt)}
                {t.downtimeHours != null && ` · ${t.downtimeHours}h downtime`}
                {t.responseOverdue && " · Response overdue"}
              </span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : (
    <EmptyState icon={WarningOctagon} message="No incidents logged for this system." />
  );
}

// ─────────────────────────────────────────────────────────────
// Room status — every gas-outlet room, shown upfront rather than
// tucked under a tab: what's broken (if anything), who reported it,
// and a QR to print and post in that room.
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

function RoomStatusSection() {
  const statuses = mgpsRoomStatuses();
  const [qrRoom, setQrRoom] = useState<MgpsRoomStatus | null>(null);
  const needsSupport = statuses.filter((s) => s.fault).length;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Room status</h3>
        <p className="text-xs text-muted-foreground">
          {needsSupport > 0
            ? `${needsSupport} of ${statuses.length} rooms need support`
            : `All ${statuses.length} rooms on the gas network are clear`}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map((status) => (
          <RoomStatusCard key={status.roomId} status={status} onPrintQr={() => setQrRoom(status)} />
        ))}
      </div>
      <RoomLabelDialog
        open={qrRoom != null}
        onOpenChange={(open) => !open && setQrRoom(null)}
        roomId={qrRoom?.roomId ?? ""}
        roomName={qrRoom?.roomName ?? ""}
        floorLabel={qrRoom?.roomLabel}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Panel shell
// ─────────────────────────────────────────────────────────────

function useMgpsEquipment() {
  return useDemo((s) => s.equipment.find((e) => e.id === MGPS_EQUIPMENT_ID));
}

export function MgpsSystemPanel() {
  const eq = useMgpsEquipment();
  const dept = eq ? getDepartment(eq.departmentId) : undefined;
  const room = eq ? getRoom(eq.roomId) : undefined;

  if (!eq) {
    return <EmptyState icon={Wrench} message="No MGPS system on file for this facility yet." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{equipmentName(eq)}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin size={14} />
            {dept?.name}
            {room ? ` · ${room.name}` : ""}
          </p>
        </div>
        <Badge variant="outline">{eq.criticality.replace(/_/g, " ")}</Badge>
      </div>

      <RoomStatusSection />

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Cylinder Stock</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-6">
          <OverviewTab eq={eq} />
        </TabsContent>
        <TabsContent value="inventory" className="pt-6">
          <CylinderStockTab eq={eq} />
        </TabsContent>
        <TabsContent value="tests" className="pt-6">
          <TestsTab eq={eq} />
        </TabsContent>
        <TabsContent value="incidents" className="pt-6">
          <IncidentsTab eq={eq} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
