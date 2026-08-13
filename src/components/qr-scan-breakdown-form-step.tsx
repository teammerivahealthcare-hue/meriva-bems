import { CloudArrowUp, Trash } from "@phosphor-icons/react";
import type { QrScanFlow } from "@/hooks/use-qr-scan-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function BreakdownFormStep({ flow }: { flow: QrScanFlow }) {
  const { eq } = flow;
  if (!eq) return null;

  return (
    <>
      <StepHeader
        title="Flag breakdown"
        onBack={() => flow.setStep(flow.isEmergencyFlow ? "EMERGENCY_ACTION" : "SESSION")}
      />
      <div className="flex-1 space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">What went wrong?</label>
          <Input value={flow.issueType} onChange={(e) => flow.setIssueType(e.target.value)} placeholder="e.g. Detector panel error" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Details (optional)</label>
          <Textarea value={flow.description} onChange={(e) => flow.setDescription(e.target.value)} rows={4} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Attach photo (optional)</label>
          {flow.photoDataUrl ? (
            <div className="flex items-center gap-3 rounded-lg border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flow.photoDataUrl} alt="Breakdown" className="size-16 shrink-0 rounded-md object-cover" />
              <Button type="button" variant="ghost" size="sm" onClick={() => flow.setPhotoDataUrl(null)}>
                <Trash size={14} /> Remove photo
              </Button>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                flow.handlePhotoFile(e.dataTransfer.files[0]);
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center"
            >
              <CloudArrowUp size={22} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Choose a file or drag it here</p>
              <Button type="button" variant="outline" size="sm" onClick={() => flow.fileInputRef.current?.click()}>
                Browse files
              </Button>
            </div>
          )}
          <input
            ref={flow.fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => flow.handlePhotoFile(e.target.files?.[0])}
          />
        </div>
        <Button variant="destructive" className="w-full" disabled={!flow.issueType.trim()} onClick={flow.handleSubmitBreakdown}>
          Submit breakdown report
        </Button>
      </div>
    </>
  );
}
