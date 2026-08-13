import Link from "next/link";
import { CheckCircle, House, WarningOctagon } from "@phosphor-icons/react";
import { formatDuration } from "@/lib/bems";
import type { QrScanFlow } from "@/hooks/use-qr-scan-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";

export function MovedScreen({ flow }: { flow: QrScanFlow }) {
  return (
    <>
      <StepHeader title="Movement" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle size={48} weight="fill" className="text-emerald-500" />
        <div>
          <p className="text-sm font-medium">{flow.movedMessage}</p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/home"><House size={16} /> Back to home</Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={flow.reset}>
            Scan another
          </Button>
        </div>
      </div>
    </>
  );
}

export function EndedScreen({ flow }: { flow: QrScanFlow }) {
  return (
    <>
      <StepHeader title="Session ended" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle size={48} weight="fill" className="text-emerald-500" />
        <div>
          <p className="text-sm font-medium">Session recorded</p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(flow.finalDurationSeconds)} {flow.isEmergencyFlow ? "logged as emergency" : "confirmed"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/home"><House size={16} /> Back to home</Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={flow.reset}>
            Scan another
          </Button>
        </div>
      </div>
    </>
  );
}

export function DownScreen() {
  return (
    <>
      <StepHeader title="Breakdown reported" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <WarningOctagon size={48} weight="fill" className="text-red-500" />
        <div>
          <p className="text-sm font-medium">Ticket created — equipment marked down</p>
          <p className="text-xs text-muted-foreground">Biomedical has been alerted.</p>
        </div>
        <Button asChild className="w-full">
          <Link href="/home"><House size={16} /> Back to home</Link>
        </Button>
      </div>
    </>
  );
}
