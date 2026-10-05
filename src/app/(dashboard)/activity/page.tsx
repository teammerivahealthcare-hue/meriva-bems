"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  addQuarters,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarQuarters,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns";
import {
  Pulse,
  ArrowsLeftRight,
  Wrench,
  Truck,
  CalendarCheck,
  Gauge,
  CalendarBlank,
  ArrowRight,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  CheckCircle,
  WarningCircle,
  ClockCounterClockwise,
  MapPin,
  UserCircle,
  Timer,
  MagnifyingGlass,
  type Icon,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import {
  useDemo,
  now,
  formatDate,
  relativeTimeFromNow,
  eventDotClass,
  getEquipmentById,
  getUser,
  equipmentName,
  getDepartment,
  equipmentStatusKey,
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_DOT_CLASS,
  CRITICALITY_LABEL,
  CRITICALITY_BADGE_CLASS,
  buildLiveOperations,
  buildUpcomingSchedule,
  historyCategory,
  isSettlingEvent,
  isRecentForActivity,
  OPERATION_KIND_LABEL,
  type ActivityEvent,
  type Equipment,
  type LiveOperation,
  type OperationKind,
  type OperationTone,
  type ScheduleItem,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterChips, type FilterChipOption } from "@/components/filter-chips";
import { Pagination } from "@/components/pagination";
import { useUpdatedAgoLabel } from "@/hooks/use-updated-ago";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<OperationKind, Icon> = {
  IN_USE: Pulse,
  MOVING: ArrowsLeftRight,
  INTERNAL_REPAIR: Wrench,
  EXTERNAL_REPAIR: Truck,
  PM: CalendarCheck,
  CALIBRATION: Gauge,
};

const TONE: Record<OperationTone, { chip: string; well: string; icon: Icon }> = {
  progress: { chip: "bg-sky-50 text-sky-700 border-transparent", well: "bg-muted text-muted-foreground", icon: Pulse },
  attention: { chip: "bg-amber-50 text-amber-800 border-transparent", well: "bg-amber-50 text-amber-700", icon: WarningCircle },
  danger: { chip: "bg-red-50 text-red-700 border-transparent", well: "bg-red-50 text-red-600", icon: WarningCircle },
  done: { chip: "bg-emerald-50 text-emerald-700 border-transparent", well: "bg-muted text-muted-foreground", icon: CheckCircle },
};

function shortAssetId(assetId: string): string {
  const parts = assetId.split("/");
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : assetId;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Live
// ─────────────────────────────────────────────────────────────

type LiveFilter = "ALL" | OperationKind | "COMPLETED";

function StatTile({ value, label, active, onClick }: { value: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border bg-surface px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active && "border-foreground/40"
      )}
    >
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </button>
  );
}

function OperationsTable({ items }: { items: LiveOperation[] }) {
  const router = useRouter();
  return (
    <Card className="overflow-hidden p-0 gap-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Asset ID</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Handled by</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((op) => {
            const KindIcon = KIND_ICON[op.kind];
            const tone = TONE[op.tone];
            const ToneIcon = tone.icon;
            const dateOnly = op.startedAt.length <= 10;
            return (
              <TableRow key={op.id} className="cursor-pointer" onClick={() => router.push(`/equipment/${op.equipmentId}`)}>
                <TableCell className="pl-4 text-muted-foreground" title={op.assetId}>
                  {shortAssetId(op.assetId)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/equipment/${op.equipmentId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block font-medium hover:underline"
                  >
                    {op.title}
                  </Link>
                  <p className="max-w-48 truncate text-xs text-muted-foreground">{op.subtitle}</p>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <KindIcon size={16} className="shrink-0 text-muted-foreground" />
                    {OPERATION_KIND_LABEL[op.kind]}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{op.handledBy}</TableCell>
                <TableCell className="text-muted-foreground">{op.department}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", tone.well)}>
                      <CalendarBlank size={14} />
                    </span>
                    {dateOnly || !isRecentForActivity(op.startedAt) ? formatDate(op.startedAt) : formatTime(op.startedAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={tone.chip}>
                    <ToneIcon /> {op.statusLabel}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function LiveTab({ operations }: { operations: LiveOperation[] }) {
  const [filter, setFilter] = useState<LiveFilter>("ALL");
  const live = operations.filter((o) => !o.completed);
  const count = (kind: OperationKind) => live.filter((o) => o.kind === kind).length;
  const completedCount = operations.length - live.length;

  const tiles: { kind: OperationKind; label: string }[] = [
    { kind: "IN_USE", label: "Equipment in use" },
    { kind: "MOVING", label: "Equipment moving" },
    { kind: "INTERNAL_REPAIR", label: "Internal repairs" },
    { kind: "EXTERNAL_REPAIR", label: "External repairs" },
  ];

  const options: FilterChipOption<LiveFilter>[] = [
    { value: "ALL", label: "All", count: live.length },
    { value: "IN_USE", label: "In use", count: count("IN_USE") },
    { value: "MOVING", label: "Equipment moving", count: count("MOVING") },
    { value: "INTERNAL_REPAIR", label: "Internal repair", count: count("INTERNAL_REPAIR") },
    { value: "EXTERNAL_REPAIR", label: "External repair", count: count("EXTERNAL_REPAIR") },
    { value: "PM", label: "Preventive maintenance", count: count("PM") },
    { value: "CALIBRATION", label: "Calibration", count: count("CALIBRATION") },
    { value: "COMPLETED", label: "Completed today", count: completedCount },
  ];

  const items =
    filter === "ALL"
      ? live
      : filter === "COMPLETED"
        ? operations.filter((o) => o.completed)
        : live.filter((o) => o.kind === filter);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <StatTile
            key={t.kind}
            value={count(t.kind)}
            label={t.label}
            active={filter === t.kind}
            onClick={() => setFilter(filter === t.kind ? "ALL" : t.kind)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Active operations</h2>
        <FilterChips label="Filter operations" options={options} value={filter} onChange={setFilter} />
      </div>

      {items.length > 0 ? (
        <OperationsTable items={items} />
      ) : (
        <EmptyState
          icon={filter === "COMPLETED" ? CheckCircle : Pulse}
          message={filter === "COMPLETED" ? "Nothing has finished yet today." : "Nothing in progress here right now."}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Upcoming
// ─────────────────────────────────────────────────────────────

type ScheduleView = "week" | "month" | "quarter";

const SCHEDULE_VIEWS: { value: ScheduleView; label: string; shortcut: string }[] = [
  { value: "week", label: "Week view", shortcut: "W" },
  { value: "month", label: "Month view", shortcut: "M" },
  { value: "quarter", label: "Quarter view", shortcut: "Q" },
];

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFT_PERIOD: Record<ScheduleView, (date: Date, amount: number) => Date> = {
  week: addWeeks,
  month: addMonths,
  quarter: addQuarters,
};
const PERIODS_BETWEEN: Record<ScheduleView, (later: Date, earlier: Date) => number> = {
  week: (later, earlier) => differenceInCalendarWeeks(later, earlier, WEEK_OPTIONS),
  month: differenceInCalendarMonths,
  quarter: differenceInCalendarQuarters,
};

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return localDayKey(new Date(y, m - 1, d + n));
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shortDate(key: string): string {
  return keyToDate(key).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function dayHeading(key: string, todayKey: string): string {
  const date = shortDate(key);
  if (key === todayKey) return `Today, ${date}`;
  if (key === addDays(todayKey, 1)) return `Tomorrow, ${date}`;
  return `${keyToDate(key).toLocaleDateString("en-IN", { weekday: "long" })}, ${date}`;
}

/** "today", "tomorrow", "in 4 days". */
function dueIn(key: string, todayKey: string): string {
  const days = differenceInCalendarDays(keyToDate(key), keyToDate(todayKey));
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function periodBounds(view: ScheduleView, anchor: Date): { start: Date; end: Date } {
  if (view === "week") return { start: startOfWeek(anchor, WEEK_OPTIONS), end: endOfWeek(anchor, WEEK_OPTIONS) };
  if (view === "month") return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  return { start: startOfQuarter(anchor), end: endOfQuarter(anchor) };
}

/** "July 2026", or "Jul – Sep 2026" when the period spans months. */
function periodTitle(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) return format(start, "MMMM yyyy");
  return start.getFullYear() === end.getFullYear()
    ? `${format(start, "MMM")} – ${format(end, "MMM yyyy")}`
    : `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`;
}

function periodRange(start: Date, end: Date): string {
  return `${format(start, start.getFullYear() === end.getFullYear() ? "d MMM" : "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

/** "This week", "Next month", "In 3 quarters" — the stepper's label. */
function relativePeriod(view: ScheduleView, start: Date, today: Date): string {
  const n = PERIODS_BETWEEN[view](start, today);
  if (n === 0) return `This ${view}`;
  if (n === 1) return `Next ${view}`;
  return `In ${n} ${view}s`;
}

function scheduledBy(item: ScheduleItem): string {
  if (item.startsAt) return "Booked work order";
  if (item.kind === "CALIBRATION") return "Calibration certificate expiry";
  if (!item.intervalMonths) return "PM plan";
  return `PM plan, every ${item.intervalMonths} month${item.intervalMonths === 1 ? "" : "s"}`;
}

const SCHEDULE_KIND: Record<ScheduleItem["kind"], { label: string; chip: string; pill: string; dot: string; icon: Icon }> = {
  PM: {
    label: "Preventive maintenance",
    chip: "bg-emerald-50 text-emerald-700 border-transparent",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    icon: CalendarCheck,
  },
  CALIBRATION: {
    label: "Calibration",
    chip: "bg-sky-50 text-sky-700 border-transparent",
    pill: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    dot: "bg-sky-500",
    icon: Gauge,
  },
  INSPECTION: {
    label: "Inspection",
    chip: "bg-violet-50 text-violet-700 border-transparent",
    pill: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
    dot: "bg-violet-500",
    icon: MagnifyingGlass,
  },
};

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function ScheduleCard({ item, onOpen }: { item: ScheduleItem; onOpen: (item: ScheduleItem) => void }) {
  const kind = SCHEDULE_KIND[item.kind];
  const KindIcon = kind.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "grid w-full grid-cols-1 items-center gap-3 rounded-xl border bg-surface px-5 py-4 text-left transition-colors hover:bg-muted/40 sm:grid-cols-[5.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.1fr)]",
        FOCUS_RING
      )}
    >
      <span className={cn("text-sm tabular-nums", item.startsAt ? "font-medium" : "text-muted-foreground")}>
        {item.startsAt ? formatTime(item.startsAt) : "Any time"}
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <KindIcon size={18} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{item.title}</span>
          <span className="block truncate text-sm text-muted-foreground">{item.assetId}</span>
        </span>
      </span>
      <span>
        <Badge variant="outline" className={cn("h-6 px-3", kind.chip)}>
          {kind.label}
        </Badge>
      </span>
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin size={16} className="shrink-0" /> {item.location}
      </span>
      <span className="space-y-0.5 text-sm">
        {item.estimatedMinutes !== undefined && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Timer size={16} className="shrink-0" /> Estimated duration{" "}
            <span className="font-medium text-foreground">{item.estimatedMinutes} mins</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <UserCircle size={16} className="shrink-0 text-muted-foreground" /> {item.assignee}
        </span>
      </span>
    </button>
  );
}

/** Compact calendar chip previewing a month cell's work. */
function SchedulePill({ item }: { item: ScheduleItem }) {
  const kind = SCHEDULE_KIND[item.kind];
  return (
    <span
      title={`${item.title} · ${kind.label} · ${item.location}`}
      className={cn("flex min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-1 text-xs font-medium", kind.pill)}
    >
      <span className="truncate">{item.title}</span>
      {item.startsAt && <span className="ml-auto shrink-0 font-normal tabular-nums opacity-75">{formatTime(item.startsAt)}</span>}
    </span>
  );
}

/** One dot per kind of work due that day. */
function KindDots({ items, className }: { items: ScheduleItem[]; className?: string }) {
  const kinds = [...new Set(items.map((i) => i.kind))];
  return (
    <span className={cn("flex h-1.5 items-center justify-center gap-0.5", className)} aria-hidden>
      {kinds.map((k) => (
        <span key={k} className={cn("size-1.5 rounded-full", SCHEDULE_KIND[k].dot)} />
      ))}
    </span>
  );
}

function KindLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {Object.values(SCHEDULE_KIND).map((k) => (
        <span key={k.label} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", k.dot)} /> {k.label}
        </span>
      ))}
    </div>
  );
}

/** Calendar-page tile for the focused day; the band turns blue on today. */
function FocusTile({ date, isToday }: { date: Date; isToday: boolean }) {
  return (
    <div className="flex w-12 shrink-0 flex-col overflow-hidden rounded-lg border bg-surface text-center shadow-xs" aria-hidden>
      <span
        className={cn(
          "py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
          isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {format(date, "MMM")}
      </span>
      <span className="py-1.5 text-lg font-semibold leading-none tabular-nums">{date.getDate()}</span>
    </div>
  );
}

function ViewMenu({ value, onChange }: { value: ScheduleView; onChange: (view: ScheduleView) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 bg-surface px-3">
          {SCHEDULE_VIEWS.find((v) => v.value === value)?.label}
          <CaretDown size={14} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as ScheduleView)}>
          {SCHEDULE_VIEWS.map((v) => (
            <DropdownMenuRadioItem key={v.value} value={v.value} className="py-1.5">
              {v.label}
              <DropdownMenuShortcut>
                <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium tracking-normal">
                  {v.shortcut}
                </kbd>
              </DropdownMenuShortcut>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NothingScheduled({
  fromKey,
  toKey,
  next,
  onJump,
}: {
  fromKey: string;
  toKey: string;
  next?: ScheduleItem;
  onJump: (key: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Nothing scheduled from {shortDate(fromKey)} to {shortDate(toKey)}.
      </p>
      {next && (
        <Button variant="outline" size="sm" onClick={() => onJump(next.dueDate)}>
          Jump to next: {shortDate(next.dueDate)}
        </Button>
      )}
    </div>
  );
}

// Week ─────────────────────────────────────────────────────────

function WeekView({
  start,
  end,
  selected,
  todayKey,
  byDay,
  onSelect,
  onOpenItem,
  empty,
}: {
  start: Date;
  end: Date;
  selected: string;
  todayKey: string;
  byDay: Map<string, ScheduleItem[]>;
  onSelect: (key: string) => void;
  onOpenItem: (item: ScheduleItem) => void;
  empty: React.ReactNode;
}) {
  const days = eachDayOfInterval({ start, end }).map(localDayKey);
  const groups = days.filter((key) => key >= selected && byDay.has(key));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-7 gap-1 rounded-xl bg-muted p-1.5">
        {days.map((key) => {
          const date = keyToDate(key);
          const items = byDay.get(key) ?? [];
          const active = key === selected;
          const past = key < todayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              aria-pressed={active}
              aria-label={`${format(date, "EEEE, d MMMM")}, ${items.length} scheduled`}
              onClick={() => onSelect(key)}
              className={cn(
                "flex flex-col items-center rounded-lg py-2 transition-colors",
                FOCUS_RING,
                active ? "bg-surface shadow-sm" : !past && "hover:bg-surface/60",
                past ? "text-muted-foreground/40" : !active && items.length === 0 && "text-muted-foreground/60"
              )}
            >
              <span className="text-xs font-medium">{format(date, "EEE")}</span>
              <span className={cn("text-lg font-semibold tabular-nums", key === todayKey && "text-primary")}>{date.getDate()}</span>
              <KindDots items={items} className="mt-0.5" />
            </button>
          );
        })}
      </div>

      {groups.length > 0
        ? groups.map((key) => (
            <section key={key} className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{dayHeading(key, todayKey)}</h3>
              {byDay.get(key)!.map((item) => (
                <ScheduleCard key={item.id} item={item} onOpen={onOpenItem} />
              ))}
            </section>
          ))
        : empty}
    </div>
  );
}

// Month ────────────────────────────────────────────────────────

const MONTH_DAY_MAX_PILLS = 3;

function MonthDay({
  date,
  items,
  todayKey,
  outside,
  lastCol,
  lastRow,
  onOpenDay,
}: {
  date: Date;
  items: ScheduleItem[];
  todayKey: string;
  outside: boolean;
  lastCol: boolean;
  lastRow: boolean;
  onOpenDay: (key: string) => void;
}) {
  const key = localDayKey(date);
  const isToday = key === todayKey;
  // Leave room for the "+N more" line rather than showing N and then one more.
  const shown = items.length > MONTH_DAY_MAX_PILLS ? items.slice(0, MONTH_DAY_MAX_PILLS - 1) : items;
  const cellClass = cn(
    "flex min-h-16 min-w-0 flex-col items-center gap-1 border-b border-r p-1 text-left md:min-h-28 md:items-stretch md:p-1.5",
    outside && "bg-muted/40",
    lastCol && "border-r-0",
    lastRow && "border-b-0"
  );
  const dayNumber = (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums md:self-start",
        isToday ? "bg-primary text-primary-foreground" : key < todayKey || outside ? "text-muted-foreground/70" : "text-foreground"
      )}
    >
      {date.getDate()}
    </span>
  );

  if (items.length === 0) return <div className={cellClass}>{dayNumber}</div>;

  // The whole cell opens the day's list; the pills are a preview of it.
  return (
    <button
      type="button"
      onClick={() => onOpenDay(key)}
      aria-label={`${format(date, "EEEE, d MMM")}, ${items.length} scheduled`}
      className={cn(cellClass, "cursor-pointer transition-colors hover:bg-muted/50", FOCUS_RING, "focus-visible:ring-inset")}
    >
      {dayNumber}
      <KindDots items={items} className="md:hidden" />
      <span className="hidden min-w-0 flex-col gap-1 md:flex">
        {shown.map((item) => (
          <SchedulePill key={item.id} item={item} />
        ))}
        {items.length > shown.length && (
          <span className="px-1.5 py-0.5 text-xs font-medium text-muted-foreground">+{items.length - shown.length} more</span>
        )}
      </span>
    </button>
  );
}

function MonthView({
  start,
  end,
  todayKey,
  byDay,
  onOpenDay,
}: {
  start: Date;
  end: Date;
  todayKey: string;
  byDay: Map<string, ScheduleItem[]>;
  onOpenDay: (key: string) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(start, WEEK_OPTIONS), end: endOfWeek(end, WEEK_OPTIONS) });
  return (
    <div className="overflow-hidden rounded-xl border bg-surface">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => (
          <MonthDay
            key={localDayKey(date)}
            date={date}
            items={byDay.get(localDayKey(date)) ?? []}
            todayKey={todayKey}
            outside={date.getMonth() !== start.getMonth()}
            lastCol={i % 7 === 6}
            lastRow={i >= days.length - 7}
            onOpenDay={onOpenDay}
          />
        ))}
      </div>
    </div>
  );
}

// Quarter ──────────────────────────────────────────────────────

function QuarterRow({ item, onOpen }: { item: ScheduleItem; onOpen: (item: ScheduleItem) => void }) {
  const kind = SCHEDULE_KIND[item.kind];
  const date = keyToDate(item.dueDate);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40", FOCUS_RING, "focus-visible:ring-inset")}
    >
      <span className="w-8 shrink-0 text-center">
        <span className="block text-[10px] font-medium uppercase text-muted-foreground">{format(date, "EEE")}</span>
        <span className="block text-sm font-semibold leading-tight tabular-nums">{date.getDate()}</span>
      </span>
      <span className={cn("h-8 w-1 shrink-0 rounded-full", kind.dot)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {kind.label} · {item.location}
        </span>
      </span>
      {item.startsAt && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatTime(item.startsAt)}</span>}
    </button>
  );
}

function QuarterMonth({
  month,
  todayKey,
  byDay,
  schedule,
  onOpenDay,
  onOpenItem,
  onOpenMonth,
}: {
  month: Date;
  todayKey: string;
  byDay: Map<string, ScheduleItem[]>;
  schedule: ScheduleItem[];
  onOpenDay: (key: string) => void;
  onOpenItem: (item: ScheduleItem) => void;
  onOpenMonth: (key: string) => void;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstKey = localDayKey(days[0]);
  const lastKey = localDayKey(days[days.length - 1]);
  const items = schedule.filter((s) => s.dueDate >= firstKey && s.dueDate <= lastKey);
  const leadingBlanks = (days[0].getDay() + 6) % 7; // Monday-first

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-surface">
      <h3 className="border-b">
        <button
          type="button"
          onClick={() => onOpenMonth(firstKey)}
          title="Open in month view"
          className={cn(
            "group flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40",
            FOCUS_RING,
            "focus-visible:ring-inset"
          )}
        >
          <span className="font-medium">{format(month, "MMMM yyyy")}</span>
          <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground group-hover:text-foreground">
            {items.length} scheduled
            <CaretRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </h3>

      <div className="grid grid-cols-7 gap-y-0.5 p-3">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="pb-1 text-center text-[11px] font-medium text-muted-foreground">
            {d.charAt(0)}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((date) => {
          const key = localDayKey(date);
          const dayItems = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const dayNumber = (
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors",
                isToday
                  ? "bg-primary font-medium text-primary-foreground"
                  : key < todayKey
                    ? "text-muted-foreground/50"
                    : dayItems.length > 0
                      ? "font-semibold group-hover:bg-muted"
                      : "text-foreground/80"
              )}
            >
              {date.getDate()}
            </span>
          );
          return dayItems.length > 0 ? (
            <button
              key={key}
              type="button"
              onClick={() => onOpenDay(key)}
              aria-label={`${format(date, "EEEE, d MMM")}, ${dayItems.length} scheduled`}
              className={cn("group flex h-10 flex-col items-center justify-center gap-0.5 rounded-md", FOCUS_RING)}
            >
              {dayNumber}
              <KindDots items={dayItems} />
            </button>
          ) : (
            <span key={key} className="flex h-10 flex-col items-center justify-center gap-0.5">
              {dayNumber}
              <span className="h-1.5" />
            </span>
          );
        })}
        {/* Always six rows, so the three months' agendas start level. */}
        {Array.from({ length: 42 - leadingBlanks - days.length }, (_, i) => (
          <span key={`trailing-${i}`} className="h-10" />
        ))}
      </div>

      <div className="flex-1 border-t">
        {items.length > 0 ? (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <QuarterRow item={item} onOpen={onOpenItem} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing scheduled</p>
        )}
      </div>
    </section>
  );
}

// Overlay: the day's list, then one item's details ──────────────

type Peek = { dayKey: string; itemId: string | null };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function DayList({
  dayKey,
  items,
  todayKey,
  onSelect,
  onOpenWeek,
}: {
  dayKey: string;
  items: ScheduleItem[];
  todayKey: string;
  onSelect: (itemId: string) => void;
  onOpenWeek?: (key: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-in fade-in-0 duration-200">
      <SheetHeader className="border-b pr-12">
        <SheetTitle className="text-lg">{format(keyToDate(dayKey), "EEEE, d MMMM")}</SheetTitle>
        <SheetDescription>
          {items.length} scheduled · {dueIn(dayKey, todayKey)}
        </SheetDescription>
      </SheetHeader>
      <ul className="flex-1 divide-y overflow-y-auto">
        {items.map((item) => {
          const kind = SCHEDULE_KIND[item.kind];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40", FOCUS_RING, "focus-visible:ring-inset")}
              >
                <span className={cn("w-16 shrink-0 text-xs tabular-nums", item.startsAt ? "font-medium" : "text-muted-foreground")}>
                  {item.startsAt ? formatTime(item.startsAt) : "Any time"}
                </span>
                <span className={cn("h-9 w-1 shrink-0 rounded-full", kind.dot)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {kind.label} · {item.location}
                  </span>
                </span>
                <CaretRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      {onOpenWeek && (
        <SheetFooter className="border-t">
          <Button variant="outline" onClick={() => onOpenWeek(dayKey)}>
            Open in week view
          </Button>
        </SheetFooter>
      )}
    </div>
  );
}

function ItemDetail({
  item,
  dayItems,
  equipment,
  todayKey,
  onBack,
  onSelect,
}: {
  item: ScheduleItem;
  dayItems: ScheduleItem[];
  equipment?: Equipment;
  todayKey: string;
  onBack: () => void;
  onSelect: (itemId: string) => void;
}) {
  const kind = SCHEDULE_KIND[item.kind];
  const KindIcon = kind.icon;
  const date = keyToDate(item.dueDate);
  const index = dayItems.findIndex((i) => i.id === item.id);
  const status = equipment ? equipmentStatusKey(equipment) : undefined;

  return (
    <div key={item.id} className="flex min-h-0 flex-1 flex-col animate-in fade-in-0 slide-in-from-right-4 duration-200">
      <div className="flex h-13 shrink-0 items-center justify-between gap-2 border-b pr-12 pl-2">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={onBack}>
          <CaretLeft /> Back to {format(date, "EEE, d MMM")}
        </Button>
        {dayItems.length > 1 && (
          <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
            <Button variant="ghost" size="icon-sm" aria-label="Previous item" disabled={index <= 0} onClick={() => onSelect(dayItems[index - 1].id)}>
              <CaretUp />
            </Button>
            {index + 1} of {dayItems.length}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next item"
              disabled={index >= dayItems.length - 1}
              onClick={() => onSelect(dayItems[index + 1].id)}
            >
              <CaretDown />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 px-4 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <KindIcon size={20} />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">{item.title}</SheetTitle>
              <SheetDescription>{item.assetId}</SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn("h-6 px-3", kind.chip)}>
              {kind.label}
            </Badge>
            <Badge variant="outline" className="h-6 px-3 text-muted-foreground">
              {item.startsAt ? "Booked" : "Planned"}
            </Badge>
          </div>
        </div>

        <section className="border-t px-4 pt-3 pb-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Schedule</h3>
          <dl className="divide-y">
            <DetailRow label="Due">
              {format(date, "EEEE, d MMMM yyyy")} <span className="text-muted-foreground">· {dueIn(item.dueDate, todayKey)}</span>
            </DetailRow>
            <DetailRow label="Time">{item.startsAt ? formatTime(item.startsAt) : "Any time that day"}</DetailRow>
            {item.estimatedMinutes !== undefined && <DetailRow label="Estimated duration">{item.estimatedMinutes} mins</DetailRow>}
            <DetailRow label="Assigned to">{item.assignee}</DetailRow>
            <DetailRow label="Location">{item.location}</DetailRow>
            <DetailRow label="Scheduled by">{scheduledBy(item)}</DetailRow>
            {item.lastDoneAt && <DetailRow label="Last done">{formatDate(item.lastDoneAt)}</DetailRow>}
          </dl>
        </section>

        {equipment && status && (
          <section className="border-t px-4 pt-3 pb-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Equipment</h3>
            <dl className="divide-y">
              <DetailRow label="Model">{equipmentName(equipment)}</DetailRow>
              <DetailRow label="Department">{getDepartment(equipment.departmentId)?.name ?? "—"}</DetailRow>
              <DetailRow label="Criticality">
                <Badge variant="outline" className={CRITICALITY_BADGE_CLASS[equipment.criticality]}>
                  {CRITICALITY_LABEL[equipment.criticality]}
                </Badge>
              </DetailRow>
              <DetailRow label="Status">
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", EQUIPMENT_STATUS_DOT_CLASS[status])} />
                  {EQUIPMENT_STATUS_LABEL[status]}
                </span>
              </DetailRow>
            </dl>
          </section>
        )}
      </div>

      <SheetFooter className="border-t">
        <Button asChild>
          <Link href={`/equipment/${item.equipmentId}`}>
            Open equipment page <ArrowRight />
          </Link>
        </Button>
      </SheetFooter>
    </div>
  );
}

function SchedulePeek({
  open,
  peek,
  byDay,
  equipmentById,
  todayKey,
  onOpenChange,
  onChange,
  onOpenWeek,
}: {
  open: boolean;
  peek: Peek | null;
  byDay: Map<string, ScheduleItem[]>;
  equipmentById: Map<string, Equipment>;
  todayKey: string;
  onOpenChange: (open: boolean) => void;
  onChange: (peek: Peek) => void;
  onOpenWeek?: (key: string) => void;
}) {
  const items = peek ? byDay.get(peek.dayKey) ?? [] : [];
  const item = peek?.itemId ? items.find((i) => i.id === peek.itemId) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        {peek &&
          (item ? (
            <ItemDetail
              item={item}
              dayItems={items}
              equipment={equipmentById.get(item.equipmentId)}
              todayKey={todayKey}
              onBack={() => onChange({ dayKey: peek.dayKey, itemId: null })}
              onSelect={(itemId) => onChange({ dayKey: peek.dayKey, itemId })}
            />
          ) : (
            <DayList
              dayKey={peek.dayKey}
              items={items}
              todayKey={todayKey}
              onSelect={(itemId) => onChange({ dayKey: peek.dayKey, itemId })}
              onOpenWeek={onOpenWeek}
            />
          ))}
      </SheetContent>
    </Sheet>
  );
}

// Tab ──────────────────────────────────────────────────────────

function UpcomingTab({ schedule, equipment }: { schedule: ScheduleItem[]; equipment: Equipment[] }) {
  const today = now();
  const todayKey = localDayKey(today);
  const [view, setView] = useState<ScheduleView>("week");
  // The day the calendar is focused on: picks which week/month/quarter is
  // shown, and in week view it's the selected day the list starts from.
  const [focus, setFocus] = useState(todayKey);
  // Kept after closing so the sheet doesn't empty out mid slide-out.
  const [peek, setPeek] = useState<Peek | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const s of schedule) {
      const list = map.get(s.dueDate);
      if (list) list.push(s);
      else map.set(s.dueDate, [s]);
    }
    return map;
  }, [schedule]);
  const equipmentById = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

  const { start, end } = periodBounds(view, keyToDate(focus));
  const startKey = localDayKey(start);
  const endKey = localDayKey(end);
  const inPeriod = schedule.filter((s) => s.dueDate >= startKey && s.dueDate <= endKey);
  const nextAfter = schedule.find((s) => s.dueDate > endKey);

  function shiftPeriod(amount: number) {
    const key = localDayKey(periodBounds(view, SHIFT_PERIOD[view](start, amount)).start);
    setFocus(key < todayKey ? todayKey : key);
  }

  function openPeek(next: Peek) {
    setPeek(next);
    setPeekOpen(true);
  }

  const openItem = (item: ScheduleItem) => openPeek({ dayKey: item.dueDate, itemId: item.id });
  const openDay = (key: string) => openPeek({ dayKey: key, itemId: null });

  function openWeek(key: string) {
    setPeekOpen(false);
    setView("week");
    setFocus(key);
  }

  function openMonth(key: string) {
    setView("month");
    setFocus(key < todayKey ? todayKey : key);
  }

  // W / M / Q switch views and T jumps back to today, as in most calendar apps.
  useEffect(() => {
    if (peekOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const key = e.key.toUpperCase();
      const match = SCHEDULE_VIEWS.find((v) => v.shortcut === key);
      if (match) setView(match.value);
      else if (key === "T") setFocus(todayKey);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [todayKey, peekOpen]);

  const nothingScheduled = (fromKey: string) => (
    <NothingScheduled fromKey={fromKey < todayKey ? todayKey : fromKey} toKey={endKey} next={nextAfter} onJump={setFocus} />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FocusTile date={keyToDate(focus)} isToday={focus === todayKey} />
          <div>
            <h2 className="text-lg font-semibold leading-tight">{periodTitle(start, end)}</h2>
            <p className="text-sm text-muted-foreground">
              {periodRange(start, end)} · {inPeriod.length} scheduled
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="bg-surface px-3"
            title="Go to today (T)"
            disabled={focus === todayKey}
            onClick={() => setFocus(todayKey)}
          >
            Today
          </Button>
          <div className="flex items-center" role="group" aria-label="Change period">
            <Button
              variant="outline"
              size="icon"
              className="rounded-r-none bg-surface"
              aria-label={`Previous ${view}`}
              disabled={startKey <= todayKey}
              onClick={() => shiftPeriod(-1)}
            >
              <CaretLeft />
            </Button>
            <span
              aria-live="polite"
              className="-ml-px flex h-9 min-w-32 items-center justify-center border bg-surface px-3 text-sm font-medium"
            >
              {relativePeriod(view, start, today)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="-ml-px rounded-l-none bg-surface"
              aria-label={`Next ${view}`}
              onClick={() => shiftPeriod(1)}
            >
              <CaretRight />
            </Button>
          </div>
          <ViewMenu value={view} onChange={setView} />
        </div>
      </div>

      {view === "week" && (
        <WeekView
          start={start}
          end={end}
          selected={focus}
          todayKey={todayKey}
          byDay={byDay}
          onSelect={setFocus}
          onOpenItem={openItem}
          empty={nothingScheduled(focus)}
        />
      )}

      {view === "month" && (
        <MonthView start={start} end={end} todayKey={todayKey} byDay={byDay} onOpenDay={openDay} />
      )}

      {view === "quarter" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => {
            const month = addMonths(start, i);
            return (
              <QuarterMonth
                key={localDayKey(month)}
                month={month}
                todayKey={todayKey}
                byDay={byDay}
                schedule={schedule}
                onOpenDay={openDay}
                onOpenItem={openItem}
                onOpenMonth={openMonth}
              />
            );
          })}
        </div>
      )}

      {view !== "week" && (inPeriod.length > 0 ? <KindLegend /> : nothingScheduled(startKey))}

      <SchedulePeek
        open={peekOpen}
        peek={peek}
        byDay={byDay}
        equipmentById={equipmentById}
        todayKey={todayKey}
        onOpenChange={setPeekOpen}
        onChange={setPeek}
        onOpenWeek={view === "week" ? undefined : openWeek}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────

type HistoryFilter = "ALL" | "SETTLED" | Exclude<OperationKind, "IN_USE">;

function actorName(a: ActivityEvent): string {
  if (a.actorSystem) return "System";
  if (a.actorUserId) return getUser(a.actorUserId)?.name ?? "Unknown";
  if (a.actorEngineerId) return "External engineer";
  return "—";
}

function EventTable({ items, dateMode }: { items: ActivityEvent[]; dateMode: "relative" | "absolute" }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => {
            const eq = getEquipmentById(a.equipmentId);
            return (
              <TableRow key={a.id}>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`size-1.5 shrink-0 rounded-full ${eventDotClass(a.eventType)}`} />
                    <Badge variant="outline">{a.eventType.replace(/_/g, " ").toLowerCase()}</Badge>
                  </span>
                </TableCell>
                <TableCell className="max-w-96 truncate" title={a.summary}>
                  {a.summary}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {eq ? (
                    <Link href={`/equipment/${eq.id}`} className="hover:underline">
                      {equipmentName(eq)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{actorName(a)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {dateMode === "relative" ? relativeTimeFromNow(a.occurredAt) : formatDate(a.occurredAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EventCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden p-0 gap-0">
      <CardHeader className="gap-0.5 px-5 pt-4 pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <div className="px-5 pb-4">{children}</div>
    </Card>
  );
}

const HISTORY_CATEGORY_LABEL: Record<Exclude<HistoryFilter, "ALL" | "SETTLED">, string> = {
  MOVING: "Equipment moving",
  INTERNAL_REPAIR: "Internal repair",
  EXTERNAL_REPAIR: "External repair",
  PM: "Preventive maintenance",
  CALIBRATION: "Calibration",
};

function HistoryTab({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const settledToday = events.filter((a) => isSettlingEvent(a) && isRecentForActivity(a.occurredAt));
  const byCategory = (k: OperationKind) => events.filter((a) => historyCategory(a) === k);

  const options: FilterChipOption<HistoryFilter>[] = [
    { value: "ALL", label: "All" },
    { value: "SETTLED", label: "Settled today", count: settledToday.length },
    ...(Object.keys(HISTORY_CATEGORY_LABEL) as (keyof typeof HISTORY_CATEGORY_LABEL)[]).map((k) => ({
      value: k,
      label: HISTORY_CATEGORY_LABEL[k],
      count: byCategory(k).length,
    })),
  ];

  const log = filter === "ALL" || filter === "SETTLED" ? events : byCategory(filter);
  const pageItems = log.slice((page - 1) * pageSize, page * pageSize);

  function changeFilter(f: HistoryFilter) {
    setFilter(f);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <FilterChips label="Filter history" options={options} value={filter} onChange={changeFilter} />

      {(filter === "ALL" || filter === "SETTLED") && (
        <EventCard title="Settled today" description="Completed, resolved, or approved since midnight">
          {settledToday.length > 0 ? (
            <EventTable items={settledToday} dateMode="relative" />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing has settled yet today.</p>
          )}
        </EventCard>
      )}

      {filter !== "SETTLED" && (
        <EventCard
          title={filter === "ALL" ? "Full event log" : HISTORY_CATEGORY_LABEL[filter]}
          description={
            filter === "ALL"
              ? "Every recorded event across the fleet, most recent first"
              : `Every ${HISTORY_CATEGORY_LABEL[filter].toLowerCase()} event, most recent first`
          }
        >
          {log.length > 0 ? (
            <div className="space-y-3">
              <EventTable items={pageItems} dateMode="absolute" />
              {log.length > pageSize && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={log.length}
                  pageSizeOptions={[20, 50, 100]}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              )}
            </div>
          ) : (
            <EmptyState icon={ClockCounterClockwise} message="No events recorded here yet." />
          )}
        </EventCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const equipment = useDemo((s) => s.equipment);
  const sessions = useDemo((s) => s.sessions);
  const movementRequests = useDemo((s) => s.movementRequests);
  const workOrders = useDemo((s) => s.workOrders);
  const tickets = useDemo((s) => s.tickets);
  const pmSchedules = useDemo((s) => s.pmSchedules);
  const calibrationRecords = useDemo((s) => s.calibrationRecords);
  const activity = useDemo((s) => s.activity);
  const updatedAgo = useUpdatedAgoLabel();
  const [tab, setTab] = useState("live");

  const operations = useMemo(
    () =>
      buildLiveOperations({ equipment, sessions, movementRequests, workOrders, tickets, pmSchedules, calibrationRecords, activity }),
    [equipment, sessions, movementRequests, workOrders, tickets, pmSchedules, calibrationRecords, activity]
  );
  const schedule = useMemo(
    () => buildUpcomingSchedule({ equipment, pmSchedules, calibrationRecords, workOrders }),
    [equipment, pmSchedules, calibrationRecords, workOrders]
  );
  const events = useMemo(() => [...activity].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), [activity]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-muted-foreground text-sm">{updatedAgo}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="gap-4 group-data-horizontal/tabs:h-11">
          <TabsTrigger value="live" className="gap-2 px-3">
            <Pulse size={16} /> Live
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2 px-3">
            <CalendarBlank size={16} /> Upcoming
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 px-3">
            <ClockCounterClockwise size={16} /> History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="pt-4">
          <LiveTab operations={operations} />
        </TabsContent>
        <TabsContent value="upcoming" className="pt-4">
          <UpcomingTab schedule={schedule} equipment={equipment} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
