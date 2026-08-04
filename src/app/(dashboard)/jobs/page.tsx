"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle,
  X,
  Ticket as TicketIcon,
  ShieldWarning,
  UserMinus,
  HourglassHigh,
  ArrowsLeftRight,
  TrashSimple,
  ListChecks,
} from "@phosphor-icons/react";
import {
  facility,
  buildActiveJobs,
  buildClosedJobs,
  formatDate,
  formatINR,
  getEquipmentById,
  getUser,
  getRoom,
  equipmentName,
  useDemo,
  PRIORITY_BADGE,
  type ActiveJob,
  type MovementRequest,
  type CondemnationRecord,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SummaryCard } from "@/components/summary-card";

type JobsTab = "workorders" | "approvals";

interface SettledItem {
  key: string;
  type: "Movement" | "Condemnation";
  equipmentId: string;
  status: "Approved" | "Rejected";
  settledAt: string;
}

type SelectedApproval =
  | { kind: "movement"; data: MovementRequest }
  | { kind: "condemnation"; data: CondemnationRecord };

function JobsApprovalsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<JobsTab>(
    searchParams.get("tab") === "approvals" ? "approvals" : "workorders"
  );

  const activeJobs = buildActiveJobs();
  const closedJobs = buildClosedJobs().slice(0, 10);
  const [selectedJob, setSelectedJob] = useState<ActiveJob | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<SelectedApproval | null>(null);

  const criticalJobsCount = activeJobs.filter((j) => j.priority === "CRITICAL").length;
  const unassignedJobsCount = activeJobs.filter((j) => !j.engineerName).length;
  const slaBreachedCount = activeJobs.filter((j) => j.slaBreached).length;

  const jobSummaryCards = [
    {
      key: "tickets",
      title: "Open jobs",
      value: String(activeJobs.length),
      icon: TicketIcon,
      changeDirection: slaBreachedCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(slaBreachedCount),
      footerText: "SLA breached",
    },
    {
      key: "critical",
      title: "Critical priority",
      value: String(criticalJobsCount),
      icon: ShieldWarning,
      changeDirection: criticalJobsCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(criticalJobsCount),
      footerText: "critical jobs open",
    },
    {
      key: "unassigned",
      title: "Unassigned",
      value: String(unassignedJobsCount),
      icon: UserMinus,
      changeDirection: unassignedJobsCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(unassignedJobsCount),
      footerText: "jobs need an engineer",
    },
    {
      key: "slaBreach",
      title: "SLA breached",
      value: String(slaBreachedCount),
      icon: HourglassHigh,
      changeDirection: slaBreachedCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(slaBreachedCount),
      footerText: "breached SLA",
    },
  ];

  const movementRequests = useDemo((s) => s.movementRequests);
  const condemnationRecords = useDemo((s) => s.condemnationRecords);
  const approveMovement = useDemo((s) => s.approveMovement);
  const rejectMovement = useDemo((s) => s.rejectMovement);
  const approveCondemnation = useDemo((s) => s.approveCondemnation);
  const rejectCondemnation = useDemo((s) => s.rejectCondemnation);

  const pendingMoves = movementRequests.filter(
    (m) => m.approvalStatus === "PENDING" || m.flaggedUnapproved
  );
  const pendingCondemnations = condemnationRecords.filter((c) => !c.approvedAt && !c.rejectedAt);
  const totalPendingApprovals = pendingMoves.length + pendingCondemnations.length;

  const settledMoves: SettledItem[] = movementRequests
    .filter((m) => m.approvalStatus !== "PENDING" && !m.flaggedUnapproved)
    .map((m) => ({
      key: `move-${m.id}`,
      type: "Movement",
      equipmentId: m.equipmentId,
      status: m.approvalStatus === "REJECTED" ? "Rejected" : "Approved",
      settledAt: m.approvedAt ?? m.initiatedAt,
    }));
  const settledCondemnations: SettledItem[] = condemnationRecords
    .filter((c) => c.approvedAt || c.rejectedAt)
    .map((c) => ({
      key: `cnd-${c.id}`,
      type: "Condemnation",
      equipmentId: c.equipmentId,
      status: c.rejectedAt ? "Rejected" : "Approved",
      settledAt: (c.approvedAt ?? c.rejectedAt)!,
    }));
  const recentlySettled = [...settledMoves, ...settledCondemnations]
    .sort((a, b) => b.settledAt.localeCompare(a.settledAt))
    .slice(0, 10);

  const flaggedUnapprovedCount = pendingMoves.filter((m) => m.flaggedUnapproved).length;

  const approvalSummaryCards = [
    {
      key: "movementApprovals",
      title: "Movement approvals",
      value: String(pendingMoves.length),
      icon: ArrowsLeftRight,
      changeDirection: flaggedUnapprovedCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(flaggedUnapprovedCount),
      footerText: "flagged unapproved",
    },
    {
      key: "condemnationApprovals",
      title: "Condemnation approvals",
      value: String(pendingCondemnations.length),
      icon: TrashSimple,
      changeDirection: pendingCondemnations.length > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(pendingCondemnations.length),
      footerText: "pending review",
    },
    {
      key: "totalApprovals",
      title: "Total pending",
      value: String(totalPendingApprovals),
      icon: ListChecks,
      changeDirection: totalPendingApprovals > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(totalPendingApprovals),
      footerText: "across all types",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Jobs &amp; Approvals</h1>
        <p className="text-muted-foreground text-sm">
          Internal repair work orders and pending equipment movement / condemnation requests at{" "}
          {facility.name}.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as JobsTab)}>
        <TabsList variant="line" className="group-data-horizontal/tabs:h-9">
          <TabsTrigger value="workorders" className="text-sm">
            Work orders
          </TabsTrigger>
          <TabsTrigger value="approvals" className="text-sm">
            Approvals{totalPendingApprovals > 0 ? ` · ${totalPendingApprovals}` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workorders" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {jobSummaryCards.map((card) => (
              <SummaryCard
                key={card.key}
                title={card.title}
                value={card.value}
                icon={card.icon}
                changeDirection={card.changeDirection}
                footerLeadText={card.footerLeadText}
                footerText={card.footerText}
                showChevron={false}
              />
            ))}
          </div>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 border-b px-4 py-3">
              <CardTitle className="text-base">Open jobs</CardTitle>
              <CardDescription>All open tickets, most urgent first</CardDescription>
            </CardHeader>
            {activeJobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Engineer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeJobs.map((job) => (
                    <TableRow key={job.id} className="cursor-pointer" onClick={() => setSelectedJob(job)}>
                      <TableCell>
                        <p className="font-medium">{job.equipmentDisplayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.department} · Updated {formatDate(job.lastUpdated)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PRIORITY_BADGE[job.priority]}>
                          {job.priority.charAt(0) + job.priority.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{job.statusLabel}</TableCell>
                      <TableCell className="text-muted-foreground">{job.engineerName ?? "Unassigned"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No active jobs right now.</p>
            )}
          </Card>

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 border-b px-4 py-3">
              <CardTitle className="text-base">Recently completed</CardTitle>
              <CardDescription>Resolved or closed jobs, most recent first</CardDescription>
            </CardHeader>
            {closedJobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Time to complete</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedJobs.map((job) => (
                    <TableRow key={job.id} className="cursor-pointer" onClick={() => setSelectedJob(job)}>
                      <TableCell>
                        <p className="font-medium">{job.equipmentDisplayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.department} · {formatDate(job.lastUpdated)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PRIORITY_BADGE[job.priority]}>
                          {job.priority.charAt(0) + job.priority.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{job.engineerName ?? "Unassigned"}</TableCell>
                      <TableCell className="text-muted-foreground">{job.timeToComplete ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            job.slaBreached
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }
                        >
                          {job.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No completed jobs yet.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {approvalSummaryCards.map((card) => (
              <SummaryCard
                key={card.key}
                title={card.title}
                value={card.value}
                icon={card.icon}
                changeDirection={card.changeDirection}
                footerLeadText={card.footerLeadText}
                footerText={card.footerText}
                showChevron={false}
              />
            ))}
          </div>

          {totalPendingApprovals === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle size={28} weight="fill" className="text-emerald-600" />
                </span>
                <p className="text-sm font-medium">Nothing pending review</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  All movement and condemnation requests have been settled. New requests will show up here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden p-0 gap-0">
                <CardHeader className="gap-0 border-b px-4 py-3">
                  <CardTitle className="text-base">Movement approvals</CardTitle>
                  <CardDescription>Pending equipment relocations, flagged unapproved moves first</CardDescription>
                </CardHeader>
                {pendingMoves.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Initiated by</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Accessories</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingMoves.map((m) => {
                        const eq = getEquipmentById(m.equipmentId);
                        const fromRoom = getRoom(m.fromRoomId);
                        const toRoom = getRoom(m.toRoomId);
                        const initiator = getUser(m.initiatedByUserId);
                        return (
                          <TableRow
                            key={m.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedApproval({ kind: "movement", data: m })}
                          >
                            <TableCell>
                              {eq ? (
                                <Link
                                  href={`/equipment/${eq.id}`}
                                  className="font-medium hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {equipmentName(eq)}
                                </Link>
                              ) : (
                                <span className="font-medium">Unknown equipment</span>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {fromRoom?.name ?? "—"} → {toRoom?.name ?? "—"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  m.flaggedUnapproved
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }
                              >
                                {m.flaggedUnapproved ? "Unapproved" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{initiator?.name ?? "Unknown"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(m.initiatedAt)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {m.accessoryCheckIns.length > 0 ? m.accessoryCheckIns.length : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="approve"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approveMovement(m.id);
                                  }}
                                >
                                  <Check /> Approve
                                </Button>
                                <Button
                                  variant="decline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rejectMovement(m.id);
                                  }}
                                >
                                  <X /> Decline
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">No movement approvals pending.</p>
                )}
              </Card>

              <Card className="overflow-hidden p-0 gap-0">
                <CardHeader className="gap-0 border-b px-4 py-3">
                  <CardTitle className="text-base">Condemnation approvals</CardTitle>
                  <CardDescription>Awaiting biomedical sign-off</CardDescription>
                </CardHeader>
                {pendingCondemnations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested by</TableHead>
                        <TableHead>Breakdowns (12m)</TableHead>
                        <TableHead>Repair cost (12m)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCondemnations.map((c) => {
                        const eq = getEquipmentById(c.equipmentId);
                        const requester = getUser(c.requestedByUserId);
                        return (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedApproval({ kind: "condemnation", data: c })}
                          >
                            <TableCell>
                              {eq ? (
                                <Link
                                  href={`/equipment/${eq.id}`}
                                  className="font-medium hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {equipmentName(eq)}
                                </Link>
                              ) : (
                                <span className="font-medium">Unknown equipment</span>
                              )}
                              <p className="max-w-64 truncate text-xs text-muted-foreground">{c.justification}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                Pending
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{requester?.name ?? "Unknown"}</TableCell>
                            <TableCell className="text-muted-foreground">{c.breakdownCountLast12m}</TableCell>
                            <TableCell className="text-muted-foreground">{formatINR(c.repairCostLast12m)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="approve"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approveCondemnation(c.id);
                                  }}
                                >
                                  <Check /> Approve
                                </Button>
                                <Button
                                  variant="decline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rejectCondemnation(c.id);
                                  }}
                                >
                                  <X /> Decline
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">No condemnation requests awaiting approval.</p>
                )}
              </Card>
            </>
          )}

          <Card className="overflow-hidden p-0 gap-0">
            <CardHeader className="gap-0 border-b px-4 py-3">
              <CardTitle className="text-base">Recently settled</CardTitle>
              <CardDescription>Movement and condemnation requests, most recently settled first</CardDescription>
            </CardHeader>
            {recentlySettled.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlySettled.map((item) => {
                    const eq = getEquipmentById(item.equipmentId);
                    return (
                      <TableRow key={item.key}>
                        <TableCell className="font-medium">
                          {eq ? equipmentName(eq) : "Unknown equipment"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.status === "Rejected"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(item.settledAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Nothing settled yet.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent>
          {selectedJob && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle>{selectedJob.issueType}</SheetTitle>
                <SheetDescription>
                  {selectedJob.ticketNumber} · {selectedJob.equipmentDisplayName}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={PRIORITY_BADGE[selectedJob.priority]}>
                    {selectedJob.priority.charAt(0) + selectedJob.priority.slice(1).toLowerCase()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedJob.slaBreached
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {selectedJob.statusLabel}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Issue description</p>
                  <p className="text-sm">{selectedJob.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Raised by</p>
                    <p className="text-sm">{selectedJob.raisedByName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm">{selectedJob.source}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned engineer</p>
                    <p className="text-sm">{selectedJob.engineerName ?? "Unassigned"}</p>
                  </div>
                  {selectedJob.slaDueAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">SLA due</p>
                      <p className="text-sm">{formatDate(selectedJob.slaDueAt)}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Opened</span>
                      <span>{formatDate(selectedJob.openedAt)}</span>
                    </div>
                    {selectedJob.assignedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned</span>
                        <span>{formatDate(selectedJob.assignedAt)}</span>
                      </div>
                    )}
                    {selectedJob.resolvedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Resolved</span>
                        <span>{formatDate(selectedJob.resolvedAt)}</span>
                      </div>
                    )}
                    {selectedJob.closedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Closed</span>
                        <span>{formatDate(selectedJob.closedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedJob.downtimeHours !== undefined || selectedJob.runtimeHoursAtFailure !== undefined) && (
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    {selectedJob.downtimeHours !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Downtime</p>
                        <p className="text-sm">{selectedJob.downtimeHours.toFixed(1)} hrs</p>
                      </div>
                    )}
                    {selectedJob.runtimeHoursAtFailure !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Runtime hours at failure</p>
                        <p className="text-sm">{selectedJob.runtimeHoursAtFailure.toLocaleString("en-IN")}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1 border-t pt-4">
                  <p className="text-xs text-muted-foreground">Equipment</p>
                  <Link href={`/equipment/${selectedJob.equipmentId}`} className="text-sm font-medium hover:underline">
                    {selectedJob.equipmentDisplayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{selectedJob.department}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <SheetContent>
          {selectedApproval?.kind === "movement" &&
            (() => {
              const m = selectedApproval.data;
              const eq = getEquipmentById(m.equipmentId);
              const fromRoom = getRoom(m.fromRoomId);
              const toRoom = getRoom(m.toRoomId);
              const initiator = getUser(m.initiatedByUserId);
              return (
                <>
                  <SheetHeader className="border-b">
                    <SheetTitle>{eq ? equipmentName(eq) : "Unknown equipment"}</SheetTitle>
                    <SheetDescription>
                      {fromRoom?.name ?? "—"} → {toRoom?.name ?? "—"}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 space-y-5 overflow-y-auto px-4">
                    <Badge
                      variant="outline"
                      className={
                        m.flaggedUnapproved
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {m.flaggedUnapproved ? "Unapproved" : "Pending"}
                    </Badge>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Initiated by</p>
                        <p className="text-sm">{initiator?.name ?? "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Initiated on</p>
                        <p className="text-sm">{formatDate(m.initiatedAt)}</p>
                      </div>
                    </div>

                    {m.accessoryCheckIns.length > 0 && (
                      <div className="space-y-2 border-t pt-4">
                        <p className="text-xs font-medium text-muted-foreground">Accessories checked in</p>
                        <div className="space-y-1.5 text-sm">
                          {m.accessoryCheckIns.map((a) => (
                            <div key={a.accessoryId} className="flex items-center justify-between">
                              <span className="text-muted-foreground">{a.accessoryId}</span>
                              <span>{a.state.replace(/_/g, " ").toLowerCase()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 border-t pt-4">
                      <p className="text-xs text-muted-foreground">Equipment</p>
                      {eq ? (
                        <Link href={`/equipment/${eq.id}`} className="text-sm font-medium hover:underline">
                          {equipmentName(eq)}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">Unknown equipment</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

          {selectedApproval?.kind === "condemnation" &&
            (() => {
              const c = selectedApproval.data;
              const eq = getEquipmentById(c.equipmentId);
              const requester = getUser(c.requestedByUserId);
              return (
                <>
                  <SheetHeader className="border-b">
                    <SheetTitle>{eq ? equipmentName(eq) : "Unknown equipment"}</SheetTitle>
                    <SheetDescription>Condemnation request</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 space-y-5 overflow-y-auto px-4">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Pending
                    </Badge>

                    <div>
                      <p className="text-xs text-muted-foreground">Justification</p>
                      <p className="text-sm">{c.justification}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Requested by</p>
                        <p className="text-sm">{requester?.name ?? "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Breakdowns (12m)</p>
                        <p className="text-sm">{c.breakdownCountLast12m}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Repair cost (12m)</p>
                      <p className="text-sm">{formatINR(c.repairCostLast12m)}</p>
                    </div>

                    <div className="space-y-1 border-t pt-4">
                      <p className="text-xs text-muted-foreground">Equipment</p>
                      {eq ? (
                        <Link href={`/equipment/${eq.id}`} className="text-sm font-medium hover:underline">
                          {equipmentName(eq)}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">Unknown equipment</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsApprovalsContent />
    </Suspense>
  );
}
