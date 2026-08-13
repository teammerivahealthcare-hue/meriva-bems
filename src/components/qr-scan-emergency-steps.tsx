import { WarningOctagon } from "@phosphor-icons/react";
import { equipmentName, formatDuration } from "@/lib/bems";
import type { QrScanFlow } from "@/hooks/use-qr-scan-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EmergencyTimeStep({ flow }: { flow: QrScanFlow }) {
  const { eq } = flow;
  if (!eq) return null;

  return (
    <>
      <StepHeader title="Log emergency use" onBack={() => flow.setStep("GATE")} />
      <div className="flex-1 space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Already used {equipmentName(eq)}? No live timer needed — just enter how long, then log it.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            How long did you use it? (minutes)
          </label>
          <Input
            type="number"
            min={1}
            value={flow.emergencyDuration}
            onChange={(e) => flow.setEmergencyDuration(e.target.value)}
            placeholder="e.g. 15"
          />
        </div>
        <Button
          className="w-full"
          disabled={!flow.emergencyDuration || Number(flow.emergencyDuration) <= 0}
          onClick={() => flow.setStep("EMERGENCY_ACTION")}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

export function EmergencyActionStep({ flow }: { flow: QrScanFlow }) {
  const { eq } = flow;
  if (!eq) return null;

  return (
    <>
      <StepHeader title="Log emergency use" onBack={() => flow.setStep("EMERGENCY_TIME")} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div>
          <p className="text-sm text-muted-foreground">{equipmentName(eq)}</p>
          <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">
            {formatDuration(Number(flow.emergencyDuration || "0") * 60)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Entered after use</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button className="w-full" onClick={flow.handleLogEmergencySession}>Log session</Button>
          <Button variant="destructive" className="w-full" onClick={() => flow.setStep("BREAKDOWN_FORM")}>
            <WarningOctagon size={16} /> Equipment broke down
          </Button>
        </div>
      </div>
    </>
  );
}
