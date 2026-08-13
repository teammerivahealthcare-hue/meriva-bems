import { WarningOctagon } from "@phosphor-icons/react";
import { equipmentName, formatDuration } from "@/lib/bems";
import type { QrScanFlow } from "@/hooks/use-qr-scan-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";

export function SessionStep({ flow }: { flow: QrScanFlow }) {
  const { eq } = flow;
  if (!eq) return null;

  return (
    <>
      <StepHeader title="Session in progress" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div>
          <p className="text-sm text-muted-foreground">{equipmentName(eq)}</p>
          <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">{formatDuration(flow.elapsedSeconds)}</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button className="w-full" onClick={flow.handleEndSession}>End session</Button>
          <Button variant="destructive" className="w-full" onClick={() => flow.setStep("BREAKDOWN_FORM")}>
            <WarningOctagon size={16} /> Equipment broke down
          </Button>
        </div>
      </div>
    </>
  );
}
