"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Pulse,
  CheckCircle,
  ListChecks,
  CalendarBlank,
  ListBullets,
  Wrench,
  Target,
  Ticket as TicketIcon,
  CaretLeft,
  CaretRight,
  HourglassHigh,
  ClipboardText,
  UserMinus,
  ArrowsLeftRight,
  Truck,
} from "@phosphor-icons/react";
import {
  facility,
  activityEvents,
  movementRequests,
  buildActiveUsage,
  buildInTransitMoves,
  buildActiveRepairs,
  buildPlannerItems,
  getEquipmentById,
  getUser,
  equipmentName,
  formatDate,
  activityMotionSnapshot,
  relativeTimeFromNow,
  eventDotClass,
  now,
  useDemo,
  PRIORITY_BADGE,
  FLAG_TAG_CLASS,
  FLAG_LABEL,
  type ActivityEvent,
  type PlannerItem,
  type InTransitMove,
  type ActiveUsage,
  type ActiveRepair,
} from "@/lib/bems";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SummaryCard } from "@/components/summary-card";

type ActivityTab = "now" | "planner" | "history";
type PlannerView = "list" | "calendar";

const DAY_MS = 86400000;

const COMPLETION_TYPES = new Set([
  "SESSION_ENDED",
  "SESSION_AUTO_CLOSED",
  "WORK_ORDER_COMPLETED",
  "TICKET_RESOLVED",
  "TICKET_CLOSED",
  "MOVE_APPROVED",
  "CONDEMNATION_APPROVED",
]);

const KIND_LABEL: Record<PlannerItem["kind"], string> = {
  TICKET: "Ticket",
  PM: "Preventive maintenance",
  CALIBRATION: "Calibration",
};

const KIND_ICON = { TICKET: TicketIcon, PM: Wrench, CALIBRATION: Target };

function plannerBadge(item: PlannerItem): { className: string; label: string } {
  if (item.kind === "TICKET" && item.priority) {
    return {
      className: PRIORITY_BADGE[item.priority],
      label: item.priority.charAt(0) + item.priority.slice(1).toLowerCase(),
    };
  }
  if (item.kind === "PM") {
    const flag = item.overdue ? "PM_OVERDUE" : "PM_DUE";
    return { className: FLAG_TAG_CLASS[flag], label: FLAG_LABEL[flag] };
  }
  const flag = item.overdue ? "CALIBRATION_EXPIRED" : "CALIBRATION_EXPIRING";
  return { className: FLAG_TAG_CLASS[flag], label: FLAG_LABEL[flag] };
}

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatUTCDate(ms: number, opts: Intl.DateTimeFormatOptions): string {
  return new Date(ms).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

function dayOffset(item: PlannerItem, todayStart: number): number {
  return Math.round((utcDayStart(new Date(item.dueDate)) - todayStart) / DAY_MS);
}

function bucketLabel(offset: number): string {
  if (offset < 0) return "Overdue";
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset <= 6) return "This week";
  return "Later";
}

const BUCKET_ORDER = ["Overdue", "Today", "Tomorrow", "This week", "Later"];

function actorName(a: ActivityEvent): string {
  if (a.actorSystem) return "System";
  if (a.actorUserId) return getUser(a.actorUserId)?.name ?? "Unknown";
  if (a.actorEngineerId) return "External engineer";
  return "—";
}

/** Who's using what, right now — shared shape whether the equipment never left Schedule's old "In use" table or Activity's old "In motion" table; there was only ever one of these. */
function InUseTable({ items }: { items: ActiveUsage[] }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipment</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Started</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                <Link href={`/equipment/${s.equipmentId}`} className="hover:underline">
                  {s.equipmentDisplayName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{s.userName}</TableCell>
              <TableCell className="text-muted-foreground">{relativeTimeFromNow(s.startedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MovingTable({ items }: { items: InTransitMove[] }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipment</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Initiated by</TableHead>
            <TableHead>Started</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">
                <Link href={`/equipment/${m.equipmentId}`} className="hover:underline">
                  {m.equipmentDisplayName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{m.fromRoom}</TableCell>
              <TableCell className="text-muted-foreground">{m.toRoom}</TableCell>
              <TableCell className="text-muted-foreground">{m.initiatedByName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                  {relativeTimeFromNow(m.initiatedAt)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Shared by both "In repair" cards — internal and external work orders have the same shape. */
function RepairTable({ items }: { items: ActiveRepair[] }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipment</TableHead>
            <TableHead>Work order</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Performed by</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Findings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link href={`/equipment/${r.equipmentId}`} className="hover:underline">
                  {r.equipmentDisplayName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.workOrderNumber}</TableCell>
              <TableCell className="text-muted-foreground">{r.type}</TableCell>
              <TableCell className="text-muted-foreground">{r.performerName}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(r.startedAt)}</TableCell>
              <TableCell className="max-w-56 truncate text-muted-foreground" title={r.findings}>
                {r.findings ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlannerTable({ items, onSelect }: { items: PlannerItem[]; onSelect: (item: PlannerItem) => void }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipment</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Assigned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const badge = plannerBadge(item);
            return (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => onSelect(item)}>
                <TableCell className="font-medium">{item.equipmentDisplayName}</TableCell>
                <TableCell className="text-muted-foreground">{item.location}</TableCell>
                <TableCell className="text-muted-foreground">{item.department}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.dueDate)}</TableCell>
                <TableCell className="text-muted-foreground">{item.assignedName ?? "Unassigned"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Shared by "Settled today" and "Full event log" — same event shape, only the date format differs. */
function EventTable({ items, dateMode }: { items: ActivityEvent[]; dateMode: "relative" | "absolute" }) {
  return (
    <div className="rounded-md border overflow-hidden">
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
                <TableCell className="text-muted-foreground">
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

export default function ActivityPage() {
  const [tab, setTab] = useState<ActivityTab>("now");
  const [plannerView, setPlannerView] = useState<PlannerView>("list");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedItem, setSelectedItem] = useState<PlannerItem | null>(null);

  const liveTickets = useDemo((s) => s.tickets);
  const liveWorkOrders = useDemo((s) => s.workOrders);

  const motion = activityMotionSnapshot();

  // ── Right now ──
  const activeUsage = buildActiveUsage();
  const inTransit = buildInTransitMoves();
  const { internal: internalRepairs, external: externalRepairs } = buildActiveRepairs();
  const pendingMoves = movementRequests.filter((m) => m.approvalStatus === "PENDING" || m.flaggedUnapproved);
  const openTickets = motion.inMotion - activeUsage.length - pendingMoves.length;

  const liveStatusCards = [
    {
      key: "moving",
      title: "Equipment moving",
      value: String(inTransit.length),
      icon: ArrowsLeftRight,
      iconColor: "blue" as const,
      footerLeadText: String(inTransit.length),
      footerText: "in transit between rooms",
    },
    {
      key: "inUse",
      title: "Equipment in use",
      value: String(activeUsage.length),
      icon: Pulse,
      iconColor: "cyan" as const,
      footerLeadText: String(activeUsage.length),
      footerText: "switched on right now",
    },
    {
      key: "internalRepairs",
      title: "Internal repairs",
      value: String(internalRepairs.length),
      icon: Wrench,
      iconColor: "indigo" as const,
      footerLeadText: String(internalRepairs.length),
      footerText: "by in-house engineers",
    },
    {
      key: "externalRepairs",
      title: "External repairs",
      value: String(externalRepairs.length),
      icon: Truck,
      iconColor: "violet" as const,
      footerLeadText: String(externalRepairs.length),
      footerText: "by vendor / OEM",
    },
  ];

  // ── Due & upcoming (planner) ──
  const plannerItems = useMemo(
    () => buildPlannerItems(liveTickets, liveWorkOrders),
    [liveTickets, liveWorkOrders]
  );

  const todayStart = useMemo(() => utcDayStart(now()), []);

  const overdueCount = plannerItems.filter((i) => i.overdue).length;
  const dueTodayCount = plannerItems.filter((i) => dayOffset(i, todayStart) === 0).length;
  const dueThisWeekCount = plannerItems.filter((i) => {
    const o = dayOffset(i, todayStart);
    return o >= 0 && o <= 6;
  }).length;
  const unassignedCount = plannerItems.filter((i) => !i.assignedName).length;

  const plannerSummaryCards = [
    {
      key: "overdue",
      title: "Overdue",
      value: String(overdueCount),
      icon: HourglassHigh,
      iconColor: "fuchsia" as const,
      changeDirection: overdueCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(overdueCount),
      footerText: "past their due date",
    },
    {
      key: "today",
      title: "Due today",
      value: String(dueTodayCount),
      icon: CalendarBlank,
      iconColor: "purple" as const,
      changeDirection: dueTodayCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(dueTodayCount),
      footerText: "due before end of day",
    },
    {
      key: "week",
      title: "Due this week",
      value: String(dueThisWeekCount),
      icon: ClipboardText,
      iconColor: "blue" as const,
      changeDirection: "positive" as const,
      footerLeadText: String(dueThisWeekCount),
      footerText: "across tickets, PM & calibration",
    },
    {
      key: "unassigned",
      title: "Unassigned",
      value: String(unassignedCount),
      icon: UserMinus,
      iconColor: "indigo" as const,
      changeDirection: unassignedCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(unassignedCount),
      footerText: "need an engineer or vendor",
    },
  ];

  const buckets = BUCKET_ORDER.map((label) => ({
    label,
    items: plannerItems.filter((i) => bucketLabel(dayOffset(i, todayStart)) === label),
  })).filter((b) => b.items.length > 0);

  const todayDow = now().getUTCDay();
  const todayMonIndex = (todayDow + 6) % 7; // Monday = 0
  const weekStartMs = todayStart + (weekOffset * 7 - todayMonIndex) * DAY_MS;
  const weekDays = Array.from({ length: 7 }, (_, c) => {
    const dayMs = weekStartMs + c * DAY_MS;
    return {
      key: dayMs,
      label: formatUTCDate(dayMs, { weekday: "short", day: "numeric" }),
      isToday: dayMs === todayStart,
      items: plannerItems.filter((i) => utcDayStart(new Date(i.dueDate)) === dayMs),
    };
  });
  const weekRangeLabel = `${formatUTCDate(weekStartMs, { day: "numeric", month: "short" })} – ${formatUTCDate(
    weekStartMs + 6 * DAY_MS,
    { day: "numeric", month: "short", year: "numeric" }
  )}`;

  // ── History ──
  const today = now();
  const settledToday = activityEvents
    .filter((a) => {
      const d = new Date(a.occurredAt);
      return (
        COMPLETION_TYPES.has(a.eventType) &&
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const fullLog = [...activityEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const historySummaryCards = [
    {
      key: "eventsToday",
      title: "Events today",
      value: String(motion.eventsToday),
      icon: ListChecks,
      iconColor: "violet" as const,
      footerLeadText: String(motion.eventsToday),
      footerText: "recorded across the fleet",
    },
    {
      key: "atRest",
      title: "Settled today",
      value: String(motion.atRest),
      icon: CheckCircle,
      iconColor: "teal" as const,
      footerLeadText: String(motion.atRest),
      footerText: "completed, resolved, or approved today",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-muted-foreground text-sm">
          Who&apos;s doing what at {facility.name} — what&apos;s in motion right now, what&apos;s coming due, and
          what&apos;s already settled today.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ActivityTab)}>
        <TabsList variant="line" className="group-data-horizontal/tabs:h-9">
          <TabsTrigger value="now" className="text-sm">
            Right now
          </TabsTrigger>
          <TabsTrigger value="planner" className="text-sm">
            Due &amp; upcoming
            {(overdueCount > 0 || unassignedCount > 0) && (
              <Badge variant="outline" className="ml-1 bg-danger/10 text-danger border-danger/30">
                {overdueCount + unassignedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="now" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {liveStatusCards.map((card) => (
              <SummaryCard
                key={card.key}
                title={card.title}
                value={card.value}
                icon={card.icon}
                iconColor={card.iconColor}
                footerLeadText={card.footerLeadText}
                footerText={card.footerText}
                showChevron={false}
              />
            ))}
          </div>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <CardTitle className="text-lg">Moving</CardTitle>
              <CardDescription>Equipment currently in transit between rooms</CardDescription>
            </CardHeader>
            {inTransit.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <MovingTable items={inTransit} />
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No equipment is being moved right now.</p>
            )}
          </Card>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <CardTitle className="text-lg">In use</CardTitle>
              <CardDescription>Equipment switched on right now, with an active usage session</CardDescription>
            </CardHeader>
            {activeUsage.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <InUseTable items={activeUsage} />
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No equipment is in active use right now.</p>
            )}
          </Card>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <CardTitle className="text-lg">In repair — internal</CardTitle>
              <CardDescription>Work orders being handled by in-house engineers</CardDescription>
            </CardHeader>
            {internalRepairs.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <RepairTable items={internalRepairs} />
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No repairs currently with an internal engineer.</p>
            )}
          </Card>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <CardTitle className="text-lg">In repair — external</CardTitle>
              <CardDescription>Work orders being handled by an external vendor or OEM</CardDescription>
            </CardHeader>
            {externalRepairs.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <RepairTable items={externalRepairs} />
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No repairs currently with an external vendor.</p>
            )}
          </Card>

          <p className="text-sm text-muted-foreground">
            {pendingMoves.length} pending movement approval{pendingMoves.length === 1 ? "" : "s"} —{" "}
            <Link href="/approvals" className="hover:underline">
              view all approvals
            </Link>
            . {openTickets} open ticket{openTickets === 1 ? "" : "s"} —{" "}
            <Link href="/tickets" className="hover:underline">
              view all tickets
            </Link>
            .
          </p>
        </TabsContent>

        <TabsContent value="planner" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plannerSummaryCards.map((card) => (
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

          <Card className="overflow-hidden p-0 gap-0">
            <Tabs value={plannerView} onValueChange={(v) => setPlannerView(v as PlannerView)}>
              <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
                <div>
                  <CardTitle className="text-lg">What&apos;s due, and who&apos;s on it</CardTitle>
                  <CardDescription>Open tickets against their response deadline, plus PM &amp; calibration coming due</CardDescription>
                </div>
                <TabsList>
                  <TabsTrigger value="list" className="text-sm">
                    <ListBullets /> List
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="text-sm">
                    <CalendarBlank /> Calendar
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="list" className="px-4 pb-3">
                {buckets.length > 0 ? (
                  <div className="space-y-4">
                    {buckets.map((bucket) => (
                      <div key={bucket.label} className="space-y-1.5">
                        <p
                          className={cn(
                            "text-xs font-medium",
                            bucket.label === "Overdue" ? "text-danger" : "text-muted-foreground"
                          )}
                        >
                          {bucket.label} · {bucket.items.length}
                        </p>
                        <PlannerTable items={bucket.items} onSelect={setSelectedItem} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-3 text-sm text-muted-foreground">Nothing due — every ticket, PM, and calibration is clear.</p>
                )}
              </TabsContent>

              <TabsContent value="calendar" className="px-4 pb-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="icon-sm" onClick={() => setWeekOffset((w) => w - 1)}>
                      <CaretLeft />
                      <span className="sr-only">Previous week</span>
                    </Button>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{weekRangeLabel}</p>
                      {weekOffset !== 0 && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setWeekOffset(0)}>
                          This week
                        </Button>
                      )}
                    </div>
                    <Button variant="outline" size="icon-sm" onClick={() => setWeekOffset((w) => w + 1)}>
                      <CaretRight />
                      <span className="sr-only">Next week</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
                    {weekDays.map((day) => (
                      <div
                        key={day.key}
                        className={cn(
                          "min-h-32 rounded-md border p-2",
                          day.isToday ? "border-foreground/30 bg-muted/40" : "border-border"
                        )}
                      >
                        <p className="text-xs font-medium text-muted-foreground">{day.label}</p>
                        <div className="mt-1.5 space-y-1">
                          {day.items.map((item) => {
                            const badge = plannerBadge(item);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedItem(item)}
                                title={`${item.equipmentDisplayName} — ${KIND_LABEL[item.kind]}`}
                                className={cn(
                                  "block w-full truncate rounded border px-1.5 py-1 text-left text-xs hover:opacity-80",
                                  badge.className
                                )}
                              >
                                {item.equipmentDisplayName}
                              </button>
                            );
                          })}
                          {day.items.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {historySummaryCards.map((card) => (
              <SummaryCard
                key={card.key}
                title={card.title}
                value={card.value}
                icon={card.icon}
                iconColor={card.iconColor}
                footerLeadText={card.footerLeadText}
                footerText={card.footerText}
                showChevron={false}
              />
            ))}
          </div>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <CardTitle className="text-lg">Settled today</CardTitle>
              <CardDescription>Completed, resolved, or approved since midnight</CardDescription>
            </CardHeader>
            {settledToday.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <EventTable items={settledToday} dateMode="relative" />
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Nothing has settled yet today.</p>
            )}
          </Card>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <CardTitle className="text-lg">Full event log</CardTitle>
              <CardDescription>Every recorded event across the fleet, most recent first</CardDescription>
            </CardHeader>
            {fullLog.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <EventTable items={fullLog} dateMode="absolute" />
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-120">
          {selectedItem && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const KindIcon = KIND_ICON[selectedItem.kind];
                    return <KindIcon size={18} className="text-muted-foreground" />;
                  })()}
                  {selectedItem.detail}
                </SheetTitle>
                <SheetDescription>
                  {KIND_LABEL[selectedItem.kind]} · {selectedItem.equipmentDisplayName}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const badge = plannerBadge(selectedItem);
                    return (
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    );
                  })()}
                  {selectedItem.overdue && (
                    <Badge variant="outline" className="bg-danger/10 text-danger border-danger/30">
                      Overdue
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm">{selectedItem.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm">{selectedItem.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Due</p>
                    <p className="text-sm">{formatDate(selectedItem.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    <p className="text-sm">{selectedItem.assignedName ?? "Unassigned"}</p>
                  </div>
                </div>
              </div>
              <SheetFooter className="border-t">
                {selectedItem.kind === "TICKET" && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/tickets">View in Tickets</Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/equipment/${selectedItem.equipmentId}`}>View equipment</Link>
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
