"use client";

import { ClockCounterClockwise, Wrench } from "@phosphor-icons/react";
import { useDemo, formatDate, getUser, getVendor, TICKET_STATUS_LABEL } from "@/lib/bems";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

/** Read-only field context for a repair in progress -- not a repackaging of the full equipment profile, just enough history to work from. */
export function RepairHistoryDialog({
  equipmentId,
  open,
  onOpenChange,
}: {
  equipmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ticketsList = useDemo((s) => s.tickets);
  const workOrdersList = useDemo((s) => s.workOrders);

  const pastTickets = ticketsList
    .filter((t) => t.equipmentId === equipmentId)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .slice(0, 5);

  const pastJobs = workOrdersList
    .filter((w) => w.equipmentId === equipmentId && w.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="w-full max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Equipment history</DialogTitle>
          <DialogDescription>Recent tickets and completed jobs for this unit</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent tickets</p>
            {pastTickets.length > 0 ? (
              <div className="divide-y divide-border">
                {pastTickets.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.openedAt)}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 bg-muted text-foreground border-transparent">
                      {TICKET_STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ClockCounterClockwise} message="No prior tickets for this unit." />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Completed jobs</p>
            {pastJobs.length > 0 ? (
              <div className="divide-y divide-border">
                {pastJobs.map((w) => {
                  const performedBy = w.performedByUserId ? getUser(w.performedByUserId)?.name : getVendor(w.vendorId ?? "")?.name;
                  return (
                    <div key={w.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm">{w.findings ?? w.type.charAt(0) + w.type.slice(1).toLowerCase()}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(w.completedAt!)}</span>
                      </div>
                      {performedBy && <p className="text-xs text-muted-foreground">{performedBy}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Wrench} message="No completed jobs for this unit yet." />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
