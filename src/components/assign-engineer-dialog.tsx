"use client";

import { useState } from "react";
import { Wrench } from "@phosphor-icons/react";
import {
  useDemo,
  availabilityFor,
  activeTicketsCountFor,
  AVAILABILITY_DOT_CLASS,
  buildActiveTickets,
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
  /** The unit's open ticket to attach the work order to — null disables assigning even if the trigger is enabled. */
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
 * Trigger + dialog for a ticket: full context (issue, location, timeline,
 * downtime) plus picking which engineer takes it — the same Select/
 * availability pattern as the Tickets page, now with the detail view that
 * used to live in a separate dialog folded in, since assigning is rarely
 * useful without knowing what you're assigning.
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
  const ticket = ticketId ? buildActiveTickets(tickets, workOrders).find((t) => t.id === ticketId) : undefined;

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
        <DialogContent showCloseButton className="w-full max-w-xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            {ticket ? (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl leading-tight">{ticket.equipmentDisplayName}</DialogTitle>
                  <DialogDescription>
                    {ticket.ticketNumber} · {ticket.issueType}
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Badge variant="outline" className={PRIORITY_BADGE[ticket.priority as keyof typeof PRIORITY_BADGE]}>
                    {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                  </Badge>
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

          <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
            {ticket && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Issue description</p>
                  <p className="text-sm">{ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Location" value={ticket.location} />
                  <Field label="Department" value={ticket.department} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Raised by" value={ticket.raisedByName} />
                  <Field label="Source" value={ticket.source} />
                </div>

                {(ticket.responseDueAt || ticket.downtimeHours !== undefined || ticket.runtimeHoursAtFailure !== undefined) && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Response due" value={ticket.responseDueAt ? formatDate(ticket.responseDueAt) : undefined} />
                    <Field
                      label="Downtime"
                      value={ticket.downtimeHours !== undefined ? `${ticket.downtimeHours.toFixed(1)} hrs` : undefined}
                    />
                    <Field
                      label="Runtime hours at failure"
                      value={ticket.runtimeHoursAtFailure !== undefined ? ticket.runtimeHoursAtFailure.toLocaleString("en-IN") : undefined}
                    />
                  </div>
                )}

                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Opened</span>
                      <span>{formatDate(ticket.openedAt)}</span>
                    </div>
                    {ticket.assignedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned</span>
                        <span>{formatDate(ticket.assignedAt)}</span>
                      </div>
                    )}
                    {ticket.resolvedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Resolved</span>
                        <span>{formatDate(ticket.resolvedAt)}</span>
                      </div>
                    )}
                    {ticket.closedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Closed</span>
                        <span>{formatDate(ticket.closedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5 border-t pt-4">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Wrench size={14} className="text-muted-foreground" /> Assign engineer
              </label>
              <Select value={engineerId ?? undefined} onValueChange={setEngineerId}>
                <SelectTrigger className="w-full">
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
            </div>
          </div>

          <DialogFooter className="rounded-b-none border-t px-6 py-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!engineerId} onClick={handleConfirm}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
