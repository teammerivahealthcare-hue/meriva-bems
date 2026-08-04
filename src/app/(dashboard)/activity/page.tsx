import Link from "next/link";
import {
  facility,
  activityEvents,
  usageSessions,
  movementRequests,
  getEquipmentById,
  getUser,
  equipmentName,
  formatDate,
  activityMotionSnapshot,
  relativeTimeFromNow,
  eventDotClass,
  now,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCards, type StatCardSpec } from "@/components/stat-cards";

const COMPLETION_TYPES = new Set([
  "SESSION_ENDED",
  "SESSION_AUTO_CLOSED",
  "WORK_ORDER_COMPLETED",
  "TICKET_RESOLVED",
  "TICKET_CLOSED",
  "MOVE_APPROVED",
  "CONDEMNATION_APPROVED",
]);

export default function ActivityPage() {
  const motion = activityMotionSnapshot();

  const liveSessions = usageSessions.filter((s) => !s.endedAt);
  const pendingMoves = movementRequests.filter(
    (m) => m.approvalStatus === "PENDING" || m.flaggedUnapproved
  );

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

  const statCards: StatCardSpec[] = [
    {
      key: "inMotion",
      label: "In motion",
      value: String(motion.inMotion),
      subtext: "Active sessions, open jobs, pending moves",
    },
    { key: "activeSessions", label: "Active sessions now", value: String(motion.activeSessions) },
    {
      key: "atRest",
      label: "Settled today",
      value: String(motion.atRest),
      subtext: "Completed, resolved, or approved today",
    },
    { key: "total", label: "Events today", value: String(motion.eventsToday) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-muted-foreground text-sm">
          What&apos;s in motion right now at {facility.name}, what settled today, and the full event log.
        </p>
      </div>

      <StatCards stats={statCards} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>In motion</CardTitle>
            <CardDescription>Live equipment sessions running right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveSessions.length > 0 ? (
              <div className="space-y-3">
                {liveSessions.map((s) => {
                  const eq = getEquipmentById(s.equipmentId);
                  const user = getUser(s.userId);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">
                          {eq ? (
                            <Link href={`/equipment/${eq.id}`} className="hover:underline">
                              {equipmentName(eq)}
                            </Link>
                          ) : (
                            "Unknown equipment"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{user?.name ?? "Unknown user"}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Started {relativeTimeFromNow(s.startedAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions running right now.</p>
            )}

            <p className="text-sm text-muted-foreground">
              {pendingMoves.length} pending movement approval{pendingMoves.length === 1 ? "" : "s"} —{" "}
              <Link href="/jobs?tab=approvals" className="hover:underline">
                view all approvals
              </Link>
              . {motion.inMotion - liveSessions.length - pendingMoves.length} open jobs —{" "}
              <Link href="/jobs" className="hover:underline">
                view all jobs
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settled today</CardTitle>
            <CardDescription>Completed, resolved, or approved since midnight</CardDescription>
          </CardHeader>
          <CardContent>
            {settledToday.length > 0 ? (
              <div className="space-y-3">
                {settledToday.map((a) => {
                  const eq = getEquipmentById(a.equipmentId);
                  return (
                    <div key={a.id} className="flex items-start gap-3">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${eventDotClass(a.eventType)}`} />
                      <div>
                        <p className="text-sm">
                          {a.summary}
                          {eq && (
                            <>
                              {" — "}
                              <Link href={`/equipment/${eq.id}`} className="hover:underline">
                                {equipmentName(eq)}
                              </Link>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{relativeTimeFromNow(a.occurredAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing has settled yet today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Full event log</CardTitle>
          <CardDescription>Every recorded event across the fleet, most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {fullLog.length > 0 ? (
            <div className="space-y-3">
              {fullLog.map((a) => {
                const eq = getEquipmentById(a.equipmentId);
                return (
                  <div key={a.id} className="flex items-start gap-3 border-l-2 border-muted pl-3 text-sm">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${eventDotClass(a.eventType)}`} />
                    <div className="min-w-0">
                      <p>{a.summary}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatDate(a.occurredAt)}</span>
                        {eq && (
                          <>
                            <span>·</span>
                            <Link href={`/equipment/${eq.id}`} className="hover:underline">
                              {equipmentName(eq)}
                            </Link>
                          </>
                        )}
                        <Badge variant="outline">{a.eventType.replace(/_/g, " ").toLowerCase()}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
