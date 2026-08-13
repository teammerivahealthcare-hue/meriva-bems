import { rooms, type MovementKind } from "@/lib/bems";
import type { QrScanFlow } from "@/hooks/use-qr-scan-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MovementFormStep({ flow }: { flow: QrScanFlow }) {
  const { eq } = flow;
  if (!eq) return null;

  return (
    <>
      <StepHeader title="Log movement" onBack={() => flow.setStep("GATE")} />
      <div className="flex-1 space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Moving to</label>
          <Select value={flow.moveToRoomId ?? undefined} onValueChange={flow.setMoveToRoomId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select destination room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.filter((r) => r.id !== eq.roomId).map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Is this temporary or permanent?</p>
          <RadioGroup value={flow.moveKind} onValueChange={(v) => flow.setMoveKind(v as MovementKind)} className="gap-2">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="TEMPORARY" /> Temporary — it&apos;ll come back
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="PERMANENT" /> Permanent relocation
            </label>
          </RadioGroup>
        </div>

        {flow.moveKind === "TEMPORARY" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Expected return date (optional)
            </label>
            <input
              type="date"
              value={flow.moveExpectedReturn}
              onChange={(e) => flow.setMoveExpectedReturn(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</label>
          <Textarea value={flow.moveNote} onChange={(e) => flow.setMoveNote(e.target.value)} rows={3} />
        </div>

        <Button className="w-full" disabled={!flow.moveToRoomId} onClick={flow.handleLogMovement}>
          Log movement
        </Button>
      </div>
    </>
  );
}
