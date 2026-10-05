"use client";

import Link from "next/link";
import { CheckCircle, Stack, Pulse, Prohibit, Ticket as TicketIcon } from "@phosphor-icons/react";
import {
  useDemo,
  facility,
  dashboardStats,
  buildActiveTickets,
  buildRecentActivityItems,
  buildMovementApprovalRows,
  buildCondemnationApprovalRows,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SummaryCard } from "@/components/summary-card";
import { DashboardWidget } from "@/components/dashboard-widget";
import { EquipmentHealthBreakdown, equipmentHealthBreakdown } from "@/components/equipment-health-card";
import { ActiveTicketRow } from "@/components/active-ticket-row";
import { ActivityFeedList } from "@/components/recent-activity-feed";

const WIDGET_ROWS = 4;
const ACTIVITY_ROWS = 6;

// ─────────────────────────────────────────────────────────────
// Widgets — each reads the live store, so approving or logging
// something elsewhere shows up here without a reload.
// ─────────────────────────────────────────────────────────────

function EquipmentWidget() {
  const equipment = useDemo((s) => s.equipment);
  const health = equipmentHealthBreakdown(equipment);
  const total = health.reduce((sum, d) => sum + d.value, 0);
  return (
    <DashboardWidget title="Equipment" href="/equipment">
      <div className="space-y-4">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-medium">Equipment health</span>
          <span className="text-sm text-muted-foreground">{total} in the working fleet</span>
        </p>
        <EquipmentHealthBreakdown data={health} />
      </div>
    </DashboardWidget>
  );
}

function TicketsWidget() {
  const tickets = useDemo((s) => s.tickets);
  const workOrders = useDemo((s) => s.workOrders);
  const active = buildActiveTickets(tickets, workOrders);
  const unassigned = active.filter((t) => !t.engineerName).length;
  return (
    <DashboardWidget title="Tickets" href="/tickets">
      <div className="space-y-4">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-medium">Most urgent</span>
          <span className="text-sm text-muted-foreground">
            {active.length} open{unassigned > 0 && ` · ${unassigned} unassigned`}
          </span>
        </p>
        {active.length > 0 ? (
          <div>
            {active.slice(0, WIDGET_ROWS).map((ticket) => (
              <ActiveTicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle size={16} className="text-emerald-600" /> No open tickets right now.
          </p>
        )}
        {active.length > WIDGET_ROWS && (
          <p className="text-xs text-muted-foreground">+{active.length - WIDGET_ROWS} more open tickets</p>
        )}
      </div>
    </DashboardWidget>
  );
}

function ApprovalsWidget() {
  const movementRequests = useDemo((s) => s.movementRequests);
  const condemnationRecords = useDemo((s) => s.condemnationRecords);
  const approveMovement = useDemo((s) => s.approveMovement);
  const moves = buildMovementApprovalRows(movementRequests);
  const condemnations = buildCondemnationApprovalRows(condemnationRecords);
  const rows = [
    ...moves.map((m) => ({
      id: m.id,
      title: m.equipmentDisplayName,
      detail: `${m.fromRoomName} → ${m.toRoomName} (${m.toDepartmentName})`,
      type: m.flaggedUnapproved ? "Unapproved move" : "Movement",
      flagged: m.flaggedUnapproved,
      action: (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => approveMovement(m.id)}>
          <CheckCircle size={14} /> Approve
        </Button>
      ),
    })),
    ...condemnations.map((c) => ({
      id: c.id,
      title: c.equipmentDisplayName,
      detail: c.justification,
      type: "Condemnation",
      flagged: false,
      action: (
        <Button asChild variant="outline" size="sm">
          <Link href={c.href}>Review</Link>
        </Button>
      ),
    })),
  ];

  return (
    <DashboardWidget title="Approvals" href="/approvals">
      {rows.length > 0 ? (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-0">Request</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="pr-0 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, WIDGET_ROWS).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-0 w-full pl-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground" title={r.detail}>
                      {r.detail}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={r.flagged ? "border-transparent bg-red-50 text-red-700" : "border-transparent bg-muted text-muted-foreground"}
                    >
                      {r.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-0 text-right">{r.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length > WIDGET_ROWS && <p className="text-xs text-muted-foreground">+{rows.length - WIDGET_ROWS} more waiting</p>}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle size={16} className="text-emerald-600" /> Nothing waiting for approval.
        </p>
      )}
    </DashboardWidget>
  );
}

function ActivityWidget() {
  const activity = useDemo((s) => s.activity);
  const items = buildRecentActivityItems(ACTIVITY_ROWS, activity);
  return (
    <DashboardWidget title="Activity" href="/activity">
      <ActivityFeedList items={items} />
    </DashboardWidget>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const stats = dashboardStats();

  const summaryCards = [
    {
      key: "total",
      title: "Total equipment",
      value: String(stats.totalEquipment),
      icon: Stack,
      iconColor: "blue" as const,
      changeDirection: "positive" as const,
      footerLeadText: String(stats.operational),
      footerText: "operational right now",
    },
    {
      key: "uptime",
      title: "Uptime",
      value: `${stats.uptimePct}%`,
      icon: Pulse,
      iconColor: "violet" as const,
      changeDirection: stats.underMaintenance > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(stats.underMaintenance),
      footerText: "under maintenance",
    },
    {
      key: "down",
      title: "Down now",
      value: String(stats.down),
      icon: Prohibit,
      iconColor: "indigo" as const,
      changeDirection: stats.down > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(stats.down),
      footerText: stats.down === 1 ? "unit needs repair" : "units need repair",
    },
    {
      key: "tickets",
      title: "Open tickets",
      value: String(stats.openTickets),
      icon: TicketIcon,
      iconColor: "cyan" as const,
      changeDirection: stats.responseOverdue > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(stats.responseOverdue),
      footerText: "response overdue",
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

      {/* Top-line KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
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

      {/* Widgets — the canvas splits in two; each widget takes half. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EquipmentWidget />
        <TicketsWidget />
        <ApprovalsWidget />
        <ActivityWidget />
      </div>
    </div>
  );
}
