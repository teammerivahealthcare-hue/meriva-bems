"use client";

import { equipmentName, formatDuration } from "@/lib/bems";
import type { RepairFlow } from "@/hooks/use-repair-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";

export function RepairTimerStep({ flow }: { flow: RepairFlow }) {
  const { eq } = flow;
  if (!eq) return null;

  return (
    <>
      <StepHeader title="Repair in progress" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div>
          <p className="text-sm text-muted-foreground">{equipmentName(eq)}</p>
          <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">{formatDuration(flow.elapsedSeconds)}</p>
        </div>
        <Button className="w-full" onClick={flow.endRepair}>End Repair</Button>
      </div>
    </>
  );
}
