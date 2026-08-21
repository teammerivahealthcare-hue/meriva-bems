"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemo, PRIORITY_RANK, type RepairOutcome, type OperationalStatus, type PortalAvailability } from "@/lib/bems";

export type RepairFlowStep = "SUMMARY" | "TIMER" | "OUTCOME" | "DONE";

/**
 * All state and handlers for the repair flow, mirroring usePmReportFlow's
 * shape (one hook, one big returned object, small presentational step
 * components read off it). No SCAN step of its own -- like /pmreport, this
 * route only ever gets entered with the equipment already resolved (from
 * the /engineer ticket list, or from /engineer/scan's own scan step).
 */
export function useRepairFlow(equipmentId: string, initialTicketId: string | null) {
  const equipmentList = useDemo((s) => s.equipment);
  const ticketsList = useDemo((s) => s.tickets);
  const workOrdersList = useDemo((s) => s.workOrders);
  const engineerAvailability = useDemo((s) => s.engineerAvailability);
  const startRepairJobAction = useDemo((s) => s.startRepairJob);
  const completeRepairJobAction = useDemo((s) => s.completeRepairJob);

  const [step, setStep] = useState<RepairFlowStep>("SUMMARY");
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [outcome, setOutcome] = useState<RepairOutcome | null>(null);
  const [previousOperationalStatus, setPreviousOperationalStatus] = useState<OperationalStatus | null>(null);
  const [previousAvailability, setPreviousAvailability] = useState<PortalAvailability | null>(null);

  const eq = equipmentList.find((e) => e.id === equipmentId);

  const ticket = useMemo(() => {
    if (initialTicketId) return ticketsList.find((t) => t.id === initialTicketId);
    return ticketsList
      .filter((t) => t.equipmentId === equipmentId && t.status !== "RESOLVED" && t.status !== "CLOSED")
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.openedAt.localeCompare(b.openedAt))[0];
    // Re-resolve only when the target changes, not on every ticket-list update
    // (that would swap the ticket out from under an in-progress repair).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId, initialTicketId]);

  const workOrder = workOrderId ? workOrdersList.find((w) => w.id === workOrderId) : undefined;

  useEffect(() => {
    if (step !== "TIMER" || !workOrder) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - new Date(workOrder.startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, workOrder]);

  function startRepair() {
    if (!eq || !ticket) return;
    setPreviousOperationalStatus(eq.operationalStatus);
    setPreviousAvailability(engineerAvailability);
    const id = startRepairJobAction({ ticketId: ticket.id, equipmentId });
    setWorkOrderId(id);
    setElapsedSeconds(0);
    setStep("TIMER");
  }

  function endRepair() {
    setStep("OUTCOME");
  }

  function submitOutcome(chosen: RepairOutcome, notes?: string) {
    if (!workOrderId || !ticket || previousOperationalStatus === null || previousAvailability === null) return;
    completeRepairJobAction({
      workOrderId,
      ticketId: ticket.id,
      outcome: chosen,
      notes,
      previousOperationalStatus,
      previousAvailability,
    });
    setOutcome(chosen);
    setStep("DONE");
  }

  return {
    step, setStep,
    eq, ticket, workOrder, elapsedSeconds, outcome,
    startRepair, endRepair, submitOutcome,
  };
}

export type RepairFlow = ReturnType<typeof useRepairFlow>;
