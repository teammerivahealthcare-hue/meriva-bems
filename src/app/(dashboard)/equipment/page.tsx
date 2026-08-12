"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MagnifyingGlass,
  DotsThreeVertical,
  ShieldCheck,
  Certificate,
  Buildings,
  Tag,
  ShieldWarning,
  Factory,
  Stairs,
  SortAscending,
  X,
  DownloadSimple,
  Stack,
  Clock,
  CalendarBlank,
  Plus,
  Gauge,
  Eye,
  DotsSixVertical,
  ArrowCounterClockwise,
  type Icon,
} from "@phosphor-icons/react";
import {
  useDemo,
  equipmentName,
  categoryName,
  getDepartment,
  getRoom,
  getUser,
  getModel,
  computeFlags,
  operatingHoursSummary,
  pmScheduleFor,
  ageYears,
  equipmentStatusKey,
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_BADGE_CLASS,
  CRITICALITY_LABEL,
  CRITICALITY_BADGE_CLASS,
  docsCompletion,
  certificationDocuments,
  expiryStatus,
  lastServicedAt,
  formatDate,
  daysUntil,
  now,
  departments,
  categories,
  manufacturers,
  rooms,
  equipmentLocationInfo,
  type Equipment,
  type EquipmentStatusKey,
  type EquipmentLocationStatus,
  type Criticality,
  type Contract,
} from "@/lib/bems";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { EquipmentStatusChart, type EquipmentStatusDatum } from "@/components/equipment-status-chart";
import { ComplianceCard } from "@/components/compliance-card";
import { SummaryCard } from "@/components/summary-card";
import { Pagination } from "@/components/pagination";
import { MgpsSystemPanel } from "@/components/mgps-system-panel";
import { InventoryPanel } from "@/components/inventory-panel";

const ALL = "ALL";

type WarrantyStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "NONE";

const WARRANTY_LABEL: Record<WarrantyStatus, string> = {
  ACTIVE: "Active",
  EXPIRING: "Expiring soon",
  EXPIRED: "Expired",
  NONE: "No warranty on file",
};

// Only IN_TRANSIT and TEMPORARY get a badge — PERMANENT is just "wherever
// the equipment record says it is", indistinguishable from never having moved.
const LOCATION_STATUS_BADGE_CLASS: Partial<Record<EquipmentLocationStatus, string>> = {
  IN_TRANSIT: "bg-sky-50 text-sky-700 border-sky-200",
  TEMPORARY: "bg-amber-50 text-amber-800 border-amber-200",
};

const WARRANTY_ALERT_WINDOW_DAYS = 90;
const WARRANTY_SOON_METRIC_DAYS = 30;
// Matches the "warning"/"danger" cutoff in remainingBudgetTone below, so the
// summary card lines up with which rows the list view highlights.
const USAGE_HOURS_NEAR_LIMIT_PCT = 80;

// Frozen leading columns — stay put while the table scrolls horizontally.
// Widths must match between TableHead and TableCell for the columns to
// line up, hence the shared constants rather than repeating literals.
// max-w pins these to an exact pixel width — without it, the table's auto
// layout can recompute (and visibly shrink/grow) these sticky columns as
// different rows scroll into view.
// 150px comfortably fits the longest asset IDs in use (e.g. "SMH/NICU/0002",
// 13 chars) without truncating — narrower widths were clipping real IDs.
const ASSET_COL_CLASS = "sticky left-0 z-10 w-[150px] min-w-[150px] max-w-[150px]";
const EQUIPMENT_COL_CLASS = "sticky left-[150px] z-10 w-[200px] min-w-[200px] max-w-[200px] border-r border-border";

// Customizable columns — everything except Asset ID/Equipment (frozen,
// always first) and the row-actions column (always last). Order here is
// the default order and what "Reset" restores.
type EquipmentColumnKey =
  | "category" | "criticality" | "manufacturer" | "department" | "owner"
  | "warranty" | "usageHours" | "certifications" | "status" | "docs"
  | "lastServiced" | "floorSection";

const COLUMN_LABELS: Record<EquipmentColumnKey, string> = {
  category: "Category",
  criticality: "Criticality",
  manufacturer: "Manufacturer",
  department: "Department",
  owner: "Owner",
  warranty: "Warranty Exp.",
  usageHours: "Usage hours",
  certifications: "Certifications",
  status: "Status",
  docs: "Docs",
  lastServiced: "Last serviced",
  floorSection: "Floor/Section",
};

const DEFAULT_COLUMN_ORDER = Object.keys(COLUMN_LABELS) as EquipmentColumnKey[];

const CERT_WINDOW_OPTIONS: { value: string; label: string }[] = [
  { value: "30", label: "Within 30 days" },
  { value: "60", label: "Within 60 days" },
  { value: "90", label: "Within 90 days" },
];

// Filter chips: white/outlined when unset, neutral-200 with a "Label: Value"
// caption and a clear (X) button once a value is picked.
function filterChipClass(active: boolean): string {
  return cn(
    "h-9 gap-1.5 rounded-lg border pl-2.5 pr-3 text-sm leading-none shadow-none",
    active
      ? "border-transparent bg-neutral-200 pr-7 text-foreground hover:bg-neutral-300 [&>svg:last-child]:hidden"
      : "border-border bg-white text-foreground/80 hover:bg-muted"
  );
}

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  icon: Icon;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  allLabel: string;
}

function FilterSelect({ icon: IconCmp, label, value, onValueChange, options, allLabel }: FilterSelectProps) {
  const active = value !== ALL;
  const activeLabel = options.find((o) => o.value === value)?.label;

  return (
    <div className="relative">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={filterChipClass(active)}>
          <IconCmp size={14} className="text-muted-foreground" />
          {active ? (
            <span className="truncate">
              {label}: <span className="font-medium">{activeLabel}</span>
            </span>
          ) : (
            <span>{label}</span>
          )}
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <button
          type="button"
          aria-label={`Clear ${label} filter`}
          onClick={(e) => {
            e.stopPropagation();
            onValueChange(ALL);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-1.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-black/10 hover:text-foreground"
        >
          <X size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}

// Purchase-date range filter — quick 1/3/6-month presets plus a fully
// custom from/to range, so the window isn't limited to whole months.
const PURCHASE_RANGE_PRESETS: { value: string; label: string }[] = [
  { value: "1", label: "Last 1 month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
];

function todayIso(): string {
  return now().toISOString().slice(0, 10);
}

function monthsAgoIso(n: number): string {
  const d = new Date(now());
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

function warrantyInfo(
  eq: Equipment,
  contracts: Contract[]
): { status: WarrantyStatus; endDate?: string; offsetDays?: number } {
  const contract = contracts
    .filter((c) => c.coveredEquipmentIds.includes(eq.id))
    .find((c) => c.type === "WARRANTY");
  if (!contract) return { status: "NONE" };
  const offsetDays = daysUntil(contract.endDate);
  const status: WarrantyStatus = offsetDays < 0 ? "EXPIRED" : offsetDays <= WARRANTY_ALERT_WINDOW_DAYS ? "EXPIRING" : "ACTIVE";
  return { status, endDate: contract.endDate, offsetDays };
}

// Small consumption bar used for the usage-hours-to-next-PM gauge — green
// while there's plenty of budget left, amber under 20% remaining, red
// under 10%.
type BarTone = "ok" | "warning" | "danger";

const BAR_TONE_INDICATOR_CLASS: Record<BarTone, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

function remainingBudgetTone(pctConsumed: number): BarTone {
  const remaining = 100 - pctConsumed;
  if (remaining < 10) return "danger";
  if (remaining < 20) return "warning";
  return "ok";
}

function MiniBar({ pct, tone }: { pct: number; tone: BarTone | null }) {
  return (
    <Progress
      value={pct}
      className="h-1.5 w-16"
      indicatorClassName={tone ? BAR_TONE_INDICATOR_CLASS[tone] : "bg-muted-foreground/40"}
    />
  );
}

function docsColorClass(present: number, expected: number): string {
  if (present >= expected) return "text-emerald-700";
  if (present > 0) return "text-amber-700";
  return "text-red-700";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** The "⋮" trigger in the table's trailing header cell — drag to reorder columns, checkbox to show/hide. */
function ColumnManagerPopover({
  columnOrder,
  hiddenColumns,
  onToggle,
  onMove,
  onReset,
}: {
  columnOrder: EquipmentColumnKey[];
  hiddenColumns: Set<EquipmentColumnKey>;
  onToggle: (key: EquipmentColumnKey) => void;
  onMove: (key: EquipmentColumnKey, overKey: EquipmentColumnKey) => void;
  onReset: () => void;
}) {
  const [draggedKey, setDraggedKey] = useState<EquipmentColumnKey | null>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <DotsThreeVertical />
          <span className="sr-only">Edit columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Edit columns</p>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={onReset}>
            <ArrowCounterClockwise size={12} /> Reset
          </Button>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {columnOrder.map((key) => (
            <li
              key={key}
              draggable
              onDragStart={() => setDraggedKey(key)}
              onDragEnd={() => setDraggedKey(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedKey) onMove(draggedKey, key);
                setDraggedKey(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm",
                draggedKey === key && "opacity-40"
              )}
            >
              <DotsSixVertical size={14} className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
              <label className="flex flex-1 items-center gap-2">
                <Checkbox
                  checked={!hiddenColumns.has(key)}
                  onCheckedChange={() => onToggle(key)}
                />
                <span className="flex-1">{COLUMN_LABELS[key]}</span>
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function EquipmentContent() {
  const searchParams = useSearchParams();
  const equipment = useDemo((s) => s.equipment);
  const contracts = useDemo((s) => s.contracts);
  const documents = useDemo((s) => s.documents);
  const movementRequests = useDemo((s) => s.movementRequests);
  const resetAddForm = useDemo((s) => s.resetAddForm);

  const [section, setSection] = useState(() => {
    const s = searchParams.get("section");
    return s === "mgps" || s === "inventory" ? s : "equipment";
  });
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [category, setCategory] = useState(searchParams.get("category") ?? ALL);
  const [criticality, setCriticality] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [warranty, setWarranty] = useState(ALL);
  const [certWindow, setCertWindow] = useState(ALL);
  const [manufacturer, setManufacturer] = useState(ALL);
  const [floor, setFloor] = useState(ALL);
  const [purchaseRangeMode, setPurchaseRangeMode] = useState(ALL);
  const [purchaseFrom, setPurchaseFrom] = useState("");
  const [purchaseTo, setPurchaseTo] = useState("");

  function setPurchaseRange(mode: string, from: string, to: string) {
    setPurchaseRangeMode(mode);
    setPurchaseFrom(from);
    setPurchaseTo(to);
  }

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // "More filters" dialog — sort is a visual shell for now (not wired into
  // `filtered`); manufacturer/floor are the real, already-working filters.
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortOption, setSortOption] = useState("Default");
  const [showCondemned, setShowCondemned] = useState(true);

  // "Export data" dialog — visual shell only, no file is actually generated.
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"all" | "filtered">("filtered");
  const [exportFileTypes, setExportFileTypes] = useState({ xlsx: true, csv: false, pdf: true });
  const [exportFileName, setExportFileName] = useState("equipment.xlsx");

  // Column manager — order and visibility for the customizable columns
  // (Asset ID/Equipment/row-actions are frozen and always shown).
  const [columnOrder, setColumnOrder] = useState<EquipmentColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<Set<EquipmentColumnKey>>(new Set());
  const visibleColumns = columnOrder.filter((k) => !hiddenColumns.has(k));

  function toggleColumnVisibility(key: EquipmentColumnKey) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function moveColumn(key: EquipmentColumnKey, overKey: EquipmentColumnKey) {
    if (key === overKey) return;
    setColumnOrder((prev) => {
      const next = prev.filter((k) => k !== key);
      const overIndex = next.indexOf(overKey);
      next.splice(overIndex, 0, key);
      return next;
    });
  }

  function resetColumns() {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setHiddenColumns(new Set());
  }

  const floors = useMemo(() => Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment.filter((eq) => {
      if (q && !equipmentName(eq).toLowerCase().includes(q) && !eq.assetId.toLowerCase().includes(q)) return false;
      if (department !== ALL && eq.departmentId !== department) return false;
      const model = getModel(eq.equipmentModelId);
      if (category !== ALL && model?.categoryId !== category) return false;
      if (criticality !== ALL && eq.criticality !== criticality) return false;
      if (status !== ALL && equipmentStatusKey(eq) !== status) return false;
      if (!showCondemned && equipmentStatusKey(eq) === "condemned") return false;
      if (warranty !== ALL && warrantyInfo(eq, contracts).status !== warranty) return false;
      if (certWindow !== ALL) {
        const windowDays = Number(certWindow);
        const hasMatchingCert = certificationDocuments(eq.id, documents).some(
          (doc) => daysUntil(doc.expiryDate) <= windowDays
        );
        if (!hasMatchingCert) return false;
      }
      if (manufacturer !== ALL && model?.manufacturerId !== manufacturer) return false;
      const room = getRoom(eq.roomId);
      if (floor !== ALL && String(room?.floor) !== floor) return false;
      if (purchaseRangeMode !== ALL) {
        const from = purchaseRangeMode === "CUSTOM" ? purchaseFrom : monthsAgoIso(Number(purchaseRangeMode));
        const to = purchaseRangeMode === "CUSTOM" ? purchaseTo : todayIso();
        if (from && eq.dateOfPurchase < from) return false;
        if (to && eq.dateOfPurchase > to) return false;
      }
      return true;
    });
  }, [
    equipment,
    contracts,
    documents,
    search,
    department,
    category,
    criticality,
    status,
    showCondemned,
    warranty,
    certWindow,
    manufacturer,
    floor,
    purchaseRangeMode,
    purchaseFrom,
    purchaseTo,
  ]);

  // Clamp rather than reset-via-effect: if a filter shrinks the result set
  // below the page the user was on, fall back to the last valid page.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    department !== ALL ||
    category !== ALL ||
    criticality !== ALL ||
    status !== ALL ||
    !showCondemned ||
    warranty !== ALL ||
    certWindow !== ALL ||
    manufacturer !== ALL ||
    floor !== ALL ||
    purchaseRangeMode !== ALL;

  function clearFilters() {
    setSearch("");
    setDepartment(ALL);
    setCategory(ALL);
    setCriticality(ALL);
    setStatus(ALL);
    setShowCondemned(true);
    setWarranty(ALL);
    setCertWindow(ALL);
    setManufacturer(ALL);
    setFloor(ALL);
    setPurchaseRange(ALL, "", "");
  }

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (department !== ALL) chips.push(`Department: ${departments.find((d) => d.id === department)?.name ?? department}`);
    if (category !== ALL) chips.push(`Category: ${categories.find((c) => c.id === category)?.name ?? category}`);
    if (criticality !== ALL) chips.push(`Criticality: ${CRITICALITY_LABEL[criticality as Criticality]}`);
    if (status !== ALL) chips.push(`Status: ${EQUIPMENT_STATUS_LABEL[status as EquipmentStatusKey]}`);
    if (!showCondemned) chips.push("Condemned: hidden");
    if (warranty !== ALL) chips.push(`Warranty: ${WARRANTY_LABEL[warranty as WarrantyStatus]}`);
    if (certWindow !== ALL) chips.push(`Certifications: ${CERT_WINDOW_OPTIONS.find((o) => o.value === certWindow)?.label ?? certWindow}`);
    if (manufacturer !== ALL) chips.push(`Manufacturer: ${manufacturers.find((m) => m.id === manufacturer)?.name ?? manufacturer}`);
    if (floor !== ALL) chips.push(`Floor: ${floor}`);
    if (purchaseRangeMode !== ALL) {
      const label =
        purchaseRangeMode === "CUSTOM"
          ? `${formatDate(purchaseFrom)} – ${formatDate(purchaseTo)}`
          : PURCHASE_RANGE_PRESETS.find((p) => p.value === purchaseRangeMode)?.label;
      chips.push(`Purchase date: ${label}`);
    }
    return chips;
  }, [department, category, criticality, status, showCondemned, warranty, certWindow, manufacturer, floor, purchaseRangeMode, purchaseFrom, purchaseTo]);

  const statusBreakdown: EquipmentStatusDatum[] = useMemo(() => {
    const tally: Record<EquipmentStatusKey, number> = {
      operational: 0,
      attention: 0,
      maintenance: 0,
      down: 0,
      condemned: 0,
    };
    for (const eq of filtered) tally[equipmentStatusKey(eq)]++;
    return (Object.keys(tally) as EquipmentStatusKey[]).map((key) => ({ key, value: tally[key] }));
  }, [filtered]);

  const compliance = useMemo(() => {
    const total = filtered.length || 1;
    const onSchedule = filtered.filter((eq) => !computeFlags(eq).includes("PM_OVERDUE")).length;
    const docsTotals = filtered.reduce(
      (acc, eq) => {
        const d = docsCompletion(eq, documents);
        acc.present += d.present;
        acc.expected += d.expected;
        return acc;
      },
      { present: 0, expected: 0 }
    );
    const warrantyActiveCount = filtered.filter((eq) => {
      const s = warrantyInfo(eq, contracts).status;
      return s === "ACTIVE" || s === "EXPIRING";
    }).length;

    const ages = filtered.map((eq) => ageYears(eq));
    const avgAgeYears = ages.length > 0 ? ages.reduce((sum, a) => sum + a, 0) / ages.length : 0;
    const withinServiceLifeCount = filtered.filter((eq) => {
      const model = getModel(eq.equipmentModelId);
      return model ? ageYears(eq) <= model.expectedServiceLifeYears : true;
    }).length;

    return {
      pmPct: Math.round((onSchedule / total) * 100),
      onSchedule,
      total: filtered.length,
      docsPct: docsTotals.expected > 0 ? Math.round((docsTotals.present / docsTotals.expected) * 100) : 100,
      docsFraction: `${docsTotals.present}/${docsTotals.expected}`,
      warrantyPct: Math.round((warrantyActiveCount / total) * 100),
      warrantyFraction: `${warrantyActiveCount}/${filtered.length}`,
      agePct: Math.round((withinServiceLifeCount / total) * 100),
      avgAgeYears,
    };
  }, [filtered, contracts, documents]);

  const nearUsageLimitCount = useMemo(
    () =>
      filtered.filter((eq) => {
        const pct = operatingHoursSummary(eq).hoursTriggerPct;
        return pct != null && pct >= USAGE_HOURS_NEAR_LIMIT_PCT;
      }).length,
    [filtered]
  );
  const warrantySoonCount = useMemo(
    () =>
      filtered.filter((eq) => {
        const info = warrantyInfo(eq, contracts);
        return info.offsetDays !== undefined && info.offsetDays >= 0 && info.offsetDays <= WARRANTY_SOON_METRIC_DAYS;
      }).length,
    [filtered, contracts]
  );
  const metricCards = [
    {
      key: "total",
      title: "Total equipment",
      value: String(filtered.length),
      icon: Stack,
      iconColor: "blue" as const,
      changeDirection: "positive" as const,
      footerLeadText: String(equipment.length),
      footerText: "in full fleet",
    },
    {
      key: "nearUsageLimit",
      title: "Nearing usage limit",
      value: String(nearUsageLimitCount),
      icon: Gauge,
      iconColor: "cyan" as const,
      changeDirection: nearUsageLimitCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(nearUsageLimitCount),
      footerText: `within ${100 - USAGE_HOURS_NEAR_LIMIT_PCT}% of hours-based PM`,
    },
    {
      key: "warrantySoon",
      title: "Warranty expiring soon",
      value: String(warrantySoonCount),
      icon: Clock,
      iconColor: "indigo" as const,
      changeDirection: warrantySoonCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(warrantySoonCount),
      footerText: `within ${WARRANTY_SOON_METRIC_DAYS} days`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Equipment</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {equipment.length} equipment records
          </p>
        </div>
        <Button asChild className="h-9 gap-1.5">
          <Link href="/equipment/add" onClick={() => resetAddForm()}>
            <Plus size={16} /> Add equipment
          </Link>
        </Button>
      </div>

      <Tabs value={section} onValueChange={setSection}>
        <TabsList variant="line">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="mgps">MGPS System</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-6 pt-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fleet status</CardTitle>
            <CardDescription>Filtered equipment by status</CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentStatusChart data={statusBreakdown} />
          </CardContent>
        </Card>

        <ComplianceCard
          headline="PM on schedule"
          pct={compliance.pmPct}
          fraction={`${compliance.onSchedule} on schedule`}
          totalLabel={`${compliance.total} total`}
          metrics={[
            {
              label: "Documentation completeness",
              value: `${compliance.docsFraction} · ${compliance.docsPct}%`,
              pct: compliance.docsPct,
            },
            {
              label: "Warranty active",
              value: `${compliance.warrantyFraction} · ${compliance.warrantyPct}%`,
              pct: compliance.warrantyPct,
            },
            {
              label: "Equipment age",
              value: `${compliance.avgAgeYears.toFixed(1)} yrs avg · ${compliance.agePct}%`,
              pct: compliance.agePct,
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metricCards.map((card) => (
          <SummaryCard
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            changeDirection={card.changeDirection}
            footerLeadText={card.footerLeadText}
            footerText={card.footerText}
            showChevron={false}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment"
            className="h-9 bg-white pl-8"
          />
        </div>

        <FilterSelect
          icon={ShieldWarning}
          label="Status"
          value={status}
          onValueChange={setStatus}
          allLabel="All statuses"
          options={(Object.keys(EQUIPMENT_STATUS_LABEL) as EquipmentStatusKey[]).map((s) => ({
            value: s,
            label: EQUIPMENT_STATUS_LABEL[s],
          }))}
        />

        <FilterSelect
          icon={SortAscending}
          label="Warranty exp."
          value={warranty}
          onValueChange={setWarranty}
          allLabel="All warranty"
          options={(Object.keys(WARRANTY_LABEL) as WarrantyStatus[]).map((w) => ({
            value: w,
            label: WARRANTY_LABEL[w],
          }))}
        />

        <FilterSelect
          icon={Certificate}
          label="Certifications"
          value={certWindow}
          onValueChange={setCertWindow}
          allLabel="All certifications"
          options={CERT_WINDOW_OPTIONS}
        />

        <FilterSelect
          icon={Buildings}
          label="Department"
          value={department}
          onValueChange={setDepartment}
          allLabel="All departments"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
        />

        <Dialog open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
          <DialogContent
            showCloseButton
            className="flex max-h-[calc(100vh-4rem)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          >
            <DialogHeader className="border-b px-5 py-4">
              <DialogTitle>More filters</DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground">Filters</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Factory size={16} className="text-muted-foreground" />
                    Manufacturer
                  </span>
                  <Select value={manufacturer} onValueChange={setManufacturer}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All manufacturers</SelectItem>
                      {manufacturers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Tag size={16} className="text-muted-foreground" />
                    Category
                  </span>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck size={16} className="text-muted-foreground" />
                    Criticality
                  </span>
                  <Select value={criticality} onValueChange={setCriticality}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All criticalities</SelectItem>
                      {(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {CRITICALITY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Stairs size={16} className="text-muted-foreground" />
                    Floor
                  </span>
                  <Select value={floor} onValueChange={setFloor}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All floors</SelectItem>
                      {floors.map((f) => (
                        <SelectItem key={f} value={String(f)}>
                          Floor {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <p className="text-xs font-medium text-muted-foreground">Purchase date</p>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {PURCHASE_RANGE_PRESETS.map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      size="sm"
                      variant={purchaseRangeMode === p.value ? "default" : "outline"}
                      className="h-7 rounded-full text-xs"
                      onClick={() => setPurchaseRange(p.value, "", "")}
                    >
                      {p.label}
                    </Button>
                  ))}
                  {purchaseRangeMode !== ALL && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setPurchaseRange(ALL, "", "")}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CalendarBlank size={16} className="shrink-0 text-muted-foreground" />
                  <input
                    type="date"
                    value={purchaseFrom}
                    max={purchaseTo || todayIso()}
                    onChange={(e) => setPurchaseRange("CUSTOM", e.target.value, purchaseTo)}
                    className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={purchaseTo}
                    min={purchaseFrom}
                    max={todayIso()}
                    onChange={(e) => setPurchaseRange("CUSTOM", purchaseFrom, e.target.value)}
                    className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              <Separator />

              <p className="text-xs font-medium text-muted-foreground">Sort</p>
              <div className="flex items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <SortAscending size={16} className="text-muted-foreground" />
                  Last service
                </span>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Default">Default</SelectItem>
                    <SelectItem value="Newest">Newest first</SelectItem>
                    <SelectItem value="Oldest">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <p className="text-xs font-medium text-muted-foreground">Visibility</p>
              <label className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Eye size={16} className="text-muted-foreground" />
                  Show condemned equipment
                </span>
                <Checkbox checked={showCondemned} onCheckedChange={(v) => setShowCondemned(v === true)} />
              </label>
            </div>
            <DialogFooter className="rounded-b-none p-8">
              <Button
                variant="outline"
                onClick={() => {
                  setManufacturer(ALL);
                  setCategory(ALL);
                  setCriticality(ALL);
                  setFloor(ALL);
                  setPurchaseRange(ALL, "", "");
                  setSortOption("Default");
                  setShowCondemned(true);
                }}
              >
                Reset all
              </Button>
              <Button onClick={() => setMoreFiltersOpen(false)}>Apply filter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 rounded-full text-foreground/80 hover:bg-muted"
          onClick={() => setMoreFiltersOpen(true)}
        >
          More filters
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent showCloseButton className="w-full max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
            <DialogHeader className="border-b px-5 py-4">
              <DialogTitle>Export data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Equipment selected</p>
                  <p className="text-sm font-semibold">
                    {exportScope === "all" ? equipment.length : filtered.length} units
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active filters</p>
                  <p className="text-sm font-semibold">{activeFilterChips.length} filters</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">File type</p>
                  <p className="text-sm font-semibold">
                    {Object.entries(exportFileTypes)
                      .filter(([, v]) => v)
                      .map(([k]) => `.${k}`)
                      .join(", ") || "None"}
                  </p>
                </div>
              </div>

              {activeFilterChips.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm text-muted-foreground">Active filters</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeFilterChips.map((chip) => (
                      <Badge key={chip} variant="outline" className="rounded-full">
                        {chip}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-sm text-muted-foreground">Export Scope</p>
                <RadioGroup value={exportScope} onValueChange={(v) => setExportScope(v as "all" | "filtered")}>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="all" /> Export all equipment
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="filtered" /> Export current filtered results
                  </label>
                </RadioGroup>
              </div>

              <div>
                <p className="mb-1.5 text-sm text-muted-foreground">File type</p>
                <div className="flex flex-wrap gap-4">
                  {(["xlsx", "csv", "pdf"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={exportFileTypes[key]}
                        onCheckedChange={(value) =>
                          setExportFileTypes((prev) => ({ ...prev, [key]: Boolean(value) }))
                        }
                        className="data-checked:border-success data-checked:bg-success"
                      />
                      {key === "xlsx" ? "Excel (.xlsx)" : key === "csv" ? "CSV (.csv)" : "PDF Report (.pdf)"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-sm text-muted-foreground">File name</p>
                <Input value={exportFileName} onChange={(e) => setExportFileName(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="rounded-b-none p-8">
              <Button variant="outline" onClick={() => setExportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setExportOpen(false)}>
                <DownloadSimple /> Download data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          size="sm"
          className="ml-auto h-9 gap-1.5"
          onClick={() => setExportOpen(true)}
        >
          <DownloadSimple size={14} /> Export data
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={ASSET_COL_CLASS}>Asset ID</TableHead>
              <TableHead className={EQUIPMENT_COL_CLASS}>Equipment</TableHead>
              {visibleColumns.map((key) => (
                <TableHead key={key}>{COLUMN_LABELS[key]}</TableHead>
              ))}
              <TableHead className="w-8 text-right">
                <ColumnManagerPopover
                  columnOrder={columnOrder}
                  hiddenColumns={hiddenColumns}
                  onToggle={toggleColumnVisibility}
                  onMove={moveColumn}
                  onReset={resetColumns}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((eq) => {
              const model = getModel(eq.equipmentModelId);
              const mfr = manufacturers.find((m) => m.id === model?.manufacturerId);
              const dept = getDepartment(eq.departmentId);
              const room = getRoom(eq.roomId);
              const locationInfo = equipmentLocationInfo(eq, movementRequests);
              const owner = getUser(eq.responsibleUserId);
              const warr = warrantyInfo(eq, contracts);
              const hoursOp = operatingHoursSummary(eq);
              const pm = pmScheduleFor(eq.id);
              const certDocs = certificationDocuments(eq.id, documents);
              const certStatus = certDocs.length > 0 ? expiryStatus(certDocs[0].expiryDate).status : null;
              const statusKey = equipmentStatusKey(eq);
              const docs = docsCompletion(eq, documents);
              const serviced = lastServicedAt(eq);

              const cellsByKey: Record<EquipmentColumnKey, ReactNode> = {
                category: categoryName(eq),
                criticality: (
                  <Badge variant="outline" className={CRITICALITY_BADGE_CLASS[eq.criticality]}>
                    {CRITICALITY_LABEL[eq.criticality]}
                  </Badge>
                ),
                manufacturer: mfr?.name ?? "—",
                department: dept?.name ?? "—",
                owner: owner ? (
                  <span className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(owner.name)}</AvatarFallback>
                    </Avatar>
                    {owner.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                ),
                warranty:
                  warr.status === "NONE" ? (
                    <span className="text-muted-foreground">No warranty on file</span>
                  ) : (
                    <div>
                      <p>{formatDate(warr.endDate!)}</p>
                      <p className={warr.status === "EXPIRED" ? "text-xs text-red-600" : warr.status === "EXPIRING" ? "text-xs text-amber-700" : "text-xs text-muted-foreground"}>
                        {warr.status === "EXPIRED"
                          ? `Expired ${Math.abs(warr.offsetDays!)} days ago`
                          : `Expires in ${warr.offsetDays} days`}
                      </p>
                    </div>
                  ),
                usageHours:
                  hoursOp.hoursTriggerPct != null ? (
                    <div className="w-28">
                      <p className="text-xs text-muted-foreground">
                        {hoursOp.cumulativeHours.toLocaleString("en-IN")}/{pm?.nextDueHours?.toLocaleString("en-IN")} hrs · {hoursOp.hoursTriggerPct}%
                      </p>
                      <MiniBar pct={hoursOp.hoursTriggerPct} tone={remainingBudgetTone(hoursOp.hoursTriggerPct)} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
                certifications:
                  certDocs.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/equipment/${eq.id}?tab=contracts&certModal=open`}
                          className={cn(
                            "font-medium hover:underline",
                            certStatus === "EXPIRED"
                              ? "text-red-600"
                              : certStatus === "EXPIRING"
                                ? "text-amber-600"
                                : "text-emerald-600"
                          )}
                        >
                          {certDocs.length} certification{certDocs.length === 1 ? "" : "s"}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          {certDocs.map((doc) => {
                            const s = expiryStatus(doc.expiryDate);
                            return (
                              <p key={doc.id}>
                                {doc.label ?? doc.fileName} —{" "}
                                {s.status === "EXPIRED" ? `expired ${Math.abs(s.offsetDays)}d ago` : `${s.offsetDays}d left`}
                              </p>
                            );
                          })}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ),
                status: (
                  <Badge variant="outline" className={EQUIPMENT_STATUS_BADGE_CLASS[statusKey]}>
                    {EQUIPMENT_STATUS_LABEL[statusKey]}
                  </Badge>
                ),
                docs: (
                  <span className={`font-medium tabular-nums ${docsColorClass(docs.present, docs.expected)}`}>
                    {docs.present}/{docs.expected}
                  </span>
                ),
                lastServiced: serviced ? formatDate(serviced) : "Never serviced",
                floorSection: (
                  <div className="space-y-1">
                    <p>{room ? `Floor ${room.floor} · ${room.name}` : "—"}</p>
                    {locationInfo.status !== "PERMANENT" && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", LOCATION_STATUS_BADGE_CLASS[locationInfo.status])}
                      >
                        {locationInfo.statusLabel}
                        {locationInfo.detail ? ` · ${locationInfo.detail}` : ""}
                      </Badge>
                    )}
                  </div>
                ),
              };

              return (
                <TableRow key={eq.id} className="group">
                  <TableCell className={cn(ASSET_COL_CLASS, "bg-surface text-muted-foreground group-hover:bg-muted/50")}>
                    <Link href={`/equipment/${eq.id}`} className="block truncate" title={eq.assetId}>
                      {eq.assetId}
                    </Link>
                  </TableCell>
                  <TableCell className={cn(EQUIPMENT_COL_CLASS, "bg-surface group-hover:bg-muted/50")}>
                    <Link href={`/equipment/${eq.id}`} className="block">
                      <p className="truncate font-medium" title={model?.modelName ?? eq.serialNumber}>
                        {model?.modelName ?? eq.serialNumber}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" title={mfr?.name}>
                        {mfr?.name}
                      </p>
                    </Link>
                  </TableCell>
                  {visibleColumns.map((key) => {
                    const isMuted = key === "lastServiced" || key === "floorSection";
                    return (
                      <TableCell key={key} className={isMuted ? "text-muted-foreground" : undefined}>
                        {cellsByKey[key]}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <DotsThreeVertical />
                          <span className="sr-only">Row actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/equipment/${eq.id}`}>View profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                        <DropdownMenuItem disabled variant="destructive">
                          Mark condemned
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No equipment matches these filters.</p>
        ) : (
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={filtered.length}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            className="border-t border-border"
          />
        )}
      </Card>
        </TabsContent>

        <TabsContent value="mgps" className="pt-6">
          <MgpsSystemPanel />
        </TabsContent>

        <TabsContent value="inventory" className="pt-6">
          <InventoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <Suspense fallback={null}>
      <EquipmentContent />
    </Suspense>
  );
}
