"use client";

import { useEffect, useState } from "react";
import { Kanban, ClockCounterClockwise, CheckCircle, ArrowsInLineVertical, ArrowsOutLineVertical } from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import {
  facility,
  buildActiveTickets,
  buildClosedTickets,
  isRecentlyCompleted,
  formatDate,
  useDemo,
  PRIORITY_BADGE,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignEngineerDialog } from "@/components/assign-engineer-dialog";
import { TicketBoard } from "@/components/ticket-board";

/** Re-checks the Completed → History hand-off twice a minute. */
function useNowMs(intervalMs = 30_000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return nowMs;
}

function TicketsContent() {
  const liveTickets = useDemo((s) => s.tickets);
  const liveWorkOrders = useDemo((s) => s.workOrders);
  const nowMs = useNowMs();

  const [tab, setTab] = useState("board");
  // "Collapse" trims every card to name, priority, and engineer so a long board fits on screen.
  const [collapsed, setCollapsed] = useState(false);
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);

  const closed = buildClosedTickets(liveTickets, liveWorkOrders);
  const recentlyCompleted = closed.filter((t) => isRecentlyCompleted(t, nowMs));
  const history = closed.filter((t) => !isRecentlyCompleted(t, nowMs));
  const boardTickets = [...buildActiveTickets(liveTickets, liveWorkOrders), ...recentlyCompleted];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-muted-foreground text-sm">
          Assign engineers, track progress, and keep every open repair moving at {facility.name}.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="gap-4 group-data-horizontal/tabs:h-11">
          <TabsTrigger value="board" className="gap-2 px-3">
            <Kanban size={16} /> Board
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 px-3">
            <ClockCounterClockwise size={16} /> History
          </TabsTrigger>
          {tab === "board" && (
            <Button
              variant="secondary"
              className="ml-auto gap-2 px-3 font-normal"
              aria-pressed={collapsed}
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? <ArrowsOutLineVertical size={16} /> : <ArrowsInLineVertical size={16} />}
              {collapsed ? "Expand" : "Collapse"}
            </Button>
          )}
        </TabsList>

        <TabsContent value="board" className="pt-4">
          <TicketBoard
            tickets={boardTickets}
            collapsed={collapsed}
            nowMs={nowMs}
            onOpen={setActionTicketId}
            onAssign={setActionTicketId}
          />
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          {history.length > 0 ? (
            <Card className="overflow-hidden p-0 gap-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Time to complete</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((ticket) => (
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
                              ? "bg-red-50 text-red-700 border-transparent"
                              : "bg-emerald-50 text-emerald-700 border-transparent"
                          }
                        >
                          {ticket.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState icon={CheckCircle} message="No tickets in history yet." />
          )}
        </TabsContent>
      </Tabs>

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
