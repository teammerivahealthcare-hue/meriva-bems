"use client";

import { useState } from "react";
import { MagicWand } from "@phosphor-icons/react";
import {
  facility,
  buildActiveTickets,
  buildClosedTickets,
  formatDate,
  useDemo,
  PRIORITY_BADGE,
  type ActiveTicket,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AssignEngineerDialog } from "@/components/assign-engineer-dialog";

/** One open ticket, card-shaped — click anywhere on it to open the assign-engineer dialog directly. */
function TicketCard({ ticket, onAction }: { ticket: ActiveTicket; onAction: () => void }) {
  return (
    <Card onClick={onAction} className="cursor-pointer gap-4 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl leading-tight font-semibold">{ticket.equipmentDisplayName}</CardTitle>
          <Badge variant="outline" className={`shrink-0 ${PRIORITY_BADGE[ticket.priority]}`}>
            {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
          </Badge>
        </div>
        <CardDescription>
          {ticket.location} · {ticket.department}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <span>{ticket.statusLabel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Updated</span>
          <span>{formatDate(ticket.lastUpdated)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Engineer</span>
          <span>{ticket.engineerName ?? "Unassigned"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketsContent() {
  const liveTickets = useDemo((s) => s.tickets);
  const liveWorkOrders = useDemo((s) => s.workOrders);
  const teamMembers = useDemo((s) => s.teamMembers);
  const autoAssignOpenTickets = useDemo((s) => s.autoAssignOpenTickets);

  const activeTickets = buildActiveTickets(liveTickets, liveWorkOrders);
  const closedTickets = buildClosedTickets(liveTickets, liveWorkOrders).slice(0, 10);
  const [actionTicket, setActionTicket] = useState<ActiveTicket | null>(null);

  const engineers = teamMembers.filter((m) => m.role === "ENGINEER" && m.active);
  const unassignedTicketsCount = activeTickets.filter((t) => !t.engineerName).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-muted-foreground text-sm">
          Assign engineers, track workload, and keep every open repair moving at {facility.name}.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Open tickets</h2>
          <p className="text-sm text-muted-foreground">All open tickets, most urgent first — click a card to assign an engineer</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unassignedTicketsCount === 0 || engineers.length === 0}
          onClick={() => autoAssignOpenTickets()}
        >
          <MagicWand /> Auto-assign
        </Button>
      </div>

      {activeTickets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onAction={() => setActionTicket(ticket)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active tickets right now.</p>
      )}

      <Card className="overflow-hidden p-0 gap-0">
        <CardHeader className="gap-0 px-4 pt-3 pb-2">
          <CardTitle className="text-lg">Recently completed</CardTitle>
          <CardDescription>Resolved or closed tickets, most recent first</CardDescription>
        </CardHeader>
        {closedTickets.length > 0 ? (
          <div className="px-4 pt-2 pb-3">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Time to complete</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.equipmentDisplayName}</TableCell>
                      <TableCell className="text-muted-foreground">{ticket.location}</TableCell>
                      <TableCell className="text-muted-foreground">{ticket.department}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(ticket.lastUpdated)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PRIORITY_BADGE[ticket.priority]}>
                          {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ticket.engineerName ?? "Unassigned"}</TableCell>
                      <TableCell className="text-muted-foreground">{ticket.timeToComplete ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ticket.responseOverdue
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }
                        >
                          {ticket.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">No completed tickets yet.</p>
        )}
      </Card>

      <AssignEngineerDialog
        ticketId={actionTicket?.id ?? null}
        open={!!actionTicket}
        onOpenChange={(open) => !open && setActionTicket(null)}
        hideTrigger
        contextLabel={actionTicket ? `${actionTicket.equipmentDisplayName} — ${actionTicket.ticketNumber}` : undefined}
      />
    </div>
  );
}

export default function TicketsPage() {
  return <TicketsContent />;
}
