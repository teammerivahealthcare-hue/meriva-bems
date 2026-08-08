"use client";

import { useState } from "react";
import { Wrench } from "@phosphor-icons/react";
import { useDemo, availabilityFor, activeTicketsCountFor, AVAILABILITY_DOT_CLASS } from "@/lib/bems";
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
}

/** Trigger + dialog for picking which engineer takes this unit's open ticket — same Select/availability pattern as the Tickets page. */
export function AssignEngineerDialog({ ticketId, disabled = false }: AssignEngineerDialogProps) {
  const teamMembers = useDemo((s) => s.teamMembers);
  const workOrders = useDemo((s) => s.workOrders);
  const assignEngineer = useDemo((s) => s.assignEngineer);
  const [open, setOpen] = useState(false);
  const [engineerId, setEngineerId] = useState<string | null>(null);

  const engineers = teamMembers.filter((m) => m.role === "ENGINEER" && m.active);

  function handleOpenChange(next: boolean) {
    setOpen(next);
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
      <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled={disabled} onClick={() => handleOpenChange(true)}>
        <Wrench size={14} /> Assign service
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton className="w-full max-w-sm gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Assign service</DialogTitle>
            <DialogDescription>Choose which engineer should take this unit&apos;s open ticket.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 px-5 py-4">
            <label className="text-sm font-medium">Engineer</label>
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
          <DialogFooter className="rounded-b-none p-8">
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
