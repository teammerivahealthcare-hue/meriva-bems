"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useDemo, now, pmTemplateFor, evaluatePmGate, loadDraft, saveDraft, clearDraft,
  type PmTemplate, type PmReportResponse, type PmVerdict, type PmPartUsed, type SignatureRecord,
} from "@/lib/bems";
import { useOnlineStatus } from "@/hooks/use-online-status";

export type PmFlowStep =
  | "STATUS" | "SECTION" | "FINDINGS" | "OUTCOME"
  | "SIGNOFF_ENGINEER" | "SIGNOFF_COUNTERSIGN" | "SUBMIT_PENDING" | "DONE";

/**
 * All state and handlers for the PM report flow, mirroring useQrScanFlow's
 * shape (one hook, one big returned object, small presentational step
 * components read off it) — a parallel family, not a fork, since the two
 * flows share no state.
 */
export function usePmReportFlow(equipmentId: string, entryMethod: "QR" | "MANUAL") {
  const equipmentList = useDemo((s) => s.equipment);
  const pmReports = useDemo((s) => s.pmReports);
  const pmSchedules = useDemo((s) => s.pmSchedules);
  const ticketsList = useDemo((s) => s.tickets);
  const calibrationRecordsList = useDemo((s) => s.calibrationRecords);
  const activeSession = useDemo((s) => s.activeSession);

  const startPmReportAction = useDemo((s) => s.startPmReport);
  const resumePmReportAction = useDemo((s) => s.resumePmReport);
  const savePmResponseAction = useDemo((s) => s.savePmResponse);
  const savePmFindingsAction = useDemo((s) => s.savePmFindings);
  const savePmOutcomeAction = useDemo((s) => s.savePmOutcome);
  const signEngineerAction = useDemo((s) => s.signPmReportAsEngineer);
  const counterSignAction = useDemo((s) => s.counterSignPmReport);
  const deferCountersignAction = useDemo((s) => s.deferPmCountersign);
  const invalidateSignaturesAction = useDemo((s) => s.invalidatePmSignatures);
  const submitPmReportAction = useDemo((s) => s.submitPmReport);
  const discardPmReportAction = useDemo((s) => s.discardPmReport);

  const online = useOnlineStatus();

  const [step, setStep] = useState<PmFlowStep>("STATUS");
  const [reportId, setReportId] = useState<string | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [pendingVerdict, setPendingVerdict] = useState<PmVerdict | null>(null);
  const [pendingFollowUp, setPendingFollowUp] = useState<{ issueType: string; description: string } | null>(null);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  const eq = equipmentList.find((e) => e.id === equipmentId);
  const template: PmTemplate | undefined = useMemo(() => pmTemplateFor(equipmentId), [equipmentId]);
  const schedule = pmSchedules.find((p) => p.equipmentId === equipmentId);
  const flagsCtx = useMemo(
    () => ({ tickets: ticketsList, pmSchedules, calibrationRecords: calibrationRecordsList }),
    [ticketsList, pmSchedules, calibrationRecordsList],
  );
  const gate = eq ? evaluatePmGate(eq, flagsCtx) : null;
  const activeUsageSession = activeSession?.equipmentId === equipmentId ? activeSession : undefined;

  const report = reportId ? pmReports.find((r) => r.id === reportId) : undefined;
  const sections = template?.sections ?? [];
  const currentSection = sections[sectionIndex];

  // On arrival: an in-progress report already in the store (same session,
  // no refresh) resumes silently; a localStorage draft from before a
  // refresh surfaces a confirm prompt instead — see pm-draft-storage.ts.
  useEffect(() => {
    const live = pmReports.find((r) => r.equipmentId === equipmentId && r.status === "DRAFT");
    if (live) {
      setReportId(live.id);
      return;
    }
    const saved = loadDraft(equipmentId);
    if (saved && saved.status === "DRAFT") setResumeAvailable(true);
    // Only re-check when the unit changes, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId]);

  // Autosave — every store change to this report mirrors into localStorage.
  useEffect(() => {
    if (report && report.status === "DRAFT") saveDraft(report);
  }, [report]);

  // Coming back online while a submission is held commits it automatically.
  useEffect(() => {
    if (step === "SUBMIT_PENDING" && online && reportId && pendingVerdict) {
      submitPmReportAction(reportId, pendingVerdict, pendingFollowUp ?? undefined);
      clearDraft(equipmentId);
      setStep("DONE");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, step]);

  function resumeDraft() {
    const saved = loadDraft(equipmentId);
    if (!saved) return;
    resumePmReportAction(saved);
    setReportId(saved.id);
    setResumeAvailable(false);
    // Land wherever the draft left off — a fully-answered final section
    // still reads as "SECTION" here, which is fine: the section screen
    // itself will happily show it complete and let them move on.
    setStep(saved.verdict ? "SIGNOFF_ENGINEER" : saved.actionTaken || saved.problemDiagnosed ? "FINDINGS" : "SECTION");
  }

  function discardDraftAndStartFresh() {
    clearDraft(equipmentId);
    setResumeAvailable(false);
  }

  function startReport() {
    if (!eq || !gate?.canProceed) return;
    const id = startPmReportAction({ equipmentId, entryMethod, scannedAt: now().toISOString() });
    setReportId(id);
    setSectionIndex(0);
    setStep("SECTION");
  }

  function saveResponse(response: PmReportResponse) {
    if (!reportId) return;
    savePmResponseAction(reportId, response);
  }

  function requiredRemainingInSection(): number {
    if (!currentSection || !report) return 0;
    return currentSection.items.filter(
      (i) => i.required && i.type !== "NOTE" && !report.responses.some((r) => r.itemId === i.id),
    ).length;
  }

  function nextSection() {
    if (sectionIndex < sections.length - 1) setSectionIndex((i) => i + 1);
    else setStep("FINDINGS");
  }

  function prevSection() {
    if (sectionIndex > 0) setSectionIndex((i) => i - 1);
    else setStep("STATUS");
  }

  /** Jump straight to a section (e.g. from Findings' "Problems found" list) without walking back one at a time. */
  function goToSection(index: number) {
    setSectionIndex(Math.max(0, Math.min(index, sections.length - 1)));
    setStep("SECTION");
  }

  function saveFindings(patch: Partial<{
    problemDiagnosed: string; actionTaken: string; partsUsed: PmPartUsed[];
    findingsPhotoDataUrls: string[]; testInstrumentId: string;
  }>) {
    if (!reportId) return;
    savePmFindingsAction(reportId, patch);
  }

  function saveOutcome(patch: Partial<{
    nextPmDueAt: string; nextPmDueChangedReason: string; calibrationDone: boolean; calibrationDueAt: string;
  }>) {
    if (!reportId) return;
    savePmOutcomeAction(reportId, patch);
  }

  function chooseVerdict(verdict: PmVerdict, followUp?: { issueType: string; description: string }) {
    setPendingVerdict(verdict);
    setPendingFollowUp(followUp ?? null);
    setStep("SIGNOFF_ENGINEER");
  }

  function backFromOutcome() {
    setStep("FINDINGS");
  }

  function backFromSignoff(to: "OUTCOME" | "SIGNOFF_ENGINEER") {
    if (reportId) invalidateSignaturesAction(reportId);
    setStep(to);
  }

  function signEngineer(signature: SignatureRecord) {
    if (!reportId) return;
    signEngineerAction(reportId, signature);
    setStep("SIGNOFF_COUNTERSIGN");
  }

  function finalizeSubmission() {
    if (!reportId || !pendingVerdict) return;
    if (!online) {
      setStep("SUBMIT_PENDING");
      return;
    }
    submitPmReportAction(reportId, pendingVerdict, pendingFollowUp ?? undefined);
    clearDraft(equipmentId);
    setStep("DONE");
  }

  function counterSign(signature: SignatureRecord, path: "IN_SYSTEM" | "OFF_SYSTEM") {
    if (!reportId) return;
    counterSignAction(reportId, signature, path);
    finalizeSubmission();
  }

  function deferCountersign(reason: string) {
    if (!reportId) return;
    deferCountersignAction(reportId, reason);
    finalizeSubmission();
  }

  function discard() {
    if (!reportId) return;
    discardPmReportAction(reportId);
    clearDraft(equipmentId);
    setReportId(null);
    setSectionIndex(0);
    setPendingVerdict(null);
    setPendingFollowUp(null);
    setStep("STATUS");
  }

  function startAnother() {
    setReportId(null);
    setSectionIndex(0);
    setPendingVerdict(null);
    setPendingFollowUp(null);
    setStep("STATUS");
  }

  return {
    step, setStep,
    eq, template, schedule, gate, activeUsageSession,
    report, sections, currentSection, sectionIndex,
    online,
    resumeAvailable, resumeDraft, discardDraftAndStartFresh,
    startReport,
    saveResponse, requiredRemainingInSection, nextSection, prevSection, goToSection,
    saveFindings,
    saveOutcome, chooseVerdict, backFromOutcome,
    backFromSignoff, signEngineer, counterSign, deferCountersign,
    pendingVerdict, pendingFollowUp,
    discard, startAnother,
  };
}

export type PmReportFlow = ReturnType<typeof usePmReportFlow>;
