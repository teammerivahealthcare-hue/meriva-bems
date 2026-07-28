import Link from "next/link";
import {
  facility,
  equipment,
  equipmentName,
  getEquipmentById,
  getUser,
  getRoom,
  equipmentStatusKey,
  dashboardStats,
  formatDate,
  daysUntil,
  now,
  contracts,
  condemnationRecords,
  movementRequests,
  workOrders,
  buildActiveJobs,
  buildRecentActivityItems,
  activityMotionSnapshot,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  EquipmentStatusChart,
  type EquipmentStatusDatum,
} from "@/components/equipment-status-chart";
import { RecentActivityFeed } from "@/components/recent-activity-feed";
import { ActiveJobRow } from "@/components/active-job-row";
import { StatCards, type StatCardSpec } from "@/components/stat-cards";

// ─────────────────────────────────────────────────────────────
// Equipment alerts — glance-level only: warranty nearing expiry
// and recent condemnations. Repair jobs live under the Jobs tab,
// approvals under Approvals.
// ─────────────────────────────────────────────────────────────

const WARRANTY_ALERT_WINDOW_DAYS = 90;
const CONDEMNED_ALERT_WINDOW_DAYS = 365;
const MAX_ALERTS = 5;

type AlertKind = "WARRANTY_EXPIRING" | "CONDEMNED";

interface EquipmentAlert {
  id: string;
  kind: AlertKind;
  text: string;
  offsetDays: number; // signed: positive = days until, negative = days since
}

const ALERT_DOT: Record<AlertKind, string> = {
  WARRANTY_EXPIRING: "bg-amber-500",
  CONDEMNED: "bg-zinc-500",
};

function relativeTimeLabel(days: number): string {
  if (days === 0) return "Today";
  if (days > 0) return days === 1 ? "In 1 day" : `In ${days} days`;
  const abs = Math.abs(days);
  return abs === 1 ? "1 day ago" : `${abs} days ago`;
}

function buildEquipmentAlerts(): EquipmentAlert[] {
  const alerts: EquipmentAlert[] = [];

  for (const c of contracts) {
    if (c.type !== "WARRANTY") continue;
    const offsetDays = daysUntil(c.endDate);
    if (offsetDays < 0 || offsetDays > WARRANTY_ALERT_WINDOW_DAYS) continue;
    for (const eqId of c.coveredEquipmentIds) {
      const eq = getEquipmentById(eqId);
      if (!eq) continue;
      alerts.push({
        id: `warranty-${c.id}-${eqId}`,
        kind: "WARRANTY_EXPIRING",
        text: `Warranty expires in ${offsetDays} day${offsetDays === 1 ? "" : "s"} — ${equipmentName(eq)}`,
        offsetDays,
      });
    }
  }

  for (const c of condemnationRecords) {
    if (!c.approvedAt) continue;
    const offsetDays = daysUntil(c.approvedAt);
    if (Math.abs(offsetDays) > CONDEMNED_ALERT_WINDOW_DAYS) continue;
    const eq = getEquipmentById(c.equipmentId);
    if (!eq) continue;
    const daysAgo = Math.abs(offsetDays);
    alerts.push({
      id: `condemned-${c.id}`,
      kind: "CONDEMNED",
      text: `Condemned ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago — ${equipmentName(eq)}`,
      offsetDays,
    });
  }

  return alerts
    .sort((a, b) => Math.abs(a.offsetDays) - Math.abs(b.offsetDays))
    .slice(0, MAX_ALERTS);
}

// ─────────────────────────────────────────────────────────────
// Today's schedule — work orders happening on DEMO_TODAY.
// ─────────────────────────────────────────────────────────────

interface ScheduleEntry {
  id: string;
  time: string;
  equipmentDisplayName: string;
  type: string;
  statusLabel: string;
  statusClass: string;
}

function isSameCalendarDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function buildTodaysSchedule(): ScheduleEntry[] {
  const today = now();
  return workOrders
    .filter((w) => isSameCalendarDay(w.startedAt, today))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((w) => {
      const eq = getEquipmentById(w.equipmentId);
      let statusLabel: string;
      let statusClass: string;
      if (w.completedAt) {
        statusLabel = "Completed";
        statusClass = "text-emerald-700";
      } else if (new Date(w.startedAt).getTime() <= today.getTime()) {
        statusLabel = "In progress";
        statusClass = "text-sky-700";
      } else {
        statusLabel = "Upcoming";
        statusClass = "text-muted-foreground";
      }
      return {
        id: w.id,
        time: formatTime(w.startedAt),
        equipmentDisplayName: eq ? equipmentName(eq) : "Unknown equipment",
        type: w.type.charAt(0) + w.type.slice(1).toLowerCase(),
        statusLabel,
        statusClass,
      };
    });
}

// ─────────────────────────────────────────────────────────────
// Equipment health — fleet breakdown by status.
// ─────────────────────────────────────────────────────────────

function equipmentStatusBreakdown(): EquipmentStatusDatum[] {
  let operational = 0;
  let attention = 0;
  let maintenance = 0;
  let down = 0;
  let condemned = 0;

  for (const eq of equipment) {
    switch (equipmentStatusKey(eq)) {
      case "condemned":
        condemned++;
        break;
      case "down":
        down++;
        break;
      case "maintenance":
        maintenance++;
        break;
      case "attention":
        attention++;
        break;
      default:
        operational++;
    }
  }

  return [
    { key: "operational", value: operational },
    { key: "attention", value: attention },
    { key: "maintenance", value: maintenance },
    { key: "down", value: down },
    { key: "condemned", value: condemned },
  ];
}

export default function DashboardPage() {
  const stats = dashboardStats();
  const statCards: StatCardSpec[] = [
    {
      key: "total",
      label: "Total equipment",
      value: String(stats.totalEquipment),
      subtext: `${stats.operational} operational`,
    },
    {
      key: "uptime",
      label: "Uptime",
      value: `${stats.uptimePct}%`,
      subtext: `${stats.underMaintenance} under maintenance`,
    },
    { key: "down", label: "Down now", value: String(stats.down) },
    {
      key: "condemned",
      label: "Condemned in use",
      value: String(stats.condemnedInUse),
      subtext: "Written off, still treating patients",
    },
    {
      key: "tickets",
      label: "Open tickets",
      value: String(stats.openTickets),
      subtext: `${stats.slaBreached} SLA breached`,
    },
  ];
  const alerts = buildEquipmentAlerts();
  const activeJobs = buildActiveJobs();
  const todaysSchedule = buildTodaysSchedule();
  const statusBreakdown = equipmentStatusBreakdown();
  const recentActivityItems = buildRecentActivityItems();
  const motion = activityMotionSnapshot();

  const pendingMoves = movementRequests.filter(
    (m) => m.approvalStatus === "PENDING" || m.flaggedUnapproved
  );
  const pendingCondemnations = condemnationRecords.filter((c) => !c.approvedAt);

  const activeWorkOrders = workOrders
    .filter((w) => !w.completedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const totalPendingApprovals = activeWorkOrders.length + pendingMoves.length + pendingCondemnations.length;

  const approvalStatCards: StatCardSpec[] = [
    {
      key: "jobAssignments",
      label: "Job assignments",
      value: String(activeWorkOrders.length),
      subtext: "Awaiting completion",
    },
    {
      key: "movementApprovals",
      label: "Movement approvals",
      value: String(pendingMoves.length),
      subtext: `${pendingMoves.filter((m) => m.flaggedUnapproved).length} flagged unapproved`,
    },
    {
      key: "condemnationApprovals",
      label: "Condemnation approvals",
      value: String(pendingCondemnations.length),
      subtext: "Pending review",
    },
    {
      key: "totalApprovals",
      label: "Total pending",
      value: String(totalPendingApprovals),
      subtext: "Across all types",
    },
  ];

  const jobStatCards: StatCardSpec[] = [
    {
      key: "tickets",
      label: "Open jobs",
      value: String(activeJobs.length),
      subtext: `${activeJobs.filter((j) => j.slaBreached).length} SLA breached`,
    },
    {
      key: "critical",
      label: "Critical priority",
      value: String(activeJobs.filter((j) => j.priority === "CRITICAL").length),
    },
    {
      key: "unassigned",
      label: "Unassigned",
      value: String(activeJobs.filter((j) => !j.engineerName).length),
    },
    {
      key: "slaBreach",
      label: "SLA breached",
      value: String(activeJobs.filter((j) => j.slaBreached).length),
    },
  ];

  const activityStatCards: StatCardSpec[] = [
    {
      key: "inMotion",
      label: "In motion",
      value: String(motion.inMotion),
      subtext: "Active sessions, open jobs, pending moves",
    },
    {
      key: "activeSessions",
      label: "Active sessions now",
      value: String(motion.activeSessions),
    },
    {
      key: "atRest",
      label: "Settled today",
      value: String(motion.atRest),
      subtext: "Completed, resolved, or approved today",
    },
    {
      key: "total",
      label: "Events today",
      value: String(motion.eventsToday),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {facility.name} · {facility.city}, {facility.state}
        </p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList variant="line">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-6 pt-4">
          <StatCards stats={statCards} />

          <Card>
            <CardHeader>
              <CardTitle>Equipment alerts</CardTitle>
              <CardDescription>Warranties nearing expiry and recent condemnations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${ALERT_DOT[a.kind]}`} />
                      <div>
                        <p className="text-sm">{a.text}</p>
                        <p className="text-xs text-muted-foreground">{relativeTimeLabel(a.offsetDays)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No warranty or condemnation alerts right now.</p>
              )}
              <Separator />
              <Button asChild variant="outline" size="sm">
                <Link href="/equipment">View equipment</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Active jobs</CardTitle>
                <CardDescription>Current internal repair jobs, most urgent first</CardDescription>
              </CardHeader>
              <CardContent>
                {activeJobs.length > 0 ? (
                  <div>
                    {activeJobs.slice(0, 4).map((job) => (
                      <ActiveJobRow key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active jobs right now.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s schedule</CardTitle>
                <CardDescription>{formatDate(now().toISOString())}</CardDescription>
              </CardHeader>
              <CardContent>
                {todaysSchedule.length > 0 ? (
                  <div>
                    {todaysSchedule.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-3 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{entry.time}</p>
                          <p className="text-sm">{entry.equipmentDisplayName}</p>
                          <p className="text-xs text-muted-foreground">{entry.type}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-medium ${entry.statusClass}`}>
                          {entry.statusLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Equipment health</CardTitle>
                <CardDescription>Fleet breakdown by status</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/equipment">View all equipment</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <EquipmentStatusChart data={statusBreakdown} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Breakdowns, assignments, sessions, and moves across the fleet</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivityFeed items={recentActivityItems} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals — summary of job assignments, movement + condemnation approvals */}
        <TabsContent value="approvals" className="space-y-6 pt-4">
          <StatCards stats={approvalStatCards} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job assignments</CardTitle>
                <CardDescription>Most recently started first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeWorkOrders.length > 0 ? (
                  activeWorkOrders.slice(0, 3).map((w) => {
                    const eq = getEquipmentById(w.equipmentId);
                    const engineer = getUser(w.performedByUserId);
                    const scheduled = new Date(w.startedAt).getTime() > now().getTime();
                    return (
                      <div key={w.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate">{eq ? equipmentName(eq) : "Unknown equipment"}</p>
                          <p className="text-xs text-muted-foreground">{engineer?.name ?? "Unassigned"}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={scheduled ? "" : "bg-amber-50 text-amber-800 border-amber-200"}
                        >
                          {scheduled ? "Scheduled" : "In progress"}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No jobs assigned right now.</p>
                )}
                {activeWorkOrders.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{activeWorkOrders.length - 3} more</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movement approvals</CardTitle>
                <CardDescription>Flagged unapproved moves first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingMoves.length > 0 ? (
                  pendingMoves.slice(0, 3).map((m) => {
                    const eq = getEquipmentById(m.equipmentId);
                    const fromRoom = getRoom(m.fromRoomId);
                    const toRoom = getRoom(m.toRoomId);
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate">{eq ? equipmentName(eq) : "Unknown equipment"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {fromRoom?.name ?? "—"} → {toRoom?.name ?? "—"}
                          </p>
                        </div>
                        <Badge variant={m.flaggedUnapproved ? "destructive" : "outline"}>
                          {m.flaggedUnapproved ? "Unapproved" : "Pending"}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No movement approvals pending.</p>
                )}
                {pendingMoves.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{pendingMoves.length - 3} more</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Condemnation approvals</CardTitle>
                <CardDescription>Awaiting biomedical sign-off</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingCondemnations.length > 0 ? (
                  pendingCondemnations.slice(0, 3).map((c) => {
                    const eq = getEquipmentById(c.equipmentId);
                    return (
                      <div key={c.id} className="text-sm">
                        <p className="truncate">{eq ? equipmentName(eq) : "Unknown equipment"}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.justification}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No condemnation requests awaiting approval.</p>
                )}
                {pendingCondemnations.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{pendingCondemnations.length - 3} more</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/approvals">View all approvals</Link>
            </Button>
          </div>
        </TabsContent>

        {/* Jobs — summary of open internal repair jobs */}
        <TabsContent value="jobs" className="space-y-6 pt-4">
          <StatCards stats={jobStatCards} />

          <Card>
            <CardHeader>
              <CardTitle>Most urgent jobs</CardTitle>
              <CardDescription>Open tickets, most urgent first</CardDescription>
            </CardHeader>
            <CardContent>
              {activeJobs.length > 0 ? (
                <div>
                  {activeJobs.slice(0, 4).map((job) => (
                    <ActiveJobRow key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active jobs right now.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/jobs">View all jobs</Link>
            </Button>
          </div>
        </TabsContent>

        {/* Activity — what's in motion right now vs. what's settled */}
        <TabsContent value="activity" className="space-y-6 pt-4">
          <StatCards stats={activityStatCards} />

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Breakdowns, assignments, sessions, and moves across the fleet</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivityFeed items={recentActivityItems.slice(0, 5)} />
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/activity">View all activity</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
