"use client";

import { equipmentName } from "@/lib/bems";
import type { PmReportFlow } from "@/hooks/use-pm-report-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { PmSectionProgress } from "@/components/pm-section-progress";
import { PmChecklistItemField } from "@/components/pm-checklist-item-field";
import { Button } from "@/components/ui/button";

export function PmReportSectionStep({ flow }: { flow: PmReportFlow }) {
  const { eq, report, currentSection, sectionIndex, sections } = flow;
  if (!eq || !report || !currentSection) return null;

  const remaining = flow.requiredRemainingInSection();

  return (
    <>
      <StepHeader title={currentSection.title} onBack={flow.prevSection} />
      <div className="border-b bg-muted/30 px-5 py-1.5">
        <p className="truncate text-xs text-muted-foreground">{equipmentName(eq)}</p>
      </div>
      <PmSectionProgress current={sectionIndex} total={sections.length} label={currentSection.title} />

      <div className="flex-1 space-y-3 p-5">
        {currentSection.items.map((item) => (
          <PmChecklistItemField
            key={item.id}
            item={item}
            response={report.responses.find((r) => r.itemId === item.id)}
            onSave={flow.saveResponse}
          />
        ))}
      </div>

      <div className="space-y-2 border-t p-5">
        {remaining > 0 && (
          <p className="text-center text-xs text-muted-foreground">{remaining} checkpoint{remaining === 1 ? "" : "s"} left</p>
        )}
        <Button className="w-full" disabled={remaining > 0} onClick={flow.nextSection}>
          {sectionIndex < sections.length - 1 ? "Next section" : "Continue to findings"}
        </Button>
      </div>
    </>
  );
}
