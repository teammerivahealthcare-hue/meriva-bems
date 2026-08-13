import { QrCode } from "@phosphor-icons/react";
import type { QrScanFlow } from "@/hooks/use-qr-scan-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ScanStep({ flow }: { flow: QrScanFlow }) {
  return (
    <>
      <StepHeader title="Scan equipment" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <button
          type="button"
          onClick={flow.handleScan}
          className="flex size-32 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary transition-colors hover:bg-primary/10"
        >
          <QrCode size={40} weight="bold" />
          <span className="text-xs font-medium">Tap to scan</span>
        </button>
        <p className="max-w-52 text-xs text-muted-foreground">
          No camera in this demo — tapping simulates scanning an equipment&apos;s QR sticker and takes you
          straight to it.
        </p>

        <div className="mt-2 flex w-full max-w-xs items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or enter manually
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={flow.handleManualSubmit} className="flex w-full max-w-xs flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Input
              value={flow.manualAssetId}
              onChange={(e) => {
                flow.setManualAssetId(e.target.value);
                flow.setManualError(false);
              }}
              placeholder="Asset ID, e.g. SMH/RAD/0007"
              aria-label="Asset ID"
            />
            <Button type="submit" variant="outline">
              Go
            </Button>
          </div>
          {flow.manualError && (
            <p className="text-left text-xs text-destructive">No equipment found with that Asset ID.</p>
          )}
        </form>
      </div>
    </>
  );
}
