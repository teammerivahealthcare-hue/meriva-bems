"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import type { PmPartUsed } from "@/lib/bems";
import type { PmReportFlow } from "@/hooks/use-pm-report-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { PmPhotoCapture } from "@/components/pm-report-photo-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PART_SOURCE_LABEL: Record<PmPartUsed["source"], string> = {
  HOSPITAL_STOCK: "Hospital stock",
  PURCHASED: "Purchased",
  UNDER_WARRANTY: "Under warranty",
  UNDER_AMC: "Under AMC",
};

const TEST_INSTRUMENTS = [
  "Digital multimeter", "Earth leakage tester", "ELCB tester", "Pressure gauge", "Vibration meter", "Insulation tester",
];

function emptyPart(): PmPartUsed {
  return { name: "", quantity: 1, cost: 0, source: "HOSPITAL_STOCK" };
}

export function PmReportFindingsStep({ flow }: { flow: PmReportFlow }) {
  const { eq, report, sections } = flow;
  const [parts, setParts] = useState<PmPartUsed[]>(report?.partsUsed ?? []);
  if (!eq || !report) return null;

  const problems = sections.flatMap((section, sIdx) =>
    section.items
      .map((item) => ({ item, response: report.responses.find((r) => r.itemId === item.id), sIdx }))
      .filter((x) => x.response?.flaggedProblem),
  );

  function updateParts(next: PmPartUsed[]) {
    setParts(next);
    flow.saveFindings({ partsUsed: next.filter((p) => p.name.trim()) });
  }

  const actionTakenValid = !!report.actionTaken?.trim();

  return (
    <>
      <StepHeader title="Findings" onBack={() => flow.setStep("SECTION")} />
      <div className="flex-1 space-y-5 p-5">
        {problems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Problems found</p>
            <div className="space-y-1.5">
              {problems.map(({ item, response, sIdx }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => flow.goToSection(sIdx)}
                  className="block w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left"
                >
                  <p className="text-sm font-medium text-red-800">{item.label}</p>
                  {response?.remark && <p className="text-xs text-red-700">{response.remark}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Problem diagnosed</label>
          <Textarea
            rows={3}
            value={report.problemDiagnosed ?? ""}
            onChange={(e) => flow.saveFindings({ problemDiagnosed: e.target.value })}
            placeholder="What's actually wrong, in your own words"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Action taken <span className="text-destructive">*</span>
          </label>
          <Textarea
            rows={3}
            value={report.actionTaken ?? ""}
            onChange={(e) => flow.saveFindings({ actionTaken: e.target.value })}
            placeholder="What you did"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Parts used</p>
          {parts.map((part, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Part name"
                  value={part.name}
                  onChange={(e) => updateParts(parts.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p)))}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => updateParts(parts.filter((_, idx) => idx !== i))}
                  aria-label={part.name ? `Remove ${part.name}` : "Remove part"}
                >
                  <X size={14} />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number" min={1} placeholder="Qty"
                  value={part.quantity}
                  onChange={(e) => updateParts(parts.map((p, idx) => (idx === i ? { ...p, quantity: Number(e.target.value) || 1 } : p)))}
                />
                <Input
                  type="number" min={0} placeholder="Cost (₹)"
                  value={part.cost}
                  onChange={(e) => updateParts(parts.map((p, idx) => (idx === i ? { ...p, cost: Number(e.target.value) || 0 } : p)))}
                />
                <Select
                  value={part.source}
                  onValueChange={(v) => updateParts(parts.map((p, idx) => (idx === i ? { ...p, source: v as PmPartUsed["source"] } : p)))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PART_SOURCE_LABEL) as PmPartUsed["source"][]).map((s) => (
                      <SelectItem key={s} value={s}>{PART_SOURCE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => updateParts([...parts, emptyPart()])}>
            <Plus size={14} /> Add part
          </Button>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Photos</p>
          <PmPhotoCapture
            photos={report.findingsPhotoDataUrls}
            onAdd={(url) => flow.saveFindings({ findingsPhotoDataUrls: [...report.findingsPhotoDataUrls, url] })}
            onRemove={(i) => flow.saveFindings({ findingsPhotoDataUrls: report.findingsPhotoDataUrls.filter((_, idx) => idx !== i) })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Test instrument used (optional)</label>
          <Select value={report.testInstrumentId ?? undefined} onValueChange={(v) => flow.saveFindings({ testInstrumentId: v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select instrument" /></SelectTrigger>
            <SelectContent>
              {TEST_INSTRUMENTS.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" disabled={!actionTakenValid} onClick={() => flow.setStep("OUTCOME")}>
          Continue to outcome
        </Button>
      </div>
    </>
  );
}
