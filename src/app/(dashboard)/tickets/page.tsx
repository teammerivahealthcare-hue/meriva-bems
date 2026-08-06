"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ticket as TicketIcon,
  ShieldWarning,
  UserMinus,
  HourglassHigh,
  MagicWand,
} from "@phosphor-icons/react";
import {
  facility,
  buildActiveTickets,
  buildClosedTickets,
  formatDate,
  useDemo,
  PRIORITY_BADGE,
  availabilityFor,
  activeTicketsCountFor,
  AVAILABILITY_LABEL,
  AVAILABILITY_DOT_CLASS,
  type ActiveTicket,
  type WorkOrder,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SummaryCard } from "@/components/summary-card";

type TicketsTab = "tickets" | "history";

function EngineerSelect({
  value,
  onAssign,
  engineers,
  workOrders,
}: {
  value: string | null;
  onAssign: (engineerId: string) => void;
  engineers: { id: string; name: string }[];
  workOrders: WorkOrder[];
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onAssign}>
      <SelectTrigger className="w-full" onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {engineers.map((eng) => {
          const availability = availabilityFor(eng.id, workOrders);
          return (
            <SelectItem key={eng.id} value={eng.id}>
              <span className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${AVAILABILITY_DOT_CLASS[availability]}`} />
                {eng.name}
                <span className="text-xs text-muted-foreground">
                  · {activeTicketsCountFor(eng.id, workOrders)} active
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function TicketsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TicketsTab>(searchParams.get("tab") === "history" ? "history" : "tickets");

  const liveTickets = useDemo((s) => s.tickets);
  const liveWorkOrders = useDemo((s) => s.workOrders);
  const teamMembers = useDemo((s) => s.teamMembers);
  const assignEngineer = useDemo((s) => s.assignEngineer);
  const autoAssignOpenTickets = useDemo((s) => s.autoAssignOpenTickets);

  const activeTickets = buildActiveTickets(liveTickets, liveWorkOrders);
  const closedTickets = buildClosedTickets(liveTickets, liveWorkOrders).slice(0, 10);
  const [selectedTicket, setSelectedTicket] = useState<ActiveTicket | null>(null);

  const engineers = teamMembers.filter((m) => m.role === "ENGINEER" && m.active);

  const criticalTicketsCount = activeTickets.filter((t) => t.priority === "CRITICAL").length;
  const unassignedTicketsCount = activeTickets.filter((t) => !t.engineerName).length;
  const slaBreachedCount = activeTickets.filter((t) => t.slaBreached).length;

  const ticketSummaryCards = [
    {
      key: "tickets",
      title: "Open tickets",
      value: String(activeTickets.length),
      icon: TicketIcon,
      iconColor: "blue" as const,
      changeDirection: slaBreachedCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(slaBreachedCount),
      footerText: "SLA breached",
    },
    {
      key: "critical",
      title: "Critical priority",
      value: String(criticalTicketsCount),
      icon: ShieldWarning,
      iconColor: "fuchsia" as const,
      changeDirection: criticalTicketsCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(criticalTicketsCount),
      footerText: "critical tickets open",
    },
    {
      key: "unassigned",
      title: "Unassigned",
      value: String(unassignedTicketsCount),
      icon: UserMinus,
      iconColor: "indigo" as const,
      changeDirection: unassignedTicketsCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(unassignedTicketsCount),
      footerText: "tickets need an engineer",
    },
    {
      key: "slaBreach",
      title: "SLA breached",
      value: String(slaBreachedCount),
      icon: HourglassHigh,
      iconColor: "purple" as const,
      changeDirection: slaBreachedCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(slaBreachedCount),
      footerText: "breached SLA",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-muted-foreground text-sm">
          Assign engineers, track workload, and keep every open repair moving at {facility.name}.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TicketsTab)}>
        <TabsList variant="line" className="group-data-horizontal/tabs:h-9">
          <TabsTrigger value="tickets" className="text-sm">
            Tickets
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ticketSummaryCards.map((card) => (
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
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Open tickets</CardTitle>
                  <CardDescription>All open tickets, most urgent first</CardDescription>
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
            </CardHeader>
            {activeTickets.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Engineer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                          <TableCell className="font-medium">{ticket.equipmentDisplayName}</TableCell>
                          <TableCell className="text-muted-foreground">{ticket.location}</TableCell>
                          <TableCell className="text-muted-foreground">{ticket.department}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(ticket.lastUpdated)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={PRIORITY_BADGE[ticket.priority]}>
                              {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{ticket.statusLabel}</TableCell>
                          <TableCell className="w-48">
                            <EngineerSelect
                              value={ticket.engineerId}
                              engineers={engineers}
                              workOrders={liveWorkOrders}
                              onAssign={(engineerId) => assignEngineer(ticket.id, engineerId)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No active tickets right now.</p>
            )}
          </Card>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 px-4 pt-3 pb-2">
              <CardTitle className="text-lg">Engineer workload</CardTitle>
              <CardDescription>Active ticket count per engineer, right now</CardDescription>
            </CardHeader>
            {engineers.length > 0 ? (
              <div className="px-4 pt-2 pb-3">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Engineer</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Active tickets</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {engineers.map((eng) => {
                        const availability = availabilityFor(eng.id, liveWorkOrders);
                        return (
                          <TableRow key={eng.id}>
                            <TableCell className="font-medium">{eng.name}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <span className={`size-1.5 rounded-full ${AVAILABILITY_DOT_CLASS[availability]}`} />
                                {AVAILABILITY_LABEL[availability]}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {activeTicketsCountFor(eng.id, liveWorkOrders)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No active engineers on the team.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 pt-4">
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
                        <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
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
                                ticket.slaBreached
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
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent className="w-full sm:max-w-120">
          {selectedTicket && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle>{selectedTicket.issueType}</SheetTitle>
                <SheetDescription>
                  {selectedTicket.ticketNumber} · {selectedTicket.equipmentDisplayName}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={PRIORITY_BADGE[selectedTicket.priority]}>
                    {selectedTicket.priority.charAt(0) + selectedTicket.priority.slice(1).toLowerCase()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedTicket.slaBreached
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {selectedTicket.statusLabel}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Issue description</p>
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Raised by</p>
                    <p className="text-sm">{selectedTicket.raisedByName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm">{selectedTicket.source}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned engineer</p>
                    {engineers.length > 0 && !selectedTicket.resolvedAt && !selectedTicket.closedAt ? (
                      <EngineerSelect
                        value={selectedTicket.engineerId}
                        engineers={engineers}
                        workOrders={liveWorkOrders}
                        onAssign={(engineerId) => {
                          assignEngineer(selectedTicket.id, engineerId);
                          setSelectedTicket({ ...selectedTicket, engineerId, engineerName: engineers.find((e) => e.id === engineerId)?.name ?? null });
                        }}
                      />
                    ) : (
                      <p className="text-sm">{selectedTicket.engineerName ?? "Unassigned"}</p>
                    )}
                  </div>
                  {selectedTicket.slaDueAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">SLA due</p>
                      <p className="text-sm">{formatDate(selectedTicket.slaDueAt)}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Opened</span>
                      <span>{formatDate(selectedTicket.openedAt)}</span>
                    </div>
                    {selectedTicket.assignedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned</span>
                        <span>{formatDate(selectedTicket.assignedAt)}</span>
                      </div>
                    )}
                    {selectedTicket.resolvedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Resolved</span>
                        <span>{formatDate(selectedTicket.resolvedAt)}</span>
                      </div>
                    )}
                    {selectedTicket.closedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Closed</span>
                        <span>{formatDate(selectedTicket.closedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedTicket.downtimeHours !== undefined || selectedTicket.runtimeHoursAtFailure !== undefined) && (
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    {selectedTicket.downtimeHours !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Downtime</p>
                        <p className="text-sm">{selectedTicket.downtimeHours.toFixed(1)} hrs</p>
                      </div>
                    )}
                    {selectedTicket.runtimeHoursAtFailure !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Runtime hours at failure</p>
                        <p className="text-sm">{selectedTicket.runtimeHoursAtFailure.toLocaleString("en-IN")}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1 border-t pt-4">
                  <p className="text-xs text-muted-foreground">Equipment</p>
                  <Link href={`/equipment/${selectedTicket.equipmentId}`} className="text-sm font-medium hover:underline">
                    {selectedTicket.equipmentDisplayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{selectedTicket.department}</p>
                </div>
              </div>
              <SheetFooter className="border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/equipment/${selectedTicket.equipmentId}`}>View equipment</Link>
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={null}>
      <TicketsContent />
    </Suspense>
  );
}
