"use client";

import { useState } from "react";
import { ClockCounterClockwise, MapPin, UserCircle } from "@phosphor-icons/react";
import { equipmentName, getUser, getDepartment, getRoom, formatDate, PRIORITY_BADGE, TICKET_STATUS_LABEL } from "@/lib/bems";
import type { RepairFlow } from "@/hooks/use-repair-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { RepairHistoryDialog } from "@/components/repair-history-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function RepairSummaryStep({ flow }: { flow: RepairFlow }) {
  const { eq, ticket } = flow;
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!eq) return null;

  const dept = getDepartment(eq.departmentId);
  const room = getRoom(eq.roomId);
  const raisedBy = ticket ? getUser(ticket.raisedByUserId) : undefined;

  return (
    <>
      <StepHeader title="Repair" />
      <div className="flex-1 space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{equipmentName(eq)}</h2>
          <p className="font-mono text-xs text-muted-foreground">{eq.assetId}</p>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin size={16} className="shrink-0" />
          {dept ? `${dept.name}${room ? ` · Floor ${room.floor} · ${room.name}` : ""}` : "Location unassigned"}
        </div>

        {ticket ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-muted text-foreground border-transparent">
                {ticket.ticketNumber}
              </Badge>
              <Badge variant="outline" className={PRIORITY_BADGE[ticket.priority]}>
                {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-transparent">
                {TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Issue</p>
              <p className="text-sm">{ticket.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Raised by"
                value={raisedBy?.name}
              />
              <Field label="Opened" value={formatDate(ticket.openedAt)} />
            </div>

            <Button variant="outline" className="w-full" onClick={() => setHistoryOpen(true)}>
              <ClockCounterClockwise size={16} /> View history
            </Button>
          </div>
        ) : (
          <EmptyState icon={UserCircle} message="No open ticket found for this unit." />
        )}

        <Button className="w-full" disabled={!ticket} onClick={flow.startRepair}>
          Start Repair
        </Button>
      </div>

      <RepairHistoryDialog equipmentId={eq.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}
