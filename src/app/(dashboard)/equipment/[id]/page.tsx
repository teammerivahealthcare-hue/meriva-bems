"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  TrashSimple,
  WarningOctagon,
  WarningCircle,
  Info,
  Certificate,
  FileText,
  ShieldCheck,
  ClipboardText,
  Package,
  Timer,
  MapPin,
  Gauge,
  UserCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  equipmentName,
  categoryName,
  categoryFor,
  getDepartment,
  getRoom,
  getUser,
  getVendor,
  getManufacturer,
  modelFor,
  computeFlags,
  evaluateGate,
  equipmentStatusKey,
  lifecycleProgress,
  totalCostOfOwnership,
  operatingHoursSummary,
  usageConfidencePct,
  ageYears,
  shelfAgeMonths,
  AGED_STOCK_THRESHOLD_MONTHS,
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_BADGE_CLASS,
  CRITICALITY_LABEL,
  CRITICALITY_BADGE_CLASS,
  FLAG_LABEL,
  ALERT_FLAG_SEVERITY_ORDER,
  formatDate,
  formatDuration,
  formatINR,
  daysUntil,
  now,
  contractsFor,
  pmScheduleFor,
  calibrationsFor,
  ticketsFor,
  workOrdersFor,
  sessionsFor,
  accessoriesFor,
  authorisationFor,
  certificationDocuments,
  expiryStatus,
  lastServicedAt,
  useDemo,
  type Equipment,
  type EquipmentFlag,
  type EquipmentStatusKey,
  type Contract,
  type ContractType,
  type Ticket,
  type CalibrationRecord,
  type PmSchedule,
  type ActivityEvent,
  type ActivityEventType,
  type ExpiryStatus,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CertificationsDialog } from "@/components/certifications-dialog";
import { EquipmentLabelDialog } from "@/components/equipment-label-dialog";
import { Breadcrumb } from "@/components/breadcrumb";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Shared vocabulary — one tone system driving every chip on this
// page (status, alerts, contract/certification expiry).
// ─────────────────────────────────────────────────────────────

type Tone = "success" | "warning" | "accent" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  accent: "bg-status-accent/10 text-status-accent border-status-accent/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  neutral: "bg-neutral/10 text-neutral border-neutral/30",
};

const TIER_ICON: Record<Tone, Icon> = {
  success: ShieldCheck,
  warning: WarningCircle,
  accent: Info,
  danger: WarningOctagon,
  neutral: Info,
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

type TabValue = "overview" | "maintenance" | "breakdowns" | "accessories" | "contracts" | "sessions" | "activity";

const ALERT_FLAG_TIER: Record<EquipmentFlag, Tone> = {
  SLA_BREACHED: "danger",
  CALIBRATION_EXPIRED: "danger",
  WARRANTY_EXPIRED: "danger",
  CONTINUED_USE_REVIEW_OVERDUE: "warning",
  PM_OVERDUE: "warning",
  PM_DUE: "accent",
  CALIBRATION_EXPIRING: "accent",
  WARRANTY_EXPIRING: "accent",
  AMC_EXPIRING: "accent",
  AGED_STOCK_AT_PURCHASE: "neutral",
};

const ALERT_FLAG_TAB: Record<EquipmentFlag, TabValue> = {
  PM_DUE: "maintenance",
  PM_OVERDUE: "maintenance",
  CALIBRATION_EXPIRING: "maintenance",
  CALIBRATION_EXPIRED: "maintenance",
  WARRANTY_EXPIRING: "contracts",
  WARRANTY_EXPIRED: "contracts",
  AMC_EXPIRING: "contracts",
  SLA_BREACHED: "breakdowns",
  CONTINUED_USE_REVIEW_OVERDUE: "overview",
  AGED_STOCK_AT_PURCHASE: "overview",
};

const GATE_TONE: Record<string, Tone> = { GREEN: "success", AMBER: "warning", RED: "danger" };

// ─────────────────────────────────────────────────────────────
// Small shared primitives
// ─────────────────────────────────────────────────────────────

/** Label above value, always — the one row shape every card on this page uses. */
function Field({
  label,
  value,
  hint,
  empty = "Not recorded",
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  empty?: string;
}) {
  const isEmpty = value === undefined || value === null || value === "";
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={cn("text-sm", isEmpty ? "text-muted-foreground" : "text-foreground")}>
        {isEmpty ? empty : value}
      </div>
      {hint && !isEmpty && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SidebarGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ icon: IconCmp, message, actionLabel }: { icon: Icon; message: string; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
      <IconCmp size={22} className="text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {actionLabel && (
        <Button variant="outline" size="sm" disabled>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function activityTypeLabel(type: string): string {
  const lower = type.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function activityIcon(type: ActivityEventType): Icon {
  if (type.startsWith("SESSION") || type === "GATE_ACKNOWLEDGED") return Timer;
  if (type.startsWith("TICKET") || type === "BREAKDOWN_FLAGGED") return Wrench;
  if (type.startsWith("WORK_ORDER") || type === "PM_PERFORMED") return ClipboardText;
  if (type.startsWith("CALIBRATION")) return Certificate;
  if (type === "CERTIFICATE_UPLOADED" || type === "DOCUMENT_ADDED" || type.startsWith("CONTRACT") || type === "SERVICE_REPORT_SIGNED") return FileText;
  if (type.startsWith("CONDEMNATION")) return TrashSimple;
  if (type.startsWith("WARRANTY_OVERRIDE") || type.startsWith("CONTINUED_USE")) return ShieldCheck;
  if (type.startsWith("MOVE")) return MapPin;
  if (type.startsWith("ACCESSORY")) return Package;
  if (type === "STATUS_CHANGED") return WarningCircle;
  if (type === "RESPONSIBLE_STAFF_CHANGED" || type === "ENGINEER_INVITED") return UserCircle;
  if (type === "HOUR_METER_READ") return Gauge;
  return Info;
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────

function EquipmentHeader({ eq }: { eq: Equipment }) {
  const statusKey = equipmentStatusKey(eq);
  const warrantyContract = contractsFor(eq.id).find((c) => c.type === "WARRANTY");
  const flags = computeFlags(eq);
  const hasOpenTicket = ticketsFor(eq.id).some((t) => t.status !== "CLOSED" && t.status !== "RESOLVED");
  const serviceRequired = hasOpenTicket || eq.operationalStatus === "DOWN" || flags.includes("PM_OVERDUE");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{equipmentName(eq)}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {categoryName(eq)} · {eq.assetId} · S/N {eq.serialNumber}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge variant="outline" className={EQUIPMENT_STATUS_BADGE_CLASS[statusKey]}>
          {EQUIPMENT_STATUS_LABEL[statusKey]}
        </Badge>
        <EquipmentLabelDialog
          assetId={eq.assetId}
          name={equipmentName(eq)}
          category={categoryName(eq)}
          serialNumber={eq.serialNumber}
          purchaseDate={formatDate(eq.dateOfPurchase)}
          warrantyExpiry={warrantyContract ? formatDate(warrantyContract.endDate) : undefined}
        />
        {serviceRequired && (
          <Button size="sm" className="h-9 gap-1.5">
            <Wrench size={14} /> Assign service
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status banner — loudest thing on the page when not operational
// ─────────────────────────────────────────────────────────────

const STATUS_BANNER_ICON: Record<Exclude<EquipmentStatusKey, "operational">, Icon> = {
  down: WarningOctagon,
  attention: WarningCircle,
  maintenance: Wrench,
  condemned: TrashSimple,
};

const STATUS_BANNER_TONE: Record<Exclude<EquipmentStatusKey, "operational">, Tone> = {
  down: "danger",
  attention: "warning",
  maintenance: "accent",
  condemned: "neutral",
};

function StatusBanner({ eq, onViewTab }: { eq: Equipment; onViewTab: (tab: TabValue) => void }) {
  const statusKey = equipmentStatusKey(eq);
  if (statusKey === "operational") return null;

  const gate = evaluateGate(eq);
  const flags = computeFlags(eq);
  const activeWorkOrder = workOrdersFor(eq.id).find((w) => !w.completedAt);
  const auth = authorisationFor(eq.id);

  let statement = "";
  let instruction = "";
  let tab: TabValue = "overview";
  let linkLabel = "View details";

  if (statusKey === "down") {
    statement = gate.headline;
    instruction = gate.detail ?? "Maintenance is in progress. Contact biomedical before use.";
    tab = "breakdowns";
    linkLabel = "View breakdowns";
  } else if (statusKey === "maintenance") {
    statement = "Active maintenance in progress.";
    instruction = activeWorkOrder
      ? `${activeWorkOrder.workOrderNumber} · started ${formatDate(activeWorkOrder.startedAt)}`
      : "A work order is open for this unit.";
    tab = "maintenance";
    linkLabel = "View maintenance";
  } else if (statusKey === "condemned") {
    statement = "This unit is condemned.";
    instruction = auth
      ? `In continued use under authorisation until ${formatDate(auth.validUntil)}.`
      : "Not authorised for further clinical use.";
    tab = "overview";
    linkLabel = "View condemnation record";
  } else {
    statement = `${flags.length} item${flags.length === 1 ? "" : "s"} need attention.`;
    instruction = flags.slice(0, 3).map((f) => FLAG_LABEL[f]).join(" · ");
    tab = "overview";
    linkLabel = "View details";
  }

  const BannerIcon = STATUS_BANNER_ICON[statusKey];
  const tone = STATUS_BANNER_TONE[statusKey];

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4", TONE_CLASS[tone])}>
      <div className="flex items-start gap-3">
        <BannerIcon size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {EQUIPMENT_STATUS_LABEL[statusKey]} — {statement}
          </p>
          <p className="text-sm">{instruction}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onViewTab(tab)}
        className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
      >
        {linkLabel} →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Alert chips — severity-sorted, capped at 3, clickable
// ─────────────────────────────────────────────────────────────

function AlertChips({ eq, onViewTab }: { eq: Equipment; onViewTab: (tab: TabValue) => void }) {
  const flags = computeFlags(eq);
  if (flags.length === 0) return null;

  const sorted = [...flags].sort(
    (a, b) => ALERT_FLAG_SEVERITY_ORDER.indexOf(a) - ALERT_FLAG_SEVERITY_ORDER.indexOf(b)
  );
  const visible = sorted.slice(0, 3);
  const overflow = sorted.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((f) => {
        const tone = ALERT_FLAG_TIER[f];
        const FlagIcon = TIER_ICON[tone];
        return (
          <button
            key={f}
            type="button"
            onClick={() => onViewTab(ALERT_FLAG_TAB[f])}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full border px-3 text-[11px] font-medium transition-colors hover:brightness-95",
              TONE_CLASS[tone]
            )}
          >
            <FlagIcon size={12} />
            {FLAG_LABEL[f]}
          </button>
        );
      })}
      {overflow > 0 && <span className="text-xs text-muted-foreground">+{overflow} more</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar — five grouped fact clusters
// ─────────────────────────────────────────────────────────────

const USAGE_TRACKING_LABEL: Record<string, string> = {
  SESSION_TIMER: "QR session timer",
  HOUR_METER: "Manual hour-meter log",
  NONE: "Not tracked",
};

function lifecycleTone(pct: number): Tone {
  if (pct >= 90) return "danger";
  if (pct >= 75) return "warning";
  return "success";
}

function EquipmentSidebar({ eq }: { eq: Equipment }) {
  const dept = getDepartment(eq.departmentId);
  const room = getRoom(eq.roomId);
  const responsible = getUser(eq.responsibleUserId);
  const model = modelFor(eq);
  const manufacturer = getManufacturer(model?.manufacturerId ?? "");
  const dealer = getVendor(eq.dealerVendorId);
  const lifecycle = lifecycleProgress(eq);
  const shelfMonths = shelfAgeMonths(eq);
  const sessions = sessionsFor(eq.id);
  const serviced = lastServicedAt(eq);
  const servicedDaysAgo = serviced ? Math.abs(daysUntil(serviced)) : null;

  return (
    <Card className="p-5">
      <CardContent className="space-y-5 px-0">
        <SidebarGroup title="Identity">
          <Field label="Asset ID" value={eq.assetId} />
          <Field label="Serial number" value={eq.serialNumber} />
          <Field label="Model / series" value={model ? `${model.modelName}${model.series ? ` (${model.series})` : ""}` : undefined} />
          <Field label="Manufacturer" value={manufacturer?.name} />
          <Field label="Year of manufacture" value={String(eq.yearOfManufacture)} />
          {shelfMonths > 0 && (
            <Field
              label="Shelf age at purchase"
              value={
                <span className={shelfMonths > AGED_STOCK_THRESHOLD_MONTHS ? "text-warning" : undefined}>
                  {shelfMonths} months
                </span>
              }
            />
          )}
        </SidebarGroup>

        <Separator className="-mx-5 w-auto" />

        <SidebarGroup title="Location">
          <Field label="Department" value={dept?.name} />
          <Field label="Floor / Room" value={room ? `Floor ${room.floor} · ${room.name}` : undefined} />
          <Field
            label="Responsible person"
            value={
              responsible ? (
                <Link href={`/team/${responsible.id}`} className="flex items-center gap-2 hover:underline">
                  <Avatar size="sm">
                    <AvatarFallback>{initials(responsible.name)}</AvatarFallback>
                  </Avatar>
                  {responsible.name}
                </Link>
              ) : undefined
            }
            empty="Unassigned"
          />
        </SidebarGroup>

        <Separator className="-mx-5 w-auto" />

        <SidebarGroup title="Lifecycle">
          <Field label="Purchase date" value={formatDate(eq.dateOfPurchase)} />
          <Field label="Installation date" value={formatDate(eq.dateOfInstallation)} />
          <Field label="Age in service" value={`${ageYears(eq).toFixed(1)} yrs`} />
          <Field
            label="Cumulative usage hours"
            value={`${eq.cumulativeUsageHours.toLocaleString("en-IN")} hrs`}
            hint={`${usageConfidencePct(sessions)}% confirmed`}
          />
          {model && (
            <Field
              label="Expected life"
              value={`${model.expectedServiceLifeYears} yrs${model.expectedServiceLifeHours ? ` · ${model.expectedServiceLifeHours.toLocaleString("en-IN")} hrs` : ""}`}
            />
          )}
          {lifecycle && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lifecycle used</span>
                <span>{lifecycle.pct}%</span>
              </div>
              <Progress value={lifecycle.pct} className="h-1.5" indicatorClassName={cn(
                lifecycleTone(lifecycle.pct) === "danger" && "bg-danger",
                lifecycleTone(lifecycle.pct) === "warning" && "bg-warning",
                lifecycleTone(lifecycle.pct) === "success" && "bg-success"
              )} />
              <p className="text-xs text-muted-foreground">
                {lifecycle.driverLabel} · driven by {lifecycle.driver === "hours" ? "usage hours" : "years in service"}
              </p>
            </div>
          )}
        </SidebarGroup>

        <Separator className="-mx-5 w-auto" />

        <SidebarGroup title="Commercial">
          <Field label="Purchase cost" value={formatINR(eq.purchaseCost)} />
          <Field label="Dealer / supplier" value={dealer?.name} />
          <Field
            label="Total cost of ownership"
            value={formatINR(totalCostOfOwnership(eq))}
            hint="Purchase + contracts + logged repairs"
          />
        </SidebarGroup>

        <Separator className="-mx-5 w-auto" />

        <SidebarGroup title="Operational">
          <Field
            label="Criticality"
            value={<Badge variant="outline" className={CRITICALITY_BADGE_CLASS[eq.criticality]}>{CRITICALITY_LABEL[eq.criticality]}</Badge>}
          />
          <Field label="Usage tracking method" value={USAGE_TRACKING_LABEL[eq.usageTrackingMode] ?? eq.usageTrackingMode} />
          <Field
            label="Last serviced"
            value={serviced ? formatDate(serviced) : undefined}
            hint={servicedDaysAgo != null ? `${servicedDaysAgo} days ago` : undefined}
            empty="Never serviced"
          />
        </SidebarGroup>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────

interface Obligation {
  label: string;
  date: string;
  daysUntil: number;
}

const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  WARRANTY: "Warranty",
  AMC: "AMC",
  CMC: "CMC",
  SERVICE: "Service contract",
};

function buildObligations(pm: PmSchedule | undefined, calibrations: CalibrationRecord[], contracts: Contract[]): Obligation[] {
  const obligations: Obligation[] = [];
  if (pm?.nextDueDate) obligations.push({ label: "Next PM", date: pm.nextDueDate, daysUntil: daysUntil(pm.nextDueDate) });

  const latestCal = calibrations.slice().sort((a, b) => b.validUntil.localeCompare(a.validUntil))[0];
  if (latestCal) obligations.push({ label: "Calibration renewal", date: latestCal.validUntil, daysUntil: daysUntil(latestCal.validUntil) });

  for (const c of contracts) {
    obligations.push({ label: `${CONTRACT_TYPE_LABEL[c.type]} renewal`, date: c.endDate, daysUntil: daysUntil(c.endDate) });
  }

  return obligations.sort((a, b) => a.date.localeCompare(b.date));
}

function OverviewPanel({ eq, onViewTab }: { eq: Equipment; onViewTab: (tab: TabValue) => void }) {
  const gate = evaluateGate(eq);
  const statusKey = equipmentStatusKey(eq);
  const ticketHistory = ticketsFor(eq.id);
  const activeTicket = ticketHistory.find((t) => t.status !== "CLOSED" && t.status !== "RESOLVED");
  const activeWorkOrder = workOrdersFor(eq.id).find((w) => !w.completedAt);
  const sessions = sessionsFor(eq.id);

  const pm = pmScheduleFor(eq.id);
  const calibrations = calibrationsFor(eq.id);
  const contracts = contractsFor(eq.id);
  const obligations = useMemo(() => buildObligations(pm, calibrations, contracts), [pm, calibrations, contracts]);

  const liveCondemnationRecords = useDemo((s) => s.condemnationRecords);
  const resolveCondemnation = useDemo((s) => s.resolveCondemnation);
  const rejectCondemnation = useDemo((s) => s.rejectCondemnation);
  const requestCondemnation = useDemo((s) => s.requestCondemnation);
  const condemnationRecords = liveCondemnationRecords.filter((c) => c.equipmentId === eq.id);
  const pendingCondemnation = condemnationRecords.find((c) => !c.approvedAt && !c.rejectedAt);
  const settledCondemnation = condemnationRecords
    .filter((c) => c.approvedAt || c.rejectedAt)
    .sort((a, b) => (b.approvedAt ?? b.rejectedAt ?? "").localeCompare(a.approvedAt ?? a.rejectedAt ?? ""))[0];
  const auth = authorisationFor(eq.id);

  const [condemnationNotes, setCondemnationNotes] = useState("");
  const [requestingCondemnation, setRequestingCondemnation] = useState(false);
  const [condemnationJustification, setCondemnationJustification] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              label="Status"
              value={<Badge variant="outline" className={EQUIPMENT_STATUS_BADGE_CLASS[statusKey]}>{EQUIPMENT_STATUS_LABEL[statusKey]}</Badge>}
            />
            <Field
              label="Scan gate"
              value={<StatusChip tone={GATE_TONE[gate.state] ?? "neutral"} label={gate.state} />}
              hint={gate.detail ? `${gate.headline} — ${gate.detail}` : gate.headline}
            />
            {activeTicket && (
              <Field
                label="Reported by"
                value={getUser(activeTicket.raisedByUserId)?.name}
                hint={`${formatDate(activeTicket.openedAt)} · ${activeTicket.issueType}`}
              />
            )}
            {activeWorkOrder && (
              <Field
                label="Active job"
                value={activeWorkOrder.workOrderNumber}
                hint={`${activeWorkOrder.type.replace(/_/g, " ").toLowerCase()} · started ${formatDate(activeWorkOrder.startedAt)}`}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming obligations</CardTitle>
          </CardHeader>
          <CardContent>
            {obligations.length > 0 ? (
              <div className="divide-y divide-border">
                {obligations.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm">{o.label}</span>
                    <span
                      className={cn(
                        "text-sm",
                        o.daysUntil < 0 ? "text-danger" : o.daysUntil <= 14 ? "text-warning" : "text-muted-foreground"
                      )}
                    >
                      {formatDate(o.date)} · {o.daysUntil < 0 ? `overdue ${Math.abs(o.daysUntil)}d` : `in ${o.daysUntil}d`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing due — all obligations are on track.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent sessions</CardTitle>
            <button type="button" onClick={() => onViewTab("sessions")} className="text-sm font-medium text-primary hover:underline">
              View all
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <div className="divide-y divide-border">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{getUser(s.userId)?.name ?? "Unknown user"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.startedAt)} at {formatTime(s.startedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {s.durationSeconds ? formatDuration(s.durationSeconds) : "In progress"}
                    </span>
                    {s.endReason === "BREAKDOWN" && <StatusChip tone="danger" label="Breakdown" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No usage sessions recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condemnation &amp; end of life</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingCondemnation ? (
            <div className="space-y-3">
              <Field label="Justification" value={pendingCondemnation.justification} />
              <Field
                label="Last 12 months"
                value={`${pendingCondemnation.breakdownCountLast12m} breakdowns · ${formatINR(pendingCondemnation.repairCostLast12m)} repair cost`}
              />
              <Textarea
                placeholder="Notes (optional)"
                value={condemnationNotes}
                onChange={(e) => setCondemnationNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    resolveCondemnation(pendingCondemnation.id, "REFURBISH", condemnationNotes || undefined);
                    setCondemnationNotes("");
                  }}
                >
                  <Wrench size={14} /> Refurbish — reuse with parts
                </Button>
                <Button
                  variant="decline"
                  size="sm"
                  onClick={() => {
                    resolveCondemnation(pendingCondemnation.id, "CONDEMN", condemnationNotes || undefined);
                    setCondemnationNotes("");
                  }}
                >
                  <TrashSimple size={14} /> Condemn unit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    rejectCondemnation(pendingCondemnation.id);
                    setCondemnationNotes("");
                  }}
                >
                  Reject request
                </Button>
              </div>
            </div>
          ) : settledCondemnation ? (
            <div className="space-y-3">
              <Field label="Justification" value={settledCondemnation.justification} />
              <Field
                label="Last 12 months"
                value={`${settledCondemnation.breakdownCountLast12m} breakdowns · ${formatINR(settledCondemnation.repairCostLast12m)} repair cost`}
              />
              {settledCondemnation.resolution && (
                <Field
                  label="Outcome"
                  value={settledCondemnation.resolution === "CONDEMNED" ? "Condemned" : "Refurbished — reused with parts replacement"}
                  hint={`${formatDate(settledCondemnation.approvedAt!)} by ${getUser(settledCondemnation.approvedByUserId)?.name}`}
                />
              )}
              {settledCondemnation.rejectedAt && (
                <Field
                  label="Outcome"
                  value="Request rejected"
                  hint={`${formatDate(settledCondemnation.rejectedAt)} by ${getUser(settledCondemnation.rejectedByUserId)?.name}`}
                />
              )}
              {settledCondemnation.resolutionNotes && <Field label="Notes" value={settledCondemnation.resolutionNotes} />}
            </div>
          ) : eq.financialStatus === "CONDEMNED" ? (
            <p className="text-sm text-muted-foreground">This unit is condemned.</p>
          ) : requestingCondemnation ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Why should this unit be reviewed for condemnation?"
                value={condemnationJustification}
                onChange={(e) => setCondemnationJustification(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!condemnationJustification.trim()}
                  onClick={() => {
                    requestCondemnation(eq.id, condemnationJustification.trim());
                    setCondemnationJustification("");
                    setRequestingCondemnation(false);
                  }}
                >
                  Submit request
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRequestingCondemnation(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setRequestingCondemnation(true)}>
              Request condemnation review
            </Button>
          )}

          {auth && (
            <>
              <Separator className="-mx-5 w-auto" />
              <Field
                label="Continued-use authorisation"
                value={auth.reason}
                hint={`Authorised by ${getUser(auth.authorisedByUserId)?.name} · valid until ${formatDate(auth.validUntil)} · reviewed every ${auth.reviewIntervalMonths} months`}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Maintenance tab — planned PM + unified, filterable service history
// ─────────────────────────────────────────────────────────────

const PM_TRIGGER_LABEL: Record<string, string> = {
  CALENDAR: "Calendar",
  USAGE_HOURS: "Usage hours",
  WHICHEVER_FIRST: "Whichever comes first",
};

const SERVICE_HISTORY_TYPE_LABEL: Record<string, string> = {
  PM: "Preventive maintenance",
  CORRECTIVE: "Corrective repair",
  PREVENTIVE: "Preventive maintenance",
  CALIBRATION: "Calibration",
  INSTALLATION: "Installation",
  INSPECTION: "Inspection",
};

interface ServiceHistoryRow {
  id: string;
  date: string;
  type: string;
  performedBy: string;
  outcome: string;
  durationLabel?: string;
}

function performedByLabel(userId?: string, vendorId?: string): string {
  if (userId) return getUser(userId)?.name ?? "—";
  if (vendorId) return getVendor(vendorId)?.name ?? "—";
  return "—";
}

function buildServiceHistory(eq: Equipment, pm: PmSchedule | undefined, calibrations: CalibrationRecord[]): ServiceHistoryRow[] {
  const rows: ServiceHistoryRow[] = [];

  if (pm?.lastPerformedAt) {
    rows.push({ id: "pm-last", date: pm.lastPerformedAt, type: "PM", performedBy: "—", outcome: "Completed" });
  }

  for (const c of calibrations) {
    rows.push({
      id: c.id,
      date: c.performedAt,
      type: "CALIBRATION",
      performedBy: performedByLabel(c.performedByUserId, c.performedByVendorId),
      outcome: c.passed ? "Passed" : "Failed",
    });
  }

  for (const w of workOrdersFor(eq.id)) {
    if (!w.completedAt) continue;
    rows.push({
      id: w.id,
      date: w.completedAt,
      type: w.type,
      performedBy: performedByLabel(w.performedByUserId, w.vendorId),
      outcome: w.findings ?? "—",
      durationLabel: formatDuration((new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()) / 1000),
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function MaintenancePanel({ eq }: { eq: Equipment }) {
  const pm = pmScheduleFor(eq.id);
  const hoursOp = operatingHoursSummary(eq);
  const calibrations = calibrationsFor(eq.id);
  const history = useMemo(() => buildServiceHistory(eq, pm, calibrations), [eq, pm, calibrations]);
  const types = useMemo(() => Array.from(new Set(history.map((h) => h.type))), [history]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const filtered = typeFilter === "ALL" ? history : history.filter((h) => h.type === typeFilter);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Planned PM schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pm ? (
              <>
                <Field label="Trigger" value={PM_TRIGGER_LABEL[pm.triggerType] ?? pm.triggerType} />
                {pm.nextDueDate && (
                  <Field
                    label="Next due"
                    value={formatDate(pm.nextDueDate)}
                    hint={daysUntil(pm.nextDueDate) < 0 ? `overdue by ${Math.abs(daysUntil(pm.nextDueDate))}d` : `in ${daysUntil(pm.nextDueDate)}d`}
                  />
                )}
                {pm.nextDueHours != null && (
                  <Field label="Next due (usage hours)" value={`${pm.nextDueHours.toLocaleString("en-IN")} hrs`} />
                )}
              </>
            ) : (
              <EmptyState icon={ClipboardText} message="No PM schedule on file for this unit." actionLabel="Add PM schedule" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Cumulative hours" value={hoursOp.cumulativeHours.toLocaleString("en-IN")} />
            <Separator className="-mx-5 w-auto" />
            <div>
              <Field
                label="Hours run since last PM"
                value={hoursOp.hoursSinceLastPm != null ? `${Math.round(hoursOp.hoursSinceLastPm).toLocaleString("en-IN")} hrs` : undefined}
                hint={
                  hoursOp.lastPmDate
                    ? `Since last PM on ${formatDate(hoursOp.lastPmDate)} · ${hoursOp.sessionsSinceLastPm} session${hoursOp.sessionsSinceLastPm === 1 ? "" : "s"}`
                    : "No PM on file yet"
                }
              />
              {hoursOp.hoursTriggerPct != null && (
                <div className="mt-2 space-y-1">
                  <Progress value={hoursOp.hoursTriggerPct} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {hoursOp.hoursTriggerPct}% toward next PM at {pm?.nextDueHours?.toLocaleString("en-IN")} hrs
                  </p>
                </div>
              )}
            </div>
            <Separator className="-mx-5 w-auto" />
            <Field
              label="Average session length"
              value={hoursOp.avgSessionSeconds != null ? formatDuration(hoursOp.avgSessionSeconds) : undefined}
              hint="Over the same window"
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-medium">Service history</h3>
          {types.length > 1 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {SERVICE_HISTORY_TYPE_LABEL[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {filtered.length > 0 ? (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Performed by</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.date)}</TableCell>
                    <TableCell>{SERVICE_HISTORY_TYPE_LABEL[row.type] ?? row.type}</TableCell>
                    <TableCell>{row.performedBy}</TableCell>
                    <TableCell className="text-muted-foreground">{row.durationLabel ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.outcome}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyState icon={ClipboardText} message="No completed service history for this unit yet." />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Breakdowns tab
// ─────────────────────────────────────────────────────────────

function ticketTone(t: Ticket): Tone {
  if (t.status === "CLOSED" || t.status === "RESOLVED") return "success";
  if (t.priority === "CRITICAL" || t.slaBreached) return "danger";
  return "warning";
}

function daysSince(iso: string): number {
  return Math.round((now().getTime() - new Date(iso).getTime()) / 864e5);
}

function BreakdownsPanel({ eq }: { eq: Equipment }) {
  const tickets = ticketsFor(eq.id);
  const thisQuarter = tickets.filter((t) => daysSince(t.openedAt) <= 90).length;
  const thisYear = tickets.filter((t) => daysSince(t.openedAt) <= 365).length;
  const mtbfHours = tickets.length > 0 ? Math.round(eq.cumulativeUsageHours / tickets.length) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="This quarter" value={String(thisQuarter)} />
        <MiniStat label="This year" value={String(thisYear)} />
        <MiniStat label="MTBF (approx.)" value={mtbfHours != null ? `${mtbfHours.toLocaleString("en-IN")} hrs` : "—"} />
      </div>

      {tickets.length > 0 ? (
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
                    {t.runtimeHoursAtFailure != null && ` · ${t.runtimeHoursAtFailure.toLocaleString("en-IN")} hrs at failure`}
                    {t.downtimeHours != null && ` · ${t.downtimeHours}h downtime`}
                    {t.slaBreached && " · SLA breached"}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Wrench} message="No breakdown history for this unit." />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Accessories tab
// ─────────────────────────────────────────────────────────────

function AccessoriesPanel({ eq }: { eq: Equipment }) {
  const accessoryLineage = accessoriesFor(eq.id);
  return accessoryLineage.length > 0 ? (
    <div className="space-y-2">
      {accessoryLineage.map((a, i) => (
        <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{i === 0 ? "Original" : `Replacement #${i}`}</span>
          <span className="font-medium">{a.name}</span>
          <Badge variant="outline">{a.source}</Badge>
          <span className="text-muted-foreground">
            {formatDate(a.installedAt)}–{a.removedAt ? formatDate(a.removedAt) : "present"}
          </span>
          {a.status === "REPLACED" && a.removalReason && (
            <span className="text-muted-foreground">({a.removalReason.toLowerCase()})</span>
          )}
          {i < accessoryLineage.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  ) : (
    <EmptyState icon={Package} message="No accessories tracked for this unit." />
  );
}

// ─────────────────────────────────────────────────────────────
// Contracts tab — Warranty / AMC-CMC / Service / Certifications
// ─────────────────────────────────────────────────────────────

function ContractSection({
  title,
  icon: IconCmp,
  action,
  children,
}: {
  title: string;
  icon: Icon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-medium">
          <IconCmp size={16} className="text-muted-foreground" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ContractCard({ contract }: { contract: Contract }) {
  const vendor = getVendor(contract.vendorId);
  const { status, offsetDays } = expiryStatus(contract.endDate);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {CONTRACT_TYPE_LABEL[contract.type]} · {contract.contractNumber}
          </p>
          <StatusChip tone={EXPIRY_TONE[status]} label={EXPIRY_LABEL[status]} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Provider" value={vendor?.name} />
          <Field
            label="Validity"
            value={`${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`}
            hint={status === "EXPIRED" ? `expired ${Math.abs(offsetDays)}d ago` : `${offsetDays}d left`}
          />
          <Field label="Annual cost" value={contract.annualCost > 0 ? formatINR(contract.annualCost) : "Included in warranty"} />
          <Field label="Response / resolution SLA" value={`${contract.responseSlaHours}h / ${contract.resolutionSlaHours}h`} />
        </div>
        {vendor && (vendor.contactPerson || vendor.phone) && (
          <p className="text-xs text-muted-foreground">
            Contact: {vendor.contactPerson}
            {vendor.phone ? ` · ${vendor.phone}` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ContractsPanel({ eq, certModalOpen }: { eq: Equipment; certModalOpen: boolean }) {
  const contracts = contractsFor(eq.id);
  const warranty = contracts.find((c) => c.type === "WARRANTY");
  const amcCmc = contracts.filter((c) => c.type === "AMC" || c.type === "CMC");
  const service = contracts.filter((c) => c.type === "SERVICE");
  const certifications = certificationDocuments(eq.id);

  return (
    <div className="space-y-6">
      <ContractSection title="Warranty" icon={ShieldCheck}>
        {warranty ? (
          <ContractCard contract={warranty} />
        ) : (
          <EmptyState
            icon={ShieldCheck}
            message={eq.financialStatus === "CONDEMNED" ? "Condemned assets carry no warranty." : "No warranty on file for this unit."}
            actionLabel="Add warranty"
          />
        )}
      </ContractSection>

      <ContractSection title="AMC / CMC" icon={FileText}>
        {amcCmc.length > 0 ? (
          <div className="space-y-3">
            {amcCmc.map((c) => (
              <ContractCard key={c.id} contract={c} />
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} message="No AMC or CMC contract on file for this unit." actionLabel="Add AMC / CMC contract" />
        )}
      </ContractSection>

      <ContractSection title="Service contracts" icon={Wrench}>
        {service.length > 0 ? (
          <div className="space-y-3">
            {service.map((c) => (
              <ContractCard key={c.id} contract={c} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Wrench} message="No standalone service contract on file for this unit." actionLabel="Add service contract" />
        )}
      </ContractSection>

      <ContractSection
        title="Certifications & compliance"
        icon={Certificate}
        action={certifications.length > 0 ? <CertificationsDialog documents={certifications} autoOpen={certModalOpen} /> : undefined}
      >
        {certifications.length > 0 ? (
          <div className="space-y-3">
            {certifications.map((doc) => {
              const { status, offsetDays } = expiryStatus(doc.expiryDate);
              return (
                <Card key={doc.id}>
                  <CardContent className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{doc.label ?? doc.fileName}</p>
                      <StatusChip tone={EXPIRY_TONE[status]} label={EXPIRY_LABEL[status]} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.type === "CERTIFICATION" ? "Certification" : "Insurance"} · Expires {formatDate(doc.expiryDate)} ·{" "}
                      {status === "EXPIRED" ? `expired ${Math.abs(offsetDays)}d ago` : `${offsetDays}d left`}
                      {" · "}
                      <a href={`#doc-${doc.id}`} className="text-primary hover:underline">
                        {doc.fileName}
                      </a>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Certificate} message="No certifications or insurance documents on file." actionLabel="Add certification" />
        )}
      </ContractSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sessions tab
// ─────────────────────────────────────────────────────────────

const SESSION_TYPE_LABEL: Record<string, string> = {
  CLINICAL_USE: "Clinical use",
  MAINTENANCE_WORK: "Maintenance work",
};

function SessionsPanel({ eq }: { eq: Equipment }) {
  const sessions = sessionsFor(eq.id);
  const room = getRoom(eq.roomId);
  const dept = getDepartment(eq.departmentId);
  const nowDate = now();

  const totalHours = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 3600;
  const sessionsThisMonth = sessions.filter((s) => {
    const d = new Date(s.startedAt);
    return d.getMonth() === nowDate.getMonth() && d.getFullYear() === nowDate.getFullYear();
  }).length;
  const avgSeconds =
    sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / sessions.length : null;
  const confidence = usageConfidencePct(sessions);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Total logged hours" value={`${totalHours.toFixed(1)} hrs`} />
        <MiniStat label="Sessions this month" value={String(sessionsThisMonth)} />
        <MiniStat label="Average session" value={avgSeconds != null ? formatDuration(avgSeconds) : "—"} />
        <MiniStat label="Tracking confidence" value={`${confidence}%`} />
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((s) => {
            const sessionUser = getUser(s.userId);
            const breakdown = s.endReason === "BREAKDOWN";
            return (
              <Card key={s.id}>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{SESSION_TYPE_LABEL[s.sessionType] ?? s.sessionType}</p>
                    <Badge variant={breakdown ? "destructive" : "outline"}>
                      {s.durationSeconds != null ? formatDuration(s.durationSeconds) : "In progress"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sessionUser?.name ?? "Unknown user"} ·{" "}
                    {room ? `Floor ${room.floor} · ${room.name}` : "—"}
                    {dept ? ` · ${dept.name}` : ""}
                    <span className="text-xs">
                      {" · Started "}
                      {formatDate(s.startedAt)} at {formatTime(s.startedAt)}
                      {breakdown && " · ended in breakdown"}
                      {s.dataQuality !== "CONFIRMED" && ` · ${s.dataQuality.toLowerCase()}`}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Timer} message="No usage sessions recorded yet." />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity tab — day-grouped, sticky headers, type filter
// ─────────────────────────────────────────────────────────────

function ActivityPanel({ eq }: { eq: Equipment }) {
  const liveActivity = useDemo((s) => s.activity);
  const events = useMemo(
    () =>
      liveActivity
        .filter((a) => a.equipmentId === eq.id)
        .slice()
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [liveActivity, eq.id]
  );
  const types = useMemo(() => Array.from(new Set(events.map((e) => e.eventType))), [events]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const filtered = typeFilter === "ALL" ? events : events.filter((e) => e.eventType === typeFilter);

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const key = dayLabel(e.occurredAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-medium">Event log</h3>
        {types.length > 1 && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger size="sm" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All events</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {activityTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {groups.length > 0 ? (
        <div className="max-h-140 overflow-y-auto rounded-lg border border-border">
          {groups.map(([day, dayEvents]) => (
            <div key={day}>
              <div className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-2 text-xs font-medium text-muted-foreground">
                {day}
              </div>
              <div className="divide-y divide-border">
                {dayEvents.map((e) => {
                  const ActivityIcon = activityIcon(e.eventType);
                  return (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <ActivityIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{e.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.actorSystem ? "System" : getUser(e.actorUserId ?? "")?.name ?? "Unknown"} · {formatTime(e.occurredAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardText} message="No activity recorded yet." />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────

function EquipmentProfileContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialTab: TabValue = searchParams.get("tab") === "contracts" ? "contracts" : "overview";
  const certModalOpen = searchParams.get("certModal") === "open";

  const eq = useDemo((s) => s.equipment.find((e) => e.id === id));
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  if (!eq) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: "Equipment", href: "/equipment" }, { label: "Not found" }]} />
        <p className="text-sm text-muted-foreground">Equipment not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Equipment", href: "/equipment" },
          {
            label: categoryName(eq),
            href: categoryFor(eq) ? `/equipment?category=${categoryFor(eq)!.id}` : undefined,
          },
          { label: equipmentName(eq) },
        ]}
      />

      <EquipmentHeader eq={eq} />
      <StatusBanner eq={eq} onViewTab={setActiveTab} />
      <AlertChips eq={eq} onViewTab={setActiveTab} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <EquipmentSidebar eq={eq} />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
            <TabsTrigger value="accessories">Accessories</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-6">
            <OverviewPanel eq={eq} onViewTab={setActiveTab} />
          </TabsContent>
          <TabsContent value="maintenance" className="pt-6">
            <MaintenancePanel eq={eq} />
          </TabsContent>
          <TabsContent value="breakdowns" className="pt-6">
            <BreakdownsPanel eq={eq} />
          </TabsContent>
          <TabsContent value="accessories" className="pt-6">
            <AccessoriesPanel eq={eq} />
          </TabsContent>
          <TabsContent value="contracts" className="pt-6">
            <ContractsPanel eq={eq} certModalOpen={certModalOpen} />
          </TabsContent>
          <TabsContent value="sessions" className="pt-6">
            <SessionsPanel eq={eq} />
          </TabsContent>
          <TabsContent value="activity" className="pt-6">
            <ActivityPanel eq={eq} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function EquipmentProfilePage() {
  return (
    <Suspense fallback={null}>
      <EquipmentProfileContent />
    </Suspense>
  );
}
