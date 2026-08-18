"use client";

import { useState } from "react";
import { CheckCircle, WarningCircle, Wrench, Prohibit } from "@phosphor-icons/react";
import { formatDate, formatDuration, getCategory, getModel, type PmVerdict } from "@/lib/bems";
import type { PmReportFlow } from "@/hooks/use-pm-report-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const VERDICT_OPTIONS: { value: PmVerdict; label: string; detail: string; icon: typeof CheckCircle; activeClass: string }[] = [
  { value: "PASS", label: "Pass", detail: "Equipment returns to Operational", icon: CheckCircle, activeClass: "border-emerald-300 bg-emerald-50" },
  { value: "PASS_WITH_OBSERVATION", label: "Pass with observation", detail: "Operational, but flagged on the profile", icon: WarningCircle, activeClass: "border-amber-300 bg-amber-50" },
  { value: "NEEDS_FOLLOW_UP", label: "Needs follow-up", detail: "Stays Attention required, raises a job", icon: Wrench, activeClass: "border-amber-300 bg-amber-50" },
  { value: "RECOMMEND_CONDEMN", label: "Recommend condemn", detail: "Notifies admin — doesn't condemn by itself", icon: Prohibit, activeClass: "border-red-300 bg-red-50" },
];

export function PmReportOutcomeStep({ flow }: { flow: PmReportFlow }) {
  const { eq, report } = flow;
  const [verdict, setVerdict] = useState<PmVerdict | null>(null);
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  if (!eq || !report) return null;

  const category = getCategory(getModel(eq.equipmentModelId)?.categoryId ?? "");
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(report.startedAt).getTime()) / 1000));

  const canContinue = verdict && (verdict !== "NEEDS_FOLLOW_UP" || issueType.trim());

  function handleContinue() {
    if (!verdict) return;
    flow.chooseVerdict(
      verdict,
      verdict === "NEEDS_FOLLOW_UP" ? { issueType: issueType.trim(), description: description.trim() || issueType.trim() } : undefined,
    );
  }

  return (
    <>
      <StepHeader title="Outcome" onBack={flow.backFromOutcome} />
      <div className="flex-1 space-y-5 p-5">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Verdict</p>
          <div className="space-y-2">
            {VERDICT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = verdict === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVerdict(opt.value)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${active ? opt.activeClass : "border-border"}`}
                >
                  <Icon size={20} weight={active ? "fill" : "regular"} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {verdict === "NEEDS_FOLLOW_UP" && (
          <div className="space-y-3 rounded-xl border p-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">What needs follow-up?</label>
              <Input value={issueType} onChange={(e) => setIssueType(e.target.value)} placeholder="e.g. Detector panel error" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Details (optional)</label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Next PM due</label>
          <input
            type="date"
            value={report.nextPmDueAt ? report.nextPmDueAt.slice(0, 10) : ""}
            onChange={(e) =>
              flow.saveOutcome({
                nextPmDueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                nextPmDueChangedReason: "Adjusted by engineer at time of PM",
              })
            }
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="mt-1 text-xs text-muted-foreground">Leave blank to auto-compute from the PM schedule&apos;s interval.</p>
        </div>

        {category?.calibrationRequired && (
          <label className="flex items-center gap-2 rounded-xl border p-3 text-sm">
            <Checkbox
              checked={report.calibrationDone}
              onCheckedChange={(v) => flow.saveOutcome({ calibrationDone: v === true })}
            />
            Calibration also done today
          </label>
        )}

        <div>
          <p className="text-xs text-muted-foreground">Time on task</p>
          <p className="font-mono text-sm">{formatDuration(elapsedSeconds)}</p>
          <p className="text-xs text-muted-foreground">Started {formatDate(report.startedAt)}</p>
        </div>

        <Button className="w-full" disabled={!canContinue} onClick={handleContinue}>
          Continue to signatures
        </Button>
      </div>
    </>
  );
}
