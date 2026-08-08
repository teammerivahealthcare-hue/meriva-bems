"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  QrCode, CaretLeft, CheckCircle, WarningCircle, Prohibit, WarningOctagon, House, CloudArrowUp, Trash,
  ArrowsLeftRight,
} from "@phosphor-icons/react";
import {
  equipment, equipmentName, getEquipmentById, evaluateGate, computeFlags, formatDuration, useDemo,
  rooms, getRoom, formatDate,
} from "@/lib/bems";
import type { GateEvaluation, MovementKind } from "@/lib/bems";
import { PortalShell } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step =
  | "SCAN" | "GATE" | "EMERGENCY_TIME" | "EMERGENCY_ACTION" | "SESSION" | "BREAKDOWN_FORM"
  | "MOVEMENT_FORM" | "MOVED" | "ENDED" | "DOWN";

/** No camera in this demo, so a tap resolves straight to the one QR-tagged unit prepared for the live scan demo. */
const SCAN_DEMO_ASSET_ID = "SMH/ICU/0012";

const GATE_STYLES: Record<GateEvaluation["state"], { icon: typeof CheckCircle; wrap: string; iconClass: string }> = {
  GREEN: { icon: CheckCircle, wrap: "bg-emerald-50 border-emerald-200", iconClass: "text-emerald-600" },
  AMBER: { icon: WarningCircle, wrap: "bg-amber-50 border-amber-200", iconClass: "text-amber-600" },
  RED: { icon: Prohibit, wrap: "bg-red-50 border-red-200", iconClass: "text-red-600" },
};

function StepHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-4">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <CaretLeft size={18} />
        </button>
      ) : (
        <Link href="/home" aria-label="Back to home" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <CaretLeft size={18} />
        </Link>
      )}
      <h1 className="text-base font-semibold">{title}</h1>
    </header>
  );
}

export default function QrScanStartPage() {
  const [step, setStep] = useState<Step>("SCAN");
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [expectedMinutes, setExpectedMinutes] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finalDurationSeconds, setFinalDurationSeconds] = useState(0);
  const [isEmergencyFlow, setIsEmergencyFlow] = useState(false);
  const [emergencyDuration, setEmergencyDuration] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [manualAssetId, setManualAssetId] = useState("");
  const [manualError, setManualError] = useState(false);
  const [moveToRoomId, setMoveToRoomId] = useState<string | null>(null);
  const [moveKind, setMoveKind] = useState<MovementKind>("TEMPORARY");
  const [moveExpectedReturn, setMoveExpectedReturn] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [movedMessage, setMovedMessage] = useState("");
  const [returnedWithAccessories, setReturnedWithAccessories] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = useDemo((s) => s.activeSession);
  const startSession = useDemo((s) => s.startSession);
  const stopSession = useDemo((s) => s.stopSession);
  const flagBreakdown = useDemo((s) => s.flagBreakdown);
  const logEmergencyUse = useDemo((s) => s.logEmergencyUse);
  const warrantyOverrideRequests = useDemo((s) => s.warrantyOverrideRequests);
  const requestWarrantyOverride = useDemo((s) => s.requestWarrantyOverride);
  const movementRequests = useDemo((s) => s.movementRequests);
  const initiateMovement = useDemo((s) => s.initiateMovement);
  const confirmMovementReturn = useDemo((s) => s.confirmMovementReturn);
  const portalUserId = useDemo((s) => s.portalUserId);

  const eq = equipmentId ? getEquipmentById(equipmentId) : undefined;
  const gate = eq ? evaluateGate(eq) : null;
  const activeLoan = eq
    ? movementRequests.find(
        (m) => m.equipmentId === eq.id && m.approvalStatus === "APPROVED" && m.movementKind === "TEMPORARY" && !m.returnedAt,
      )
    : undefined;

  // Expired warranty is a hard stop distinct from the self-ack AMBER flow — an
  // engineer has to sign off before the unit can be used, not just the person
  // scanning it. Condemned units are excluded: they already go through the
  // separate continued-use-authorisation flow and would otherwise double-block.
  const warrantyBlocked = !!eq && eq.financialStatus !== "CONDEMNED" && computeFlags(eq).includes("WARRANTY_EXPIRED");
  const latestWarrantyRequest = eq
    ? warrantyOverrideRequests
        .filter((r) => r.equipmentId === eq.id)
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0]
    : undefined;
  const warrantyApproved = latestWarrantyRequest?.status === "APPROVED";

  useEffect(() => {
    if (step !== "SESSION" || !activeSession) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, activeSession]);

  function reset() {
    setStep("SCAN");
    setEquipmentId(null);
    setExpectedMinutes("");
    setAcknowledged(false);
    setIssueType("");
    setDescription("");
    setElapsedSeconds(0);
    setFinalDurationSeconds(0);
    setIsEmergencyFlow(false);
    setEmergencyDuration("");
    setPhotoDataUrl(null);
    setManualAssetId("");
    setManualError(false);
    setMoveToRoomId(null);
    setMoveKind("TEMPORARY");
    setMoveExpectedReturn("");
    setMoveNote("");
    setMovedMessage("");
    setReturnedWithAccessories(true);
  }

  function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  /** Resolves a scanned/typed Asset ID to a unit and advances to the gate check. Returns whether it matched. */
  function resolveEquipment(assetId: string) {
    const scanned = equipment.find((e) => e.assetId.trim().toLowerCase() === assetId.trim().toLowerCase());
    if (!scanned) return false;
    setEquipmentId(scanned.id);
    setAcknowledged(false);
    setIsEmergencyFlow(false);
    setEmergencyDuration("");
    setStep("GATE");
    return true;
  }

  function handleScan() {
    resolveEquipment(SCAN_DEMO_ASSET_ID);
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    if (!manualAssetId.trim()) return;
    setManualError(!resolveEquipment(manualAssetId));
  }

  function handleStartSession() {
    if (!eq || !gate?.canProceed) return;
    startSession({
      equipmentId: eq.id,
      expectedDurationMinutes: expectedMinutes ? Number(expectedMinutes) : undefined,
      gateState: gate.state,
      gateAcknowledged: gate.state === "AMBER" ? acknowledged : false,
    });
    setStep("SESSION");
  }

  function handleEndSession() {
    setFinalDurationSeconds(elapsedSeconds);
    stopSession();
    setStep("ENDED");
  }

  function handleLogEmergencySession() {
    if (!eq || !gate) return;
    const minutes = Number(emergencyDuration);
    if (!minutes || minutes <= 0) return;
    logEmergencyUse({ equipmentId: eq.id, durationMinutes: minutes, gateState: gate.state });
    setFinalDurationSeconds(minutes * 60);
    setStep("ENDED");
  }

  function handleSubmitBreakdown() {
    if (!issueType.trim() || !eq) return;
    if (isEmergencyFlow) {
      const minutes = Number(emergencyDuration);
      logEmergencyUse({
        equipmentId: eq.id,
        durationMinutes: minutes || 1,
        gateState: gate?.state ?? "GREEN",
        breakdown: {
          issueType: issueType.trim(),
          description: description.trim() || issueType.trim(),
          photoDataUrl: photoDataUrl ?? undefined,
        },
      });
    } else {
      flagBreakdown(issueType.trim(), description.trim() || issueType.trim(), photoDataUrl ?? undefined);
    }
    setStep("DOWN");
  }

  function handleLogMovement() {
    if (!eq || !moveToRoomId) return;
    initiateMovement({
      equipmentId: eq.id,
      toRoomId: moveToRoomId,
      movementKind: moveKind,
      expectedReturnAt: moveKind === "TEMPORARY" ? moveExpectedReturn || undefined : undefined,
      note: moveNote.trim() || undefined,
    });
    setMovedMessage("Movement logged — pending approval.");
    setStep("MOVED");
  }

  function handleConfirmReturn() {
    if (!activeLoan) return;
    confirmMovementReturn(activeLoan.id, {
      actorUserId: portalUserId,
      returnedWithAllAccessories: returnedWithAccessories,
    });
    setMovedMessage(
      returnedWithAccessories ? "Return confirmed." : "Return confirmed — flagged for a follow-up on accessories.",
    );
    setStep("MOVED");
  }

  return (
    <PortalShell>
      <div className="flex flex-1 flex-col">
        {step === "SCAN" && (
          <>
            <StepHeader title="Scan equipment" />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <button
                type="button"
                onClick={handleScan}
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

              <form
                onSubmit={handleManualSubmit}
                className="flex w-full max-w-xs flex-col gap-1.5"
              >
                <div className="flex gap-1.5">
                  <Input
                    value={manualAssetId}
                    onChange={(e) => {
                      setManualAssetId(e.target.value);
                      setManualError(false);
                    }}
                    placeholder="Asset ID, e.g. SMH/RAD/0007"
                    aria-label="Asset ID"
                  />
                  <Button type="submit" variant="outline">
                    Go
                  </Button>
                </div>
                {manualError && (
                  <p className="text-left text-xs text-destructive">No equipment found with that Asset ID.</p>
                )}
              </form>
            </div>
          </>
        )}

        {step === "GATE" && eq && gate && (
          <>
            <StepHeader title={equipmentName(eq)} onBack={() => setStep("SCAN")} />
            <div className="flex-1 space-y-4 p-5">
              {(() => {
                const { icon: Icon, wrap, iconClass } = GATE_STYLES[gate.state];
                return (
                  <div className={`flex gap-3 rounded-xl border p-4 ${wrap}`}>
                    <Icon size={22} className={`mt-0.5 shrink-0 ${iconClass}`} weight="fill" />
                    <div>
                      <p className="text-sm font-semibold">{gate.headline}</p>
                      {gate.detail && <p className="mt-0.5 text-xs text-muted-foreground">{gate.detail}</p>}
                    </div>
                  </div>
                );
              })()}

              {activeLoan && (
                <div className="flex gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <ArrowsLeftRight size={22} className="mt-0.5 shrink-0 text-cyan-600" weight="fill" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-semibold">
                        On temporary loan to {getRoom(activeLoan.toRoomId)?.name ?? "another location"}
                      </p>
                      {activeLoan.expectedReturnAt && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Expected back {formatDate(activeLoan.expectedReturnAt)}
                        </p>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={returnedWithAccessories}
                        onCheckedChange={(v) => setReturnedWithAccessories(v === true)}
                      />
                      Returned with all accessories
                    </label>
                    <Button size="sm" onClick={handleConfirmReturn}>Confirm it&apos;s back</Button>
                  </div>
                </div>
              )}

              {warrantyBlocked && !warrantyApproved ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {latestWarrantyRequest?.status === "PENDING"
                      ? "An engineer needs to approve continued use before you can start a session on this unit."
                      : "This unit's warranty has expired. Request engineer approval to keep using it."}
                  </p>
                  {latestWarrantyRequest?.status === "PENDING" ? (
                    <Button variant="outline" className="w-full" disabled>
                      Waiting for engineer approval
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => requestWarrantyOverride(eq.id)}>
                      Request approval
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => setStep("SCAN")}>
                    Back to scan
                  </Button>
                </div>
              ) : gate.canProceed ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Expected duration (minutes, optional)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={expectedMinutes}
                      onChange={(e) => setExpectedMinutes(e.target.value)}
                      placeholder="e.g. 30"
                    />
                  </div>

                  {gate.state === "AMBER" && (
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} className="mt-0.5" />
                      I acknowledge this advisory and will proceed.
                    </label>
                  )}

                  <Button
                    className="w-full"
                    disabled={gate.state === "AMBER" && !acknowledged}
                    onClick={handleStartSession}
                  >
                    Start session
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setStep("SCAN")}>
                  Back to scan
                </Button>
              )}

              <Button variant="outline" className="w-full" onClick={() => setStep("MOVEMENT_FORM")}>
                <ArrowsLeftRight size={16} /> Log movement
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsEmergencyFlow(true);
                  setStep("EMERGENCY_TIME");
                }}
                className="mx-auto block text-xs font-medium text-muted-foreground underline underline-offset-2"
              >
                Already used it? Log emergency use instead
              </button>
            </div>
          </>
        )}

        {step === "MOVEMENT_FORM" && eq && (
          <>
            <StepHeader title="Log movement" onBack={() => setStep("GATE")} />
            <div className="flex-1 space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Moving to</label>
                <Select value={moveToRoomId ?? undefined} onValueChange={setMoveToRoomId}>
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
                <RadioGroup value={moveKind} onValueChange={(v) => setMoveKind(v as MovementKind)} className="gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="TEMPORARY" /> Temporary — it&apos;ll come back
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="PERMANENT" /> Permanent relocation
                  </label>
                </RadioGroup>
              </div>

              {moveKind === "TEMPORARY" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Expected return date (optional)
                  </label>
                  <input
                    type="date"
                    value={moveExpectedReturn}
                    onChange={(e) => setMoveExpectedReturn(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</label>
                <Textarea value={moveNote} onChange={(e) => setMoveNote(e.target.value)} rows={3} />
              </div>

              <Button className="w-full" disabled={!moveToRoomId} onClick={handleLogMovement}>
                Log movement
              </Button>
            </div>
          </>
        )}

        {step === "EMERGENCY_TIME" && eq && (
          <>
            <StepHeader title="Log emergency use" onBack={() => setStep("GATE")} />
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
                  value={emergencyDuration}
                  onChange={(e) => setEmergencyDuration(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
              <Button
                className="w-full"
                disabled={!emergencyDuration || Number(emergencyDuration) <= 0}
                onClick={() => setStep("EMERGENCY_ACTION")}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "EMERGENCY_ACTION" && eq && (
          <>
            <StepHeader title="Log emergency use" onBack={() => setStep("EMERGENCY_TIME")} />
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
              <div>
                <p className="text-sm text-muted-foreground">{equipmentName(eq)}</p>
                <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">
                  {formatDuration(Number(emergencyDuration || "0") * 60)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Entered after use</p>
              </div>
              <div className="flex w-full flex-col gap-3">
                <Button className="w-full" onClick={handleLogEmergencySession}>Log session</Button>
                <Button variant="destructive" className="w-full" onClick={() => setStep("BREAKDOWN_FORM")}>
                  <WarningOctagon size={16} /> Equipment broke down
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "SESSION" && eq && (
          <>
            <StepHeader title="Session in progress" />
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
              <div>
                <p className="text-sm text-muted-foreground">{equipmentName(eq)}</p>
                <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">{formatDuration(elapsedSeconds)}</p>
              </div>
              <div className="flex w-full flex-col gap-3">
                <Button className="w-full" onClick={handleEndSession}>End session</Button>
                <Button variant="destructive" className="w-full" onClick={() => setStep("BREAKDOWN_FORM")}>
                  <WarningOctagon size={16} /> Equipment broke down
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "BREAKDOWN_FORM" && eq && (
          <>
            <StepHeader
              title="Flag breakdown"
              onBack={() => setStep(isEmergencyFlow ? "EMERGENCY_ACTION" : "SESSION")}
            />
            <div className="flex-1 space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">What went wrong?</label>
                <Input value={issueType} onChange={(e) => setIssueType(e.target.value)} placeholder="e.g. Detector panel error" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Details (optional)</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Attach photo (optional)</label>
                {photoDataUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoDataUrl} alt="Breakdown" className="size-16 shrink-0 rounded-md object-cover" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoDataUrl(null)}>
                      <Trash size={14} /> Remove photo
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handlePhotoFile(e.dataTransfer.files[0]);
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center"
                  >
                    <CloudArrowUp size={22} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Choose a file or drag it here</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Browse files
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoFile(e.target.files?.[0])}
                />
              </div>
              <Button variant="destructive" className="w-full" disabled={!issueType.trim()} onClick={handleSubmitBreakdown}>
                Submit breakdown report
              </Button>
            </div>
          </>
        )}

        {step === "MOVED" && (
          <>
            <StepHeader title="Movement" />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <CheckCircle size={48} weight="fill" className="text-emerald-500" />
              <div>
                <p className="text-sm font-medium">{movedMessage}</p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <Button asChild className="w-full">
                  <Link href="/home"><House size={16} /> Back to home</Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={reset}>
                  Scan another
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "ENDED" && (
          <>
            <StepHeader title="Session ended" />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <CheckCircle size={48} weight="fill" className="text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Session recorded</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(finalDurationSeconds)} {isEmergencyFlow ? "logged as emergency" : "confirmed"}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <Button asChild className="w-full">
                  <Link href="/home"><House size={16} /> Back to home</Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={reset}>
                  Scan another
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "DOWN" && (
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
        )}
      </div>
    </PortalShell>
  );
}
