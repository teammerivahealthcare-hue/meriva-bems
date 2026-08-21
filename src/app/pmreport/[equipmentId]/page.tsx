"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import { usePmReportFlow } from "@/hooks/use-pm-report-flow";
import { PortalShell } from "@/components/portal-shell";
import { PmReportStatusStep } from "@/components/pm-report-status-step";
import { PmReportSectionStep } from "@/components/pm-report-section-step";
import { PmReportFindingsStep } from "@/components/pm-report-findings-step";
import { PmReportOutcomeStep } from "@/components/pm-report-outcome-step";
import { PmReportSignoffStep } from "@/components/pm-report-signoff-step";
import { PmSubmitPendingStep, PmReportDoneStep } from "@/components/pm-report-done-step";

/**
 * Standalone route (not nested under (portal)) wrapping PortalShell
 * directly — a dynamic-equipmentId flow entered from more than one place
 * (the engineer scan flow, or a ticket list), unlike (portal)/*'s fixed
 * dashboard pages.
 */
export default function PmReportPage() {
  const params = useParams<{ equipmentId: string }>();
  const searchParams = useSearchParams();
  const entryMethod = searchParams.get("entry") === "manual" ? "MANUAL" : "QR";

  const flow = usePmReportFlow(params.equipmentId, entryMethod);

  if (!flow.eq) {
    return (
      <PortalShell>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center gap-3 border-b px-4 py-4">
            <Link href="/engineer/scan" aria-label="Back" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
              <CaretLeft size={18} />
            </Link>
            <h1 className="text-base font-semibold">PM report</h1>
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
        {flow.step === "STATUS" && <PmReportStatusStep flow={flow} />}
        {flow.step === "SECTION" && <PmReportSectionStep flow={flow} />}
        {flow.step === "FINDINGS" && <PmReportFindingsStep flow={flow} />}
        {flow.step === "OUTCOME" && <PmReportOutcomeStep flow={flow} />}
        {(flow.step === "SIGNOFF_ENGINEER" || flow.step === "SIGNOFF_COUNTERSIGN") && <PmReportSignoffStep flow={flow} />}
        {flow.step === "SUBMIT_PENDING" && <PmSubmitPendingStep />}
        {flow.step === "DONE" && <PmReportDoneStep flow={flow} />}
      </div>
    </PortalShell>
  );
}
