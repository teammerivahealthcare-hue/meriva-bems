"use client";

import { useState } from "react";
import { CheckCircle, Wrench } from "@phosphor-icons/react";
import {
  useDemo,
  availabilityFor,
  activeTicketsCountFor,
  AVAILABILITY_DOT_CLASS,
  buildActiveTickets,
  buildClosedTickets,
  formatDate,
  PRIORITY_BADGE,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssignEngineerDialogProps {
  /** The ticket this dialog is for — works for both an open ticket (shows the assign section) and a resolved/closed one (shows a read-only completed summary instead). */
  ticketId: string | null;
  disabled?: boolean;
  /** Controlled mode — pass both to drive the dialog from an external trigger (e.g. a ticket card) instead of the built-in button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hides the built-in "Assign service" trigger button — use with controlled `open` when something else opens the dialog. */
  hideTrigger?: boolean;
  /** Fallback header text for the rare case the ticket can't be resolved to full details, e.g. "GE Healthcare Optima XR220 — TKT-2026-0201". */
  contextLabel?: string;
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

/**
 * Ticket detail dialog: full context (issue, location, timeline, downtime)
 * for any ticket. An open ticket gets the assign-engineer section; a
 * resolved/closed one gets a read-only "completed" summary instead — same
 * detail layout either way, since knowing what happened matters whether or
 * not there's still an action to take.
 */
export function AssignEngineerDialog({
  ticketId,
  disabled = false,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideTrigger = false,
  contextLabel,
}: AssignEngineerDialogProps) {
  const tickets = useDemo((s) => s.tickets);
  const teamMembers = useDemo((s) => s.teamMembers);
  const workOrders = useDemo((s) => s.workOrders);
  const assignEngineer = useDemo((s) => s.assignEngineer);
  const [openState, setOpenState] = useState(false);
  const [engineerId, setEngineerId] = useState<string | null>(null);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;

  const engineers = teamMembers.filter((m) => m.role === "ENGINEER" && m.active);
  const activeTicket = ticketId ? buildActiveTickets(tickets, workOrders).find((t) => t.id === ticketId) : undefined;
  const closedTicket = !activeTicket && ticketId ? buildClosedTickets(tickets, workOrders).find((t) => t.id === ticketId) : undefined;
  const ticket = activeTicket ?? closedTicket;
  const isDone = !!closedTicket;

  function handleOpenChange(next: boolean) {
    if (!isControlled) setOpenState(next);
    onOpenChangeProp?.(next);
    if (next) {
      const currentWorkOrder = workOrders.find((w) => w.ticketId === ticketId);
      setEngineerId(currentWorkOrder?.performedByUserId ?? null);
    }
  }

  function handleConfirm() {
    if (!ticketId || !engineerId) return;
    assignEngineer(ticketId, engineerId);
      handleOpenChange(false);
  }

  return (
    <>
      {!hideTrigger && (
        <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={disabled} onClick={() => handleOpenChange(true)}>
          <Wrench size={14} /> Assign service
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton
          className="flex h-110 w-170 max-w-[calc(100%-2rem)] sm:max-w-170 flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 border-b px-6 py-2">
            {ticket ? (
              <div className="space-y-1.5">
                <DialogTitle className="text-xl leading-tight">{ticket.equipmentDisplayName}</DialogTitle>
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="outline" className="bg-muted text-foreground border-transparent">
                    {ticket.ticketNumber}
                  </Badge>
                  <Badge variant="outline" className={PRIORITY_BADGE[ticket.priority as keyof typeof PRIORITY_BADGE]}>
                    {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      isDone
                        ? "bg-emerald-50 text-emerald-700 border-transparent"
                        : ticket.responseOverdue
                          ? "bg-red-50 text-red-700 border-transparent"
                          : "bg-amber-50 text-amber-700 border-transparent"
                    }
                  >
                    {ticket.statusLabel}
                  </Badge>
                </div>
              </div>
            ) : (
              <>
                <DialogTitle>Assign service</DialogTitle>
                <DialogDescription>
                  {contextLabel ? `Choose an engineer for ${contextLabel}.` : "Choose which engineer should take this unit's open ticket."}
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
            {ticket ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Equipment</p>
                  <Field label="Location" value={ticket.location} />
                  <Field label="Department" value={ticket.department} />

                  <div className="space-y-1.5 border-t pt-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Opened</p>
                        <p>{formatDate(ticket.openedAt)}</p>
                      </div>
                      {ticket.assignedAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">Assigned</p>
                          <p>{formatDate(ticket.assignedAt)}</p>
                        </div>
                      )}
                      {ticket.resolvedAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">Resolved</p>
                          <p>{formatDate(ticket.resolvedAt)}</p>
                        </div>
                      )}
                      {ticket.closedAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">Closed</p>
                          <p>{formatDate(ticket.closedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Ticket</p>
                  <div>
                    <p className="text-xs text-muted-foreground">Issue description</p>
                    <p className="line-clamp-2 text-sm">{ticket.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Raised by"
                      value={ticket.raisedByDesignation ? `${ticket.raisedByName}, ${ticket.raisedByDesignation}` : ticket.raisedByName}
                    />
                    <Field label="Source" value={ticket.source} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Response due" value={ticket.responseDueAt ? formatDate(ticket.responseDueAt) : undefined} />
                    <Field
                      label="Downtime"
                      value={ticket.downtimeHours !== undefined ? `${ticket.downtimeHours.toFixed(1)} hrs` : undefined}
                    />
                  </div>
                  <Field
                    label="Runtime hours at failure"
                    value={ticket.runtimeHoursAtFailure !== undefined ? ticket.runtimeHoursAtFailure.toLocaleString("en-IN") : undefined}
                  />

                  {isDone && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" />
                      <div className="text-sm">
                        <p className="font-medium text-emerald-800">
                          Completed by {ticket.engineerName ?? "an engineer"}
                        </p>
                        {ticket.timeToComplete && (
                          <p className="text-emerald-700">Took {ticket.timeToComplete} to complete.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 items-center gap-3 rounded-b-none border-t p-3 sm:flex-row sm:justify-between">
            {isDone ? (
              <Button className="w-full" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Select value={engineerId ?? undefined} onValueChange={setEngineerId}>
                  <SelectTrigger className="h-9 w-full sm:max-w-65">
                    <Wrench size={14} className="text-muted-foreground" />
                    <SelectValue placeholder="Select an engineer" />
                  </SelectTrigger>
                  <SelectContent>
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
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button disabled={!engineerId} onClick={handleConfirm}>
                    Assign
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
