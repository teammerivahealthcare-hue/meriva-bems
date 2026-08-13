"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  equipment, getEquipmentById, evaluateGate, computeFlags, useDemo,
} from "@/lib/bems";
import type { GateEvaluation, MovementKind } from "@/lib/bems";

export type QrScanStep =
  | "SCAN" | "GATE" | "EMERGENCY_TIME" | "EMERGENCY_ACTION" | "SESSION" | "BREAKDOWN_FORM"
  | "MOVEMENT_FORM" | "MOVED" | "ENDED" | "DOWN";

/** No camera in this demo, so a tap resolves straight to the one QR-tagged unit prepared for the live scan demo. */
const SCAN_DEMO_ASSET_ID = "SMH/ICU/0012";

/**
 * All state and handlers shared by every scan-and-act flow (nurse, engineer, ...),
 * regardless of which role-specific steps get layered on top. Kept as a single hook
 * so the nurse and engineer pages can diverge in their step sequence/labels while
 * sharing the same equipment-resolution, gate, session, movement, breakdown, and
 * emergency-use mechanics.
 */
export function useQrScanFlow() {
  const [step, setStep] = useState<QrScanStep>("SCAN");
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
  const gate: GateEvaluation | null = eq ? evaluateGate(eq) : null;
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

  return {
    step, setStep,
    eq, gate, activeLoan,
    warrantyBlocked, latestWarrantyRequest, warrantyApproved, requestWarrantyOverride,
    expectedMinutes, setExpectedMinutes,
    acknowledged, setAcknowledged,
    issueType, setIssueType,
    description, setDescription,
    elapsedSeconds, finalDurationSeconds,
    isEmergencyFlow, setIsEmergencyFlow,
    emergencyDuration, setEmergencyDuration,
    photoDataUrl, setPhotoDataUrl, handlePhotoFile, fileInputRef,
    manualAssetId, setManualAssetId, manualError, setManualError,
    moveToRoomId, setMoveToRoomId,
    moveKind, setMoveKind,
    moveExpectedReturn, setMoveExpectedReturn,
    moveNote, setMoveNote,
    movedMessage,
    returnedWithAccessories, setReturnedWithAccessories,
    reset,
    handleScan, handleManualSubmit, resolveEquipment,
    handleStartSession, handleEndSession, handleLogEmergencySession,
    handleSubmitBreakdown, handleLogMovement, handleConfirmReturn,
  };
}

export type QrScanFlow = ReturnType<typeof useQrScanFlow>;
