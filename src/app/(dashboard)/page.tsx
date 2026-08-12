"use client";

import Link from "next/link";
import { Stack, Pulse, Prohibit, Ticket as TicketIcon } from "@phosphor-icons/react";
import {
  facility,
  equipment,
  equipmentStatusKey,
  dashboardStats,
  buildActiveTickets,
  buildRecentActivityItems,
  buildActivityByDay,
  buildMovementApprovalRows,
  buildCondemnationApprovalRows,
  buildTicketAssignmentRows,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EquipmentStatusChart,
  type EquipmentStatusDatum,
} from "@/components/equipment-status-chart";
import { RecentActivityFeed } from "@/components/recent-activity-feed";
import { SummaryCard } from "@/components/summary-card";
import { ViewActivityCard } from "@/components/view-activity-card";
import { ApprovalMovementCard } from "@/components/approval-movement-card";
import { TicketsAssignmentsCard } from "@/components/tickets-assignments-card";

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

  const statusBreakdown = equipmentStatusBreakdown();
  const activeTickets = buildActiveTickets();
  const recentActivityItems = buildRecentActivityItems();
  const activityByDay = buildActivityByDay(6);
  const movementApprovals = buildMovementApprovalRows();
  const condemnationApprovals = buildCondemnationApprovalRows();
  const ticketAssignments = buildTicketAssignmentRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {facility.name} · {facility.city}, {facility.state}
        </p>
      </div>

      {/* Row 1 — top-line KPIs */}
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

      {/* Row 2 — equipment health + activity by day */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[65fr_35fr]">
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

        <ViewActivityCard days={activityByDay} />
      </div>

      {/* Row 3 — approval movement + tickets & assignments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ApprovalMovementCard
          movementApprovals={movementApprovals}
          condemnationApprovals={condemnationApprovals}
        />
        <TicketsAssignmentsCard tickets={activeTickets} assignments={ticketAssignments} />
      </div>

      {/* Row 4 — recent activity, full width */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Breakdowns, assignments, sessions, and moves across the fleet</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentActivityFeed items={recentActivityItems} />
        </CardContent>
      </Card>
    </div>
  );
}
