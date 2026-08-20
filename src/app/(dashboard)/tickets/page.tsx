"use client";

import { useState, type ReactNode } from "react";
import { MagicWand, MapPin, UserCircle, Ticket, CheckCircle } from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
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
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AssignEngineerDialog } from "@/components/assign-engineer-dialog";

const TICKET_CHIP_CLASS = "max-w-[32%] min-w-0 shrink px-3 py-1 text-sm";

/** Badge centers its content, so truncating the badge itself clips text from both ends — this truncates a left-aligned inner span instead. */
function ChipLabel({ children }: { children: ReactNode }) {
  return <span className="block w-full truncate text-left">{children}</span>;
}

/** One open ticket, card-shaped — click anywhere on it (or Assign) to open the assign-engineer dialog directly. Fixed height so a grid row of cards always lines up regardless of description length. */
function TicketCard({ ticket, onAction }: { ticket: ActiveTicket; onAction: () => void }) {
  return (
    <Card
      onClick={onAction}
      className="h-[240px] cursor-pointer justify-between gap-3 px-(--card-spacing) transition-shadow hover:shadow-md"
    >
      <div className="space-y-2">
        <CardTitle className="truncate text-[22px] leading-tight font-bold">{ticket.equipmentDisplayName}</CardTitle>

        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="outline" className={TICKET_CHIP_CLASS}>
            <ChipLabel>{ticket.ticketNumber}</ChipLabel>
          </Badge>
          <Badge variant="outline" className={`${TICKET_CHIP_CLASS} ${PRIORITY_BADGE[ticket.priority as keyof typeof PRIORITY_BADGE]}`}>
            <ChipLabel>{ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}</ChipLabel>
          </Badge>
          <Badge
            variant="outline"
            className={`${TICKET_CHIP_CLASS} ${ticket.responseOverdue ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
          >
            <ChipLabel>{ticket.statusLabel}</ChipLabel>
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin size={16} className="shrink-0" />
          {ticket.location}
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <UserCircle size={22} className="shrink-0 text-muted-foreground" />
          <span className="truncate">
            {ticket.raisedByName}
            {ticket.raisedByDesignation ? `, ${ticket.raisedByDesignation}` : ""}
          </span>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
        >
          Assign
        </Button>
      </div>
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
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);

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
            <TicketCard key={ticket.id} ticket={ticket} onAction={() => setActionTicketId(ticket.id)} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Ticket} message="No active tickets right now." />
      )}

      <Card className="overflow-hidden p-0 gap-0">
        <CardHeader className="gap-0 px-4 pt-3 pb-2">
          <CardTitle className="text-lg">Recently completed</CardTitle>
          <CardDescription>Resolved or closed tickets, most recent first — click a row for the full record</CardDescription>
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
                    <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setActionTicketId(ticket.id)}>
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
          <div className="p-4">
            <EmptyState icon={CheckCircle} message="No completed tickets yet." />
          </div>
        )}
      </Card>

      <AssignEngineerDialog
        ticketId={actionTicketId}
        open={!!actionTicketId}
        onOpenChange={(open) => !open && setActionTicketId(null)}
        hideTrigger
      />
    </div>
  );
}

export default function TicketsPage() {
  return <TicketsContent />;
}
