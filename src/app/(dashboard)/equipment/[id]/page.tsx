"use client";

import { Suspense, useMemo, useRef, useState, type ReactNode } from "react";
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
  CalendarCheck,
  ArrowsOut,
  ImageSquare,
  QrCode,
  DownloadSimple,
  Files,
  ArrowUUpLeft,
  Stack,
  Pipe,
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
  type FlagsContext,
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
  generalDocuments,
  allDocumentsFor,
  DOCUMENT_TYPE_LABEL,
  expiryStatus,
  lastServicedAt,
  equipmentLocationInfo,
  activeServiceContract,
  consumableUsageForEquipment,
  buildEquipmentActivityItems,
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
  type EquipmentDocument,
  type MovementRequest,
  MGPS_EQUIPMENT_IDS,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CertificationsDialog } from "@/components/certifications-dialog";
import { EquipmentLabelDialog } from "@/components/equipment-label-dialog";
import { AddDocumentDialog } from "@/components/add-document-dialog";
import { AssignEngineerDialog } from "@/components/assign-engineer-dialog";
import { LogItemsUsedDialog } from "@/components/log-items-used-dialog";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { ActivityFeedList } from "@/components/recent-activity-feed";
import { AssetIdChip, DotPill, DOT_PILL_CLASS } from "@/components/equipment-chips";
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

/** Icon/link-only tone color, for banners whose body text should read as plain text rather than tinted -- the tone still signals through the icon, background, and border. */
const TONE_TEXT_CLASS: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  accent: "text-status-accent",
  danger: "text-danger",
  neutral: "text-neutral",
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
  RESPONSE_OVERDUE: "danger",
  CALIBRATION_EXPIRED: "danger",
  WARRANTY_EXPIRED: "danger",
  CONTINUED_USE_REVIEW_OVERDUE: "warning",
  PM_OVERDUE: "warning",
  PM_DUE: "accent",
  CALIBRATION_EXPIRING: "accent",
  WARRANTY_EXPIRING: "accent",
  AMC_EXPIRING: "accent",
  AGED_STOCK_AT_PURCHASE: "neutral",
  PM_FOLLOWUP_OPEN: "warning",
};

const ALERT_FLAG_TAB: Record<EquipmentFlag, TabValue> = {
  PM_DUE: "maintenance",
  PM_OVERDUE: "maintenance",
  CALIBRATION_EXPIRING: "maintenance",
  CALIBRATION_EXPIRED: "maintenance",
  WARRANTY_EXPIRING: "contracts",
  WARRANTY_EXPIRED: "contracts",
  AMC_EXPIRING: "contracts",
  RESPONSE_OVERDUE: "breakdowns",
  CONTINUED_USE_REVIEW_OVERDUE: "overview",
  AGED_STOCK_AT_PURCHASE: "overview",
  PM_FOLLOWUP_OPEN: "breakdowns",
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
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

// ─────────────────────────────────────────────────────────────
// CSV export — four scopes off one "Download" button: everything on
// file, just the ticket history, just the documents, or a one-page
// summary of the unit's key facts. Real downloads, not a UI shell.
// ─────────────────────────────────────────────────────────────

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function triggerCsvDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function documentsCsvRows(docs: EquipmentDocument[]): (string | number)[][] {
  return [
    ["Type", "Label", "File name", "Size (KB)", "Uploaded", "Expiry"],
    ...docs.map((d) => [
      DOCUMENT_TYPE_LABEL[d.type],
      d.label ?? "",
      d.fileName,
      d.fileSizeKb,
      formatDate(d.uploadedAt),
      d.expiryDate ? formatDate(d.expiryDate) : "",
    ]),
  ];
}

function ticketsCsvRows(tickets: Ticket[]): (string | number)[][] {
  return [
    ["Ticket #", "Issue type", "Status", "Priority", "Opened", "Resolved", "Downtime (h)", "Response overdue"],
    ...tickets.map((t) => [
      t.ticketNumber,
      t.issueType,
      t.status.replace(/_/g, " "),
      t.priority,
      formatDate(t.openedAt),
      t.resolvedAt ? formatDate(t.resolvedAt) : "",
      t.downtimeHours ?? "",
      t.responseOverdue ? "Yes" : "No",
    ]),
  ];
}

function summaryCsvRows(eq: Equipment): (string | number)[][] {
  const model = modelFor(eq);
  const manufacturer = getManufacturer(model?.manufacturerId ?? "");
  const dept = getDepartment(eq.departmentId);
  const room = getRoom(eq.roomId);
  const pm = pmScheduleFor(eq.id);
  const warranty = contractsFor(eq.id).find((c) => c.type === "WARRANTY");
  return [
    ["Field", "Value"],
    ["Asset ID", eq.assetId],
    ["Equipment", model ? model.modelName : equipmentName(eq)],
    ["Category", categoryName(eq)],
    ["Manufacturer", manufacturer?.name ?? ""],
    ["Status", EQUIPMENT_STATUS_LABEL[equipmentStatusKey(eq)]],
    ["Location", dept ? `${dept.name}${room ? ` · Floor ${room.floor}, ${room.name}` : ""}` : ""],
    ["Upcoming PM", pm?.nextDueDate ? formatDate(pm.nextDueDate) : ""],
    ["Warranty / contract expiry", warranty ? formatDate(warranty.endDate) : ""],
    ["Total cost of ownership", formatINR(totalCostOfOwnership(eq))],
  ];
}

type DownloadScope = "everything" | "tickets" | "documents" | "summary";

function downloadEquipmentCsv(scope: DownloadScope, eq: Equipment, docs: EquipmentDocument[], tickets: Ticket[]) {
  const slug = eq.assetId.replace(/\//g, "-");
  if (scope === "documents") return triggerCsvDownload(`${slug}-documents.csv`, toCsv(documentsCsvRows(docs)));
  if (scope === "tickets") return triggerCsvDownload(`${slug}-tickets.csv`, toCsv(ticketsCsvRows(tickets)));
  if (scope === "summary") return triggerCsvDownload(`${slug}-summary.csv`, toCsv(summaryCsvRows(eq)));
  triggerCsvDownload(
    `${slug}-everything.csv`,
    [
      "SUMMARY",
      toCsv(summaryCsvRows(eq)),
      "",
      "DOCUMENTS",
      toCsv(documentsCsvRows(docs)),
      "",
      "TICKETS",
      toCsv(ticketsCsvRows(tickets)),
    ].join("\n")
  );
}

const DOWNLOAD_SCOPE_LABEL: Record<DownloadScope, string> = {
  everything: "Everything",
  tickets: "Tickets",
  documents: "Documents",
  summary: "Summary",
};

/**
 * Identity card at the top of the page — ID chip and the status pills a
 * reader scans first, then name, a one-line "what/where", and actions.
 */
function EquipmentHeader({ eq, ctx }: { eq: Equipment; ctx: FlagsContext }) {
  const statusKey = equipmentStatusKey(eq, ctx);
  const warrantyContract = contractsFor(eq.id).find((c) => c.type === "WARRANTY");
  const serviceContract = activeServiceContract(eq.id, contractsFor(eq.id));
  const documents = useDemo((s) => s.documents);
  const tickets = (ctx.tickets ?? ticketsFor(eq.id)).filter((t) => t.equipmentId === eq.id);
  const openTickets = tickets.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED");
  const dept = getDepartment(eq.departmentId);
  const room = getRoom(eq.roomId);
  const [qrOpen, setQrOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadScope, setDownloadScope] = useState<DownloadScope>("everything");
  const canAssign = eq.operationalStatus === "DOWN";

  return (
    <Card className="flex-row flex-wrap items-start justify-between gap-4 p-5">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <AssetIdChip assetId={eq.assetId} />
          <DotPill className={EQUIPMENT_STATUS_BADGE_CLASS[statusKey]}>{EQUIPMENT_STATUS_LABEL[statusKey]}</DotPill>
          <DotPill className={CRITICALITY_BADGE_CLASS[eq.criticality]}>{CRITICALITY_LABEL[eq.criticality]}</DotPill>
          {serviceContract && <DotPill className={DOT_PILL_CLASS.blue}>Under {serviceContract.type}</DotPill>}
          {openTickets.length > 0 && (
            <DotPill className={DOT_PILL_CLASS.red}>
              {openTickets.length} open complaint{openTickets.length === 1 ? "" : "s"}
            </DotPill>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-text-primary">{equipmentName(eq)}</h1>
        <p className="text-sm text-text-secondary">
          {categoryName(eq)} · S/N {eq.serialNumber}
          {dept ? ` · ${dept.name}${room ? `, ${room.name}` : ""}` : ""}
        </p>
        {MGPS_EQUIPMENT_IDS.includes(eq.id) && (
          <Link href="/mgps?tab=sources" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Pipe size={14} /> Supply source for the medical gas pipeline · Open MGPS
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setQrOpen(true)}>
          <QrCode /> QR
        </Button>
        <Button variant="outline" disabled={!canAssign} onClick={() => setAssignOpen(true)}>
          <Wrench /> Assign service
        </Button>
        <Button variant="outline" onClick={() => setDownloadOpen(true)}>
          <DownloadSimple /> Download
        </Button>
      </div>

      <AssignEngineerDialog ticketId={openTickets[0]?.id ?? null} open={assignOpen} onOpenChange={setAssignOpen} hideTrigger />

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent showCloseButton className="w-full max-w-sm gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Download</DialogTitle>
            <DialogDescription>Choose what to include in the download.</DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <RadioGroup value={downloadScope} onValueChange={(v) => setDownloadScope(v as DownloadScope)}>
              {(Object.keys(DOWNLOAD_SCOPE_LABEL) as DownloadScope[]).map((scope) => (
                <label key={scope} className="flex items-center gap-2 py-1.5 text-sm">
                  <RadioGroupItem value={scope} /> {DOWNLOAD_SCOPE_LABEL[scope]}
                </label>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter className="rounded-b-none p-8">
            <Button variant="outline" onClick={() => setDownloadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                downloadEquipmentCsv(downloadScope, eq, allDocumentsFor(eq.id, documents), tickets);
                setDownloadOpen(false);
              }}
            >
              <DownloadSimple size={14} /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EquipmentLabelDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        assetId={eq.assetId}
        name={equipmentName(eq)}
        category={categoryName(eq)}
        serialNumber={eq.serialNumber}
        purchaseDate={formatDate(eq.dateOfPurchase)}
        warrantyExpiry={warrantyContract ? formatDate(warrantyContract.endDate) : undefined}
      />
    </Card>
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

function StatusBanner({
  eq, onViewTab, ctx,
}: {
  eq: Equipment;
  onViewTab: (tab: TabValue) => void;
  ctx: FlagsContext;
}) {
  const statusKey = equipmentStatusKey(eq, ctx);
  if (statusKey === "operational") return null;

  const gate = evaluateGate(eq);
  const flags = computeFlags(eq, ctx);
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
    // No instruction here -- the flags themselves are already listed as
    // chips directly below this banner (AlertChips), so repeating them
    // as text would just say the same thing twice.
    statement = `${flags.length} item${flags.length === 1 ? "" : "s"} need attention.`;
    tab = "overview";
    linkLabel = "View details";
  }

  const BannerIcon = STATUS_BANNER_ICON[statusKey];
  const tone = STATUS_BANNER_TONE[statusKey];

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5", TONE_CLASS[tone])}>
      <div className="flex min-w-0 items-center gap-2">
        <BannerIcon size={16} className={cn("shrink-0", TONE_TEXT_CLASS[tone])} />
        <p className="truncate text-sm font-medium text-text-primary">
          {statement}
          {instruction && instruction !== statement ? ` — ${instruction}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onViewTab(tab)}
        className={cn("shrink-0 text-sm font-medium underline-offset-4 hover:underline", TONE_TEXT_CLASS[tone])}
      >
        {linkLabel} →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Alert chips — severity-sorted, capped at 3, clickable
// ─────────────────────────────────────────────────────────────

function AlertChips({
  eq, onViewTab, ctx,
}: {
  eq: Equipment;
  onViewTab: (tab: TabValue) => void;
  ctx: FlagsContext;
}) {
  const flags = computeFlags(eq, ctx);
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
// Overview record — shared labels and the equipment photo
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

/** Small thumbnail that opens the full-size photo in a modal on click. No photo yet → a plain placeholder, not clickable. */
function EquipmentPhoto({ eq, className }: { eq: Equipment; className?: string }) {
  const [open, setOpen] = useState(false);

  if (!eq.photoUrl) {
    return (
      <div className={cn("flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-border bg-surface text-muted-foreground", className)}>
        <ImageSquare size={26} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("group relative block h-28 w-full overflow-hidden rounded-lg border border-border", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL, not a static asset */}
        <img src={eq.photoUrl} alt={equipmentName(eq)} className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <ArrowsOut size={18} weight="bold" className="text-white" />
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton className="w-full max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL, not a static asset */}
          <img src={eq.photoUrl} alt={equipmentName(eq)} className="max-h-[80vh] w-full bg-black object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Equipment record — one card on Overview, split by hairline rules into
// rows of two side-by-side sections (label-left, value-right facts), with
// a full-width list of upcoming obligations at the bottom.
// ─────────────────────────────────────────────────────────────

function RecordRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-2 lg:gap-12">{children}</div>;
}

function RecordSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </button>
  );
}

function KeyValues({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">{children}</dl>;
}

function KV({ label, value, empty = "Not recorded" }: { label: string; value?: ReactNode; empty?: string }) {
  const isEmpty = value === undefined || value === null || value === "";
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0", isEmpty ? "text-muted-foreground" : "text-foreground")}>{isEmpty ? empty : value}</dd>
    </>
  );
}

/** Date with an Expired/Expiring pill beside it. */
function DateWithExpiry({ date }: { date: string }) {
  const { status } = expiryStatus(date);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {formatDate(date)}
      {status === "EXPIRED" && <DotPill className={DOT_PILL_CLASS.red}>Expired</DotPill>}
      {status === "EXPIRING" && <DotPill className={DOT_PILL_CLASS.amber}>Expiring</DotPill>}
    </span>
  );
}

const PM_MONTHS_LABEL: Record<number, string> = { 1: "Monthly", 3: "Quarterly", 6: "Half-yearly", 12: "Yearly" };

function pmFrequencyLabel(pm: PmSchedule | undefined): string | undefined {
  if (!pm) return undefined;
  const parts: string[] = [];
  if (pm.intervalMonths) parts.push(PM_MONTHS_LABEL[pm.intervalMonths] ?? `Every ${pm.intervalMonths} months`);
  if (pm.intervalUsageHours) parts.push(`every ${pm.intervalUsageHours.toLocaleString("en-IN")} hrs`);
  if (parts.length === 0) return undefined;
  return pm.triggerType === "WHICHEVER_FIRST" && parts.length > 1 ? `${parts.join(" or ")}, whichever first` : parts.join(" or ");
}

/** Share of the last 365 days the unit wasn't down — logged downtime, plus time since opening for tickets still open. */
function uptimeLast12MonthsPct(tickets: Ticket[]): number {
  const nowMs = now().getTime();
  const windowStart = nowMs - 365 * 864e5;
  const downHours = tickets.reduce((sum, t) => {
    const opened = new Date(t.openedAt).getTime();
    if (opened < windowStart) return sum;
    if (t.downtimeHours != null) return sum + t.downtimeHours;
    if (!t.resolvedAt) return sum + (nowMs - opened) / 36e5;
    return sum;
  }, 0);
  return Math.max(0, 100 - (downHours / (365 * 24)) * 100);
}

function obligationPill(daysLeft: number) {
  if (daysLeft < 0) return <DotPill className={DOT_PILL_CLASS.red}>Overdue {Math.abs(daysLeft)}d</DotPill>;
  if (daysLeft <= 30) return <DotPill className={DOT_PILL_CLASS.amber}>In {daysLeft}d</DotPill>;
  return <DotPill className={DOT_PILL_CLASS.gray}>In {daysLeft}d</DotPill>;
}

// Tab widgets — titled card with a ruled header, then label-left /
// value-right rows split by hairlines. Laid out two to a row.

function WidgetCard({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card className="gap-0 p-0">
      <div className="flex min-h-14 items-center justify-between gap-2 border-b border-border px-5 py-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function WidgetRows({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-border">{children}</dl>;
}

function WidgetRow({ label, value, empty = "Not recorded" }: { label: string; value?: ReactNode; empty?: string }) {
  const isEmpty = value === undefined || value === null || value === "";
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", isEmpty ? "text-muted-foreground" : "font-medium text-foreground")}>
        {isEmpty ? empty : value}
      </dd>
    </div>
  );
}

const BAR_TONE_CLASS = { ok: "bg-success", warning: "bg-warning", danger: "bg-danger" } as const;

function EquipmentRecordCard({
  eq,
  onViewTab,
  movementRequests,
  confirmMovementReturn,
}: {
  eq: Equipment;
  onViewTab: (tab: TabValue) => void;
  movementRequests: MovementRequest[];
  confirmMovementReturn: (id: string, opts?: { returnedWithAllAccessories?: boolean }) => void;
}) {
  const model = modelFor(eq);
  const manufacturer = getManufacturer(model?.manufacturerId ?? "");
  const dept = getDepartment(eq.departmentId);
  const room = getRoom(eq.roomId);
  const responsible = getUser(eq.responsibleUserId);
  const dealer = getVendor(eq.dealerVendorId);
  const locationInfo = equipmentLocationInfo(eq, movementRequests);
  const activeLoan = movementRequests.find(
    (m) => m.equipmentId === eq.id && m.approvalStatus === "APPROVED" && m.movementKind === "TEMPORARY" && !m.returnedAt,
  );
  const [returnedWithAccessories, setReturnedWithAccessories] = useState(true);

  const contracts = contractsFor(eq.id);
  const warranty = contracts.find((c) => c.type === "WARRANTY");
  const serviceContract = activeServiceContract(eq.id, contracts);
  const shelfMonths = shelfAgeMonths(eq);

  const pm = pmScheduleFor(eq.id);
  const pmDays = pm?.nextDueDate ? daysUntil(pm.nextDueDate) : null;
  const calibrations = calibrationsFor(eq.id);
  const latestCal = calibrations.slice().sort((a, b) => b.validUntil.localeCompare(a.validUntil))[0];
  const calibrationRequired = !!pm?.calibrationIntervalMonths || calibrations.length > 0;
  const serviced = lastServicedAt(eq);
  const tickets = ticketsFor(eq.id);
  const workOrders = workOrdersFor(eq.id);
  const maintenanceCost = workOrders.reduce((sum, w) => sum + w.labourCost + w.partsCost, 0);
  const uptime = uptimeLast12MonthsPct(tickets);

  const sessions = sessionsFor(eq.id);
  const lifecycle = lifecycleProgress(eq);

  const gate = evaluateGate(eq);
  const statusKey = equipmentStatusKey(eq);
  const activeTicket = tickets.find((t) => t.status !== "CLOSED" && t.status !== "RESOLVED");
  const activeWorkOrder = workOrders.find((w) => !w.completedAt);
  const lastBreakdown = tickets.slice().sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];

  const obligations = buildObligations(pm, calibrations, contracts);

  return (
    <Card className="gap-0 divide-y divide-border p-0">
      <RecordRow>
        <RecordSection title="Equipment details">
          <div className="w-32">
            <EquipmentPhoto eq={eq} className="h-20" />
          </div>
          <KeyValues>
            <KV label="Equipment ID" value={eq.assetId} />
            <KV label="Barcode / QR" value={eq.qrToken} />
            <KV label="Category" value={categoryName(eq)} />
            <KV label="Make" value={manufacturer?.name} />
            <KV label="Model" value={model ? `${model.modelName}${model.series ? ` (${model.series})` : ""}` : undefined} />
            <KV label="Serial number" value={eq.serialNumber} />
            <KV label="Year of manufacture" value={String(eq.yearOfManufacture)} />
            <KV
              label="Criticality"
              value={<DotPill className={CRITICALITY_BADGE_CLASS[eq.criticality]}>{CRITICALITY_LABEL[eq.criticality]}</DotPill>}
            />
          </KeyValues>
        </RecordSection>

        <RecordSection title="Location & ownership">
          <KeyValues>
            <KV label="Department" value={dept?.name} empty="Unassigned" />
            <KV
              label="Location"
              value={
                room ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {locationInfo.roomLabel}
                    {locationInfo.status !== "PERMANENT" && (
                      <DotPill className={locationInfo.status === "IN_TRANSIT" ? DOT_PILL_CLASS.blue : DOT_PILL_CLASS.amber}>
                        {locationInfo.statusLabel}
                      </DotPill>
                    )}
                  </span>
                ) : undefined
              }
              empty="Unassigned"
            />
            {locationInfo.detail && <KV label="Movement" value={locationInfo.detail} />}
            <KV
              label="Responsible person"
              value={
                responsible ? (
                  <Link href={`/team/${responsible.id}`} className="inline-flex items-center gap-2 hover:underline">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(responsible.name)}</AvatarFallback>
                    </Avatar>
                    {responsible.name}
                  </Link>
                ) : undefined
              }
              empty="Unassigned"
            />
            <KV label="Usage tracking" value={USAGE_TRACKING_LABEL[eq.usageTrackingMode] ?? eq.usageTrackingMode} />
          </KeyValues>

          {activeLoan && (
            <div className="space-y-2 border-t pt-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={returnedWithAccessories} onCheckedChange={(v) => setReturnedWithAccessories(v === true)} />
                Returned with all accessories
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmMovementReturn(activeLoan.id, { returnedWithAllAccessories: returnedWithAccessories })}
              >
                <ArrowUUpLeft size={14} /> Mark as returned
              </Button>
            </div>
          )}
        </RecordSection>
      </RecordRow>

      <RecordRow>
        <RecordSection title="Purchase & coverage" action={<SectionLink onClick={() => onViewTab("contracts")}>View documents</SectionLink>}>
          <KeyValues>
            <KV label="Purchase date" value={formatDate(eq.dateOfPurchase)} />
            <KV label="Purchase cost" value={formatINR(eq.purchaseCost)} />
            <KV label="Vendor" value={dealer?.name} />
            <KV label="Installation date" value={formatDate(eq.dateOfInstallation)} />
            <KV label="Acceptance" value={eq.dateOfAcceptance ? `Accepted on ${formatDate(eq.dateOfAcceptance)}` : undefined} empty="Pending" />
            {shelfMonths > 0 && (
              <KV
                label="Shelf age at purchase"
                value={
                  <span className={shelfMonths > AGED_STOCK_THRESHOLD_MONTHS ? "text-warning" : undefined}>{shelfMonths} months</span>
                }
              />
            )}
            <KV
              label="Warranty"
              value={warranty ? <DateWithExpiry date={warranty.endDate} /> : undefined}
              empty={eq.financialStatus === "CONDEMNED" ? "Condemned — no warranty" : "None"}
            />
            <KV
              label="AMC / CMC"
              value={
                serviceContract ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <DotPill className={DOT_PILL_CLASS.blue}>{serviceContract.type}</DotPill>
                    {serviceContract.contractNumber}
                    <span className="text-muted-foreground">· until {formatDate(serviceContract.endDate)}</span>
                  </span>
                ) : undefined
              }
              empty="None"
            />
          </KeyValues>
        </RecordSection>

        <RecordSection title="Maintenance status" action={<SectionLink onClick={() => onViewTab("maintenance")}>View maintenance</SectionLink>}>
          <KeyValues>
            <KV label="Last PM" value={pm?.lastPerformedAt ? formatDate(pm.lastPerformedAt) : undefined} empty="Never performed" />
            <KV
              label="Next PM"
              value={
                pm?.nextDueDate ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {formatDate(pm.nextDueDate)}
                    {pmDays != null && pmDays < 0 && <DotPill className={DOT_PILL_CLASS.red}>Overdue {Math.abs(pmDays)}d</DotPill>}
                  </span>
                ) : undefined
              }
              empty="Not scheduled"
            />
            <KV label="PM frequency" value={pmFrequencyLabel(pm)} empty="No PM schedule" />
            <KV label="Calibration required" value={calibrationRequired ? "Yes" : "No"} />
            {calibrationRequired && (
              <KV
                label="Calibration"
                value={
                  latestCal ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      Valid until <DateWithExpiry date={latestCal.validUntil} />
                    </span>
                  ) : undefined
                }
                empty="No calibration on file"
              />
            )}
            <KV
              label="Last serviced"
              value={serviced ? `${formatDate(serviced)} · ${Math.abs(daysUntil(serviced))} days ago` : undefined}
              empty="Never serviced"
            />
            <KV label="Uptime, last 12 months" value={`${uptime.toFixed(2)}%`} />
            <KV label="Lifetime maintenance cost" value={formatINR(maintenanceCost)} />
          </KeyValues>
        </RecordSection>
      </RecordRow>

      <RecordRow>
        <RecordSection title="Usage & lifecycle">
          <KeyValues>
            <KV
              label="Usage hours"
              value={`${eq.cumulativeUsageHours.toLocaleString("en-IN")} hrs · ${usageConfidencePct(sessions)}% confirmed`}
            />
            <KV label="Age in service" value={`${ageYears(eq).toFixed(1)} yrs`} />
            {model && (
              <KV
                label="Expected life"
                value={`${model.expectedServiceLifeYears} yrs${model.expectedServiceLifeHours ? ` · ${model.expectedServiceLifeHours.toLocaleString("en-IN")} hrs` : ""}`}
              />
            )}
            {lifecycle && (
              <KV
                label="Lifecycle used"
                value={
                  <div className="max-w-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={lifecycle.pct}
                        className="h-1.5 flex-1"
                        indicatorClassName={cn(
                          lifecycleTone(lifecycle.pct) === "danger" && "bg-danger",
                          lifecycleTone(lifecycle.pct) === "warning" && "bg-warning",
                          lifecycleTone(lifecycle.pct) === "success" && "bg-success"
                        )}
                      />
                      <span className="tabular-nums">{lifecycle.pct}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lifecycle.driverLabel} · by {lifecycle.driver === "hours" ? "usage hours" : "years in service"}
                    </p>
                  </div>
                }
              />
            )}
          </KeyValues>
        </RecordSection>

        <RecordSection title="Current condition" action={<SectionLink onClick={() => onViewTab("breakdowns")}>View breakdowns</SectionLink>}>
          <KeyValues>
            <KV label="Status" value={<DotPill className={EQUIPMENT_STATUS_BADGE_CLASS[statusKey]}>{EQUIPMENT_STATUS_LABEL[statusKey]}</DotPill>} />
            <KV
              label="Scan gate"
              value={
                <div className="space-y-1">
                  <StatusChip tone={GATE_TONE[gate.state] ?? "neutral"} label={gate.state} />
                  <p className="text-xs text-muted-foreground">{gate.detail ? `${gate.headline} — ${gate.detail}` : gate.headline}</p>
                </div>
              }
            />
            <KV
              label="Breakdowns"
              value={tickets.length > 0 ? `${tickets.length} logged · last ${formatDate(lastBreakdown.openedAt)}` : undefined}
              empty="None logged"
            />
            {activeTicket && (
              <KV
                label="Reported by"
                value={`${getUser(activeTicket.raisedByUserId)?.name ?? "Unknown"} · ${formatDate(activeTicket.openedAt)} · ${activeTicket.issueType}`}
              />
            )}
            {activeWorkOrder && (
              <KV
                label="Active job"
                value={`${activeWorkOrder.workOrderNumber} · ${activeWorkOrder.type.replace(/_/g, " ").toLowerCase()} · started ${formatDate(activeWorkOrder.startedAt)}`}
              />
            )}
          </KeyValues>
        </RecordSection>
      </RecordRow>

      <section>
        <h2 className="px-6 pt-6 pb-3 text-base font-semibold text-foreground">Upcoming obligations</h2>
        {obligations.length > 0 ? (
          <ul className="divide-y divide-border border-t border-border">
            {obligations.map((o, i) => {
              const ObligationIcon = o.icon;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onViewTab(o.tab)}
                    className="flex w-full items-center gap-3 px-6 py-3 text-left text-sm transition-colors hover:bg-muted/60"
                  >
                    <ObligationIcon size={16} className="shrink-0 text-muted-foreground" />
                    <span className="flex-1 font-medium">{o.label}</span>
                    <span className="text-muted-foreground">{formatDate(o.date)}</span>
                    <span className="w-28 text-right">{obligationPill(o.daysUntil)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Nothing due — all obligations are on track.</p>
        )}
      </section>
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
  icon: Icon;
  tab: TabValue;
}

const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  WARRANTY: "Warranty",
  AMC: "AMC",
  CMC: "CMC",
  SERVICE: "Service contract",
};

function buildObligations(pm: PmSchedule | undefined, calibrations: CalibrationRecord[], contracts: Contract[]): Obligation[] {
  const obligations: Obligation[] = [];
  if (pm?.nextDueDate) {
    obligations.push({ label: "Next PM", date: pm.nextDueDate, daysUntil: daysUntil(pm.nextDueDate), icon: CalendarCheck, tab: "maintenance" });
  }

  const latestCal = calibrations.slice().sort((a, b) => b.validUntil.localeCompare(a.validUntil))[0];
  if (latestCal) {
    obligations.push({ label: "Calibration renewal", date: latestCal.validUntil, daysUntil: daysUntil(latestCal.validUntil), icon: Certificate, tab: "maintenance" });
  }

  for (const c of contracts) {
    obligations.push({ label: `${CONTRACT_TYPE_LABEL[c.type]} renewal`, date: c.endDate, daysUntil: daysUntil(c.endDate), icon: ShieldCheck, tab: "contracts" });
  }

  return obligations.sort((a, b) => a.date.localeCompare(b.date));
}

function OverviewPanel({
  eq,
  onViewTab,
  movementRequests,
  confirmMovementReturn,
}: {
  eq: Equipment;
  onViewTab: (tab: TabValue) => void;
  movementRequests: MovementRequest[];
  confirmMovementReturn: (id: string, opts?: { returnedWithAllAccessories?: boolean }) => void;
}) {
  const sessions = sessionsFor(eq.id);

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
      <EquipmentRecordCard
        eq={eq}
        onViewTab={onViewTab}
        movementRequests={movementRequests}
        confirmMovementReturn={confirmMovementReturn}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
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
            <EmptyState icon={TrashSimple} message="No condemnation record on file for this unit." />
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

  const consumableItems = useDemo((s) => s.consumableItems);
  const consumableLog = useDemo((s) => s.consumableLog);
  const logConsumableEvent = useDemo((s) => s.logConsumableEvent);
  const partsUsed = useMemo(
    () => consumableUsageForEquipment(eq.id, consumableLog, consumableItems),
    [eq.id, consumableLog, consumableItems]
  );
  const [logItemsOpen, setLogItemsOpen] = useState(false);
  const recentActivity = useMemo(
    () =>
      buildEquipmentActivityItems(eq.id, [
        "WORK_ORDER_CREATED",
        "WORK_ORDER_COMPLETED",
        "PM_PERFORMED",
        "CALIBRATION_RECORDED",
        "PART_CONSUMED",
        "COMPONENT_REPLACED",
      ]),
    [eq.id]
  );

  const pmDays = pm?.nextDueDate ? daysUntil(pm.nextDueDate) : null;
  const latestCal = calibrations.slice().sort((a, b) => b.validUntil.localeCompare(a.validUntil))[0];
  const calibrationRequired = !!pm?.calibrationIntervalMonths || calibrations.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetCard
          title="PM schedule"
          aside={pmDays != null ? obligationPill(pmDays) : undefined}
        >
          {pm ? (
            <WidgetRows>
              <WidgetRow label="Trigger" value={PM_TRIGGER_LABEL[pm.triggerType] ?? pm.triggerType} />
              <WidgetRow label="Frequency" value={pmFrequencyLabel(pm)} />
              {pm.pmSource && <WidgetRow label="Done by" value={pm.pmSource === "IN_HOUSE" ? "In-house team" : "Outsourced"} />}
              <WidgetRow label="Last performed" value={pm.lastPerformedAt ? formatDate(pm.lastPerformedAt) : undefined} empty="Never" />
              <WidgetRow label="Next due" value={pm.nextDueDate ? formatDate(pm.nextDueDate) : undefined} empty="Not scheduled" />
              {pm.nextDueHours != null && (
                <WidgetRow label="Next due (usage hours)" value={`${pm.nextDueHours.toLocaleString("en-IN")} hrs`} />
              )}
            </WidgetRows>
          ) : (
            <div className="p-5">
              <EmptyState icon={ClipboardText} message="No PM schedule on file for this unit." actionLabel="Add PM schedule" />
            </div>
          )}
        </WidgetCard>

        <WidgetCard
          title="Calibration"
          aside={
            latestCal ? (
              expiryStatus(latestCal.validUntil).status === "EXPIRED" ? (
                <DotPill className={DOT_PILL_CLASS.red}>Expired</DotPill>
              ) : expiryStatus(latestCal.validUntil).status === "EXPIRING" ? (
                <DotPill className={DOT_PILL_CLASS.amber}>Expiring</DotPill>
              ) : (
                <DotPill className={DOT_PILL_CLASS.green}>Valid</DotPill>
              )
            ) : undefined
          }
        >
          <WidgetRows>
            <WidgetRow label="Required" value={calibrationRequired ? "Yes" : "No"} />
            {pm?.calibrationIntervalMonths && <WidgetRow label="Interval" value={`Every ${pm.calibrationIntervalMonths} months`} />}
            <WidgetRow label="Last calibrated" value={latestCal ? formatDate(latestCal.performedAt) : undefined} empty="Never" />
            <WidgetRow label="Valid until" value={latestCal ? formatDate(latestCal.validUntil) : undefined} />
            <WidgetRow
              label="Result"
              value={
                latestCal ? (
                  <DotPill className={latestCal.passed ? DOT_PILL_CLASS.green : DOT_PILL_CLASS.red}>
                    {latestCal.passed ? "Passed" : "Failed"}
                  </DotPill>
                ) : undefined
              }
            />
            <WidgetRow label="Certificate no." value={latestCal?.certificateNumber} />
            <WidgetRow
              label="Performed by"
              value={latestCal ? performedByLabel(latestCal.performedByUserId, latestCal.performedByVendorId) : undefined}
            />
          </WidgetRows>
        </WidgetCard>

        <WidgetCard title="Operating hours">
          <div className="space-y-2 border-b border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">Cumulative hours</p>
            <p className="text-2xl font-semibold tabular-nums">
              {hoursOp.cumulativeHours.toLocaleString("en-IN")} <span className="text-sm font-normal text-muted-foreground">hrs</span>
            </p>
            {hoursOp.hoursTriggerPct != null && (
              <div className="space-y-1 pt-1">
                <Progress
                  value={hoursOp.hoursTriggerPct}
                  className="h-1.5"
                  indicatorClassName={BAR_TONE_CLASS[hoursOp.hoursTriggerPct >= 90 ? "danger" : hoursOp.hoursTriggerPct >= 80 ? "warning" : "ok"]}
                />
                <p className="text-xs text-muted-foreground">
                  {hoursOp.hoursTriggerPct}% toward next PM at {pm?.nextDueHours?.toLocaleString("en-IN")} hrs
                </p>
              </div>
            )}
          </div>
          <WidgetRows>
            <WidgetRow
              label="Hours since last PM"
              value={hoursOp.hoursSinceLastPm != null ? `${Math.round(hoursOp.hoursSinceLastPm).toLocaleString("en-IN")} hrs` : undefined}
              empty="No PM on file yet"
            />
            <WidgetRow label="Last PM on" value={hoursOp.lastPmDate ? formatDate(hoursOp.lastPmDate) : undefined} />
            <WidgetRow label="Sessions since last PM" value={hoursOp.lastPmDate ? String(hoursOp.sessionsSinceLastPm) : undefined} />
            <WidgetRow
              label="Average session length"
              value={hoursOp.avgSessionSeconds != null ? formatDuration(hoursOp.avgSessionSeconds) : undefined}
            />
          </WidgetRows>
        </WidgetCard>

        <WidgetCard title="Recent maintenance activity">
          <div className="max-h-80 overflow-y-auto px-5 py-4">
            <ActivityFeedList items={recentActivity} emptyText="No maintenance activity recorded yet." />
          </div>
        </WidgetCard>
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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-medium">Parts used</h3>
          <Button variant="outline" size="sm" onClick={() => setLogItemsOpen(true)}>
            <Stack size={14} /> Log items used
          </Button>
        </div>

        {partsUsed.length > 0 ? (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Logged by</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partsUsed.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.loggedAt)}</TableCell>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell>
                      {row.quantity} {row.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.performedByName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyState icon={Stack} message="No parts logged as used on this unit yet." />
        )}
      </div>

      <LogItemsUsedDialog
        open={logItemsOpen}
        onOpenChange={setLogItemsOpen}
        items={consumableItems}
        log={consumableLog}
        onSubmit={(rows) => {
          for (const row of rows) {
            logConsumableEvent({
              itemId: row.itemId,
              kind: "CONSUMED",
              quantity: row.quantity,
              note: row.note,
              equipmentId: eq.id,
            });
          }
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Breakdowns tab
// ─────────────────────────────────────────────────────────────

function ticketTone(t: Ticket): Tone {
  if (t.status === "CLOSED" || t.status === "RESOLVED") return "success";
  if (t.priority === "CRITICAL" || t.responseOverdue) return "danger";
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
  const recentActivity = useMemo(
    () =>
      buildEquipmentActivityItems(eq.id, [
        "BREAKDOWN_FLAGGED",
        "TICKET_OPENED",
        "TICKET_ASSIGNED",
        "TICKET_RESOLVED",
        "TICKET_CLOSED",
        "STATUS_CHANGED",
      ]),
    [eq.id]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
    <div className="min-w-0 space-y-4">
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
                    {t.responseOverdue && " · Response overdue"}
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

    <Card className="lg:sticky lg:top-8">
      <CardHeader>
        <CardTitle>Recent breakdown activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ActivityFeedList items={recentActivity} emptyText="No breakdown activity recorded yet." />
      </CardContent>
    </Card>
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
          <Field label="Response / resolution time" value={`${contract.responseHours}h / ${contract.resolutionHours}h`} />
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
  const documents = useDemo((s) => s.documents);
  const contracts = contractsFor(eq.id);
  const warranty = contracts.find((c) => c.type === "WARRANTY");
  const amcCmc = contracts.filter((c) => c.type === "AMC" || c.type === "CMC");
  const service = contracts.filter((c) => c.type === "SERVICE");
  const certifications = certificationDocuments(eq.id, documents);
  const generalDocs = generalDocuments(eq.id, documents);
  const [docTab, setDocTab] = useState("documents");

  return (
    <Tabs value={docTab} onValueChange={setDocTab}>
      <TabsList variant="line">
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="warranty">Warranty</TabsTrigger>
        <TabsTrigger value="contracts">AMC / CMC &amp; Service</TabsTrigger>
        <TabsTrigger value="certifications">Certifications</TabsTrigger>
      </TabsList>

      <TabsContent value="documents" className="pt-6">
        <ContractSection title="Documents" icon={Files} action={<AddDocumentDialog equipmentId={eq.id} />}>
          {generalDocs.length > 0 ? (
            <div className="space-y-2">
              {generalDocs.map((doc) => (
                <div key={doc.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPE_LABEL[doc.type]} · {doc.fileSizeKb.toLocaleString("en-IN")} KB · Uploaded {formatDate(doc.uploadedAt)}
                    {doc.expiryDate && ` · Expires ${formatDate(doc.expiryDate)}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Files} message="No documents on file for this unit yet." />
          )}
        </ContractSection>
      </TabsContent>

      <TabsContent value="warranty" className="pt-6">
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
      </TabsContent>

      <TabsContent value="contracts" className="space-y-6 pt-6">
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
      </TabsContent>

      <TabsContent value="certifications" className="pt-6">
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
      </TabsContent>
    </Tabs>
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
                    <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <ActivityIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="text-sm">{e.summary}</p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                        {e.actorSystem ? "System" : getUser(e.actorUserId ?? "")?.name ?? "Unknown"} · {formatTime(e.occurredAt)}
                      </span>
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

// Every tab panel is at least a viewport tall, so a short tab never shrinks
// the page out from under the reader's scroll position (the browser would
// otherwise clamp it — the "jumps back to the top" effect).
const TAB_PANEL_CLASS = "min-h-[calc(100svh-4rem)] pt-6";

function EquipmentProfileContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialTab: TabValue = searchParams.get("tab") === "contracts" ? "contracts" : "overview";
  const certModalOpen = searchParams.get("certModal") === "open";

  const eq = useDemo((s) => s.equipment.find((e) => e.id === id));
  const movementRequests = useDemo((s) => s.movementRequests);
  const confirmMovementReturn = useDemo((s) => s.confirmMovementReturn);
  const liveTickets = useDemo((s) => s.tickets);
  const livePmSchedules = useDemo((s) => s.pmSchedules);
  const liveCalibrationRecords = useDemo((s) => s.calibrationRecords);
  const flagsCtx: FlagsContext = { tickets: liveTickets, pmSchedules: livePmSchedules, calibrationRecords: liveCalibrationRecords };
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Switching tabs keeps the reader where they are. If they'd scrolled past
  // the tab bar, bring it back to the top of the view so the new tab starts
  // there — never jump all the way up to the header.
  function changeTab(tab: TabValue) {
    setActiveTab(tab);
    const tabsEl = tabsRef.current;
    const scroller = tabsEl?.closest<HTMLElement>("[data-scroll-root]") ?? null;
    if (!tabsEl || !scroller) return;
    const tabsTop = tabsEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    if (tabsTop < 0) {
      requestAnimationFrame(() => {
        scroller.scrollTop += tabsEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      });
    }
  }

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

      <EquipmentHeader eq={eq} ctx={flagsCtx} />
      <StatusBanner eq={eq} onViewTab={changeTab} ctx={flagsCtx} />
      <AlertChips eq={eq} onViewTab={changeTab} ctx={flagsCtx} />

      <Tabs ref={tabsRef} value={activeTab} onValueChange={(v) => changeTab(v as TabValue)}>
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
          <TabsTrigger value="accessories">Accessories</TabsTrigger>
          <TabsTrigger value="contracts">Documents</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className={TAB_PANEL_CLASS}>
          <OverviewPanel
            eq={eq}
            onViewTab={changeTab}
            movementRequests={movementRequests}
            confirmMovementReturn={confirmMovementReturn}
          />
        </TabsContent>
        <TabsContent value="maintenance" className={TAB_PANEL_CLASS}>
          <MaintenancePanel eq={eq} />
        </TabsContent>
        <TabsContent value="breakdowns" className={TAB_PANEL_CLASS}>
          <BreakdownsPanel eq={eq} />
        </TabsContent>
        <TabsContent value="accessories" className={TAB_PANEL_CLASS}>
          <AccessoriesPanel eq={eq} />
        </TabsContent>
        <TabsContent value="contracts" className={TAB_PANEL_CLASS}>
          <ContractsPanel eq={eq} certModalOpen={certModalOpen} />
        </TabsContent>
        <TabsContent value="sessions" className={TAB_PANEL_CLASS}>
          <SessionsPanel eq={eq} />
        </TabsContent>
        <TabsContent value="activity" className={TAB_PANEL_CLASS}>
          <ActivityPanel eq={eq} />
        </TabsContent>
      </Tabs>
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
