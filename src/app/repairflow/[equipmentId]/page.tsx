"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import { useRepairFlow } from "@/hooks/use-repair-flow";
import { PortalShell } from "@/components/portal-shell";
import { RepairSummaryStep } from "@/components/repair-summary-step";
import { RepairTimerStep } from "@/components/repair-timer-step";
import { RepairOutcomeStep } from "@/components/repair-outcome-step";
import { RepairDoneStep } from "@/components/repair-done-step";

/**
 * Standalone route (not nested under (portal)) wrapping PortalShell
 * directly — same pattern src/app/pmreport/[equipmentId]/page.tsx already
 * uses for multi-screen mobile flows outside the tab-barred portal shell.
 * No SCAN step of its own: entered either from /engineer's ticket list
 * (equipmentId + ticketId already known) or /engineer/scan's own scan.
 */
export default function RepairFlowPage() {
  const params = useParams<{ equipmentId: string }>();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticketId");

  const flow = useRepairFlow(params.equipmentId, ticketId);

  if (!flow.eq) {
    return (
      <PortalShell>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center gap-3 border-b px-4 py-4">
            <Link href="/engineer" aria-label="Back" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
              <CaretLeft size={18} />
            </Link>
            <h1 className="text-base font-semibold">Repair</h1>
          </header>
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">Equipment not found.</p>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="flex flex-1 flex-col">
        {flow.step === "SUMMARY" && <RepairSummaryStep flow={flow} />}
        {flow.step === "TIMER" && <RepairTimerStep flow={flow} />}
        {flow.step === "OUTCOME" && <RepairOutcomeStep flow={flow} />}
        {flow.step === "DONE" && <RepairDoneStep flow={flow} />}
      </div>
    </PortalShell>
  );
}
