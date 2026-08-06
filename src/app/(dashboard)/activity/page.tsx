"use client";

import Link from "next/link";
import {
  ArrowsClockwise,
  Pulse,
  CheckCircle,
  ListChecks,
} from "@phosphor-icons/react";
import {
  facility,
  activityEvents,
  movementRequests,
  buildActiveUsage,
  getEquipmentById,
  getUser,
  equipmentName,
  formatDate,
  activityMotionSnapshot,
  relativeTimeFromNow,
  eventDotClass,
  now,
  type ActivityEvent,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SummaryCard } from "@/components/summary-card";

const COMPLETION_TYPES = new Set([
  "SESSION_ENDED",
  "SESSION_AUTO_CLOSED",
  "WORK_ORDER_COMPLETED",
  "TICKET_RESOLVED",
  "TICKET_CLOSED",
  "MOVE_APPROVED",
  "CONDEMNATION_APPROVED",
]);

function actorName(a: ActivityEvent): string {
  if (a.actorSystem) return "System";
  if (a.actorUserId) return getUser(a.actorUserId)?.name ?? "Unknown";
  if (a.actorEngineerId) return "External engineer";
  return "—";
}

function InMotionTable({ items }: { items: ReturnType<typeof buildActiveUsage> }) {
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
  const motion = activityMotionSnapshot();

  const liveSessions = buildActiveUsage();
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

  const statCards = [
    {
      key: "inMotion",
      title: "In motion",
      value: String(motion.inMotion),
      icon: ArrowsClockwise,
      iconColor: "blue" as const,
      footerLeadText: String(motion.inMotion),
      footerText: "active sessions, open tickets, pending moves",
    },
    {
      key: "activeSessions",
      title: "Active sessions now",
      value: String(motion.activeSessions),
      icon: Pulse,
      iconColor: "cyan" as const,
      footerLeadText: String(motion.activeSessions),
      footerText: "equipment switched on right now",
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
    {
      key: "eventsToday",
      title: "Events today",
      value: String(motion.eventsToday),
      icon: ListChecks,
      iconColor: "violet" as const,
      footerLeadText: String(motion.eventsToday),
      footerText: "recorded across the fleet",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-muted-foreground text-sm">
          What&apos;s in motion right now at {facility.name}, what settled today, and the full event log.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
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
          <CardTitle className="text-lg">In motion</CardTitle>
          <CardDescription>Live equipment sessions running right now</CardDescription>
        </CardHeader>
        {liveSessions.length > 0 ? (
          <div className="px-4 pt-2 pb-3">
            <InMotionTable items={liveSessions} />
          </div>
        ) : (
          <p className="px-4 pt-2 text-sm text-muted-foreground">No sessions running right now.</p>
        )}
        <p className="px-4 pt-2 pb-3 text-sm text-muted-foreground">
          {pendingMoves.length} pending movement approval{pendingMoves.length === 1 ? "" : "s"} —{" "}
          <Link href="/approvals" className="hover:underline">
            view all approvals
          </Link>
          . {motion.inMotion - liveSessions.length - pendingMoves.length} open tickets —{" "}
          <Link href="/tickets" className="hover:underline">
            view all tickets
          </Link>
          .
        </p>
      </Card>

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
    </div>
  );
}
