"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pulse,
  ArrowsLeftRight,
  Wrench,
  Truck,
  CalendarCheck,
  Gauge,
  CalendarBlank,
  CaretLeft,
  CaretRight,
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
  buildLiveOperations,
  buildUpcomingSchedule,
  historyCategory,
  isSettlingEvent,
  isRecentForActivity,
  OPERATION_KIND_LABEL,
  type ActivityEvent,
  type LiveOperation,
  type OperationKind,
  type OperationTone,
  type ScheduleItem,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const WINDOW_DAYS = 7;

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

function dayHeading(key: string, todayKey: string): string {
  const date = keyToDate(key).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (key === todayKey) return `Today, ${date}`;
  if (key === addDays(todayKey, 1)) return `Tomorrow, ${date}`;
  return `${keyToDate(key).toLocaleDateString("en-IN", { weekday: "long" })}, ${date}`;
}

const SCHEDULE_KIND: Record<ScheduleItem["kind"], { label: string; chip: string; icon: Icon }> = {
  PM: { label: "Preventive maintenance", chip: "bg-emerald-50 text-emerald-700 border-transparent", icon: CalendarCheck },
  CALIBRATION: { label: "Calibration", chip: "bg-sky-50 text-sky-700 border-transparent", icon: Gauge },
  INSPECTION: { label: "Inspection", chip: "bg-violet-50 text-violet-700 border-transparent", icon: MagnifyingGlass },
};

function ScheduleCard({ item }: { item: ScheduleItem }) {
  const kind = SCHEDULE_KIND[item.kind];
  const KindIcon = kind.icon;
  return (
    <Link
      href={`/equipment/${item.equipmentId}`}
      className="grid grid-cols-1 items-center gap-3 rounded-xl border bg-surface px-5 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[5.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.1fr)]"
    >
      <p className={cn("text-sm tabular-nums", item.startsAt ? "font-medium" : "text-muted-foreground")}>
        {item.startsAt ? formatTime(item.startsAt) : "Any time"}
      </p>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <KindIcon size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{item.title}</p>
          <p className="truncate text-sm text-muted-foreground">{item.assetId}</p>
        </div>
      </div>
      <div>
        <Badge variant="outline" className={cn("h-6 px-3", kind.chip)}>
          {kind.label}
        </Badge>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin size={16} className="shrink-0" /> {item.location}
      </p>
      <div className="space-y-0.5 text-sm">
        {item.estimatedMinutes !== undefined && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Timer size={16} className="shrink-0" /> Estimated duration{" "}
            <span className="font-medium text-foreground">{item.estimatedMinutes} mins</span>
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <UserCircle size={16} className="shrink-0 text-muted-foreground" /> {item.assignee}
        </p>
      </div>
    </Link>
  );
}

function UpcomingTab({ schedule }: { schedule: ScheduleItem[] }) {
  const todayKey = localDayKey(now());
  const [windowStart, setWindowStart] = useState(todayKey);
  const [selected, setSelected] = useState(todayKey);

  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(windowStart, i));
  const windowEnd = days[days.length - 1];
  const countFor = (key: string) => schedule.filter((s) => s.dueDate === key).length;

  const visible = schedule.filter((s) => s.dueDate >= selected && s.dueDate <= windowEnd);
  const groups = [...new Set(visible.map((s) => s.dueDate))].map((key) => ({
    key,
    items: visible.filter((s) => s.dueDate === key),
  }));
  const nextAfter = schedule.find((s) => s.dueDate > windowEnd);

  function shiftWindow(weeks: number) {
    const start = addDays(windowStart, weeks * WINDOW_DAYS);
    const clamped = start < todayKey ? todayKey : start;
    setWindowStart(clamped);
    setSelected(clamped);
  }

  function jumpTo(key: string) {
    setWindowStart(key);
    setSelected(key);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-medium">Upcoming schedule</h2>

      <div className="flex w-full max-w-3xl items-center gap-1 rounded-xl bg-muted p-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous week"
          disabled={windowStart <= todayKey}
          onClick={() => shiftWindow(-1)}
        >
          <CaretLeft weight="fill" />
        </Button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((key) => {
            const date = keyToDate(key);
            const n = countFor(key);
            const active = key === selected;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={`${date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}, ${n} scheduled`}
                onClick={() => setSelected(key)}
                className={cn(
                  "flex flex-col items-center rounded-lg py-2 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active ? "bg-surface shadow-sm" : "hover:bg-surface/60",
                  !active && n === 0 && "text-muted-foreground/60"
                )}
              >
                <span className="text-xs font-medium">{date.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                <span className="text-lg font-semibold tabular-nums">{date.getDate()}</span>
                <span className={cn("mt-0.5 size-1.5 rounded-full", n > 0 ? "bg-primary" : "bg-transparent")} />
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => shiftWindow(1)}>
          <CaretRight weight="fill" />
        </Button>
      </div>

      {groups.length > 0 ? (
        groups.map((g) => (
          <section key={g.key} className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{dayHeading(g.key, todayKey)}</h3>
            {g.items.map((item) => (
              <ScheduleCard key={item.id} item={item} />
            ))}
          </section>
        ))
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing scheduled from {keyToDate(selected).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to{" "}
            {keyToDate(windowEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.
          </p>
          {nextAfter && (
            <Button variant="outline" size="sm" onClick={() => jumpTo(nextAfter.dueDate)}>
              Jump to next: {keyToDate(nextAfter.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Button>
          )}
        </div>
      )}
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
          <UpcomingTab schedule={schedule} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
