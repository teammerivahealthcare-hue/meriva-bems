"use client";

import { useState } from "react";
import { CheckCircle, Stack, Gauge, Wrench, UsersThree, Truck } from "@phosphor-icons/react";
import { useDemo, type RepairOutcome } from "@/lib/bems";
import type { RepairFlow } from "@/hooks/use-repair-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogItemsUsedDialog } from "@/components/log-items-used-dialog";

const OUTCOME_OPTIONS: { value: RepairOutcome; label: string; detail: string; icon: typeof CheckCircle; activeClass: string }[] = [
  { value: "FIXED_PART_REPLACED", label: "Fixed — part replaced", detail: "Log which part was used", icon: Stack, activeClass: "border-emerald-300 bg-emerald-50" },
  { value: "FIXED_CALIBRATED", label: "Fixed — calibrated", detail: "Adjusted/recalibrated in place", icon: Gauge, activeClass: "border-emerald-300 bg-emerald-50" },
  { value: "FIXED_OTHER", label: "Fixed — other", detail: "Resolved without parts or calibration", icon: CheckCircle, activeClass: "border-emerald-300 bg-emerald-50" },
  { value: "NEEDS_INTERNAL_ENGINEER", label: "Needs another engineer", detail: "Reopens the ticket for reassignment", icon: UsersThree, activeClass: "border-amber-300 bg-amber-50" },
  { value: "NEEDS_EXTERNAL_ENGINEER", label: "Needs external engineer", detail: "Moves to awaiting vendor", icon: Truck, activeClass: "border-amber-300 bg-amber-50" },
];

export function RepairOutcomeStep({ flow }: { flow: RepairFlow }) {
  const { eq } = flow;
  const [outcome, setOutcome] = useState<RepairOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [partsOpen, setPartsOpen] = useState(false);
  const [partsLogged, setPartsLogged] = useState(false);

  const consumableItems = useDemo((s) => s.consumableItems);
  const consumableLog = useDemo((s) => s.consumableLog);
  const logConsumableEvent = useDemo((s) => s.logConsumableEvent);

  if (!eq) return null;

  return (
    <>
      <StepHeader title="What happened?" onBack={() => flow.setStep("TIMER")} />
      <div className="flex-1 space-y-5 p-5">
        <div className="space-y-2">
          {OUTCOME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = outcome === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOutcome(opt.value)}
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

        {outcome === "FIXED_PART_REPLACED" && (
          <Button variant="outline" className="w-full" onClick={() => setPartsOpen(true)}>
            <Stack size={16} /> {partsLogged ? "Parts logged" : "Log parts used"}
          </Button>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was found, what was done..." />
        </div>

        <Button
          className="w-full"
          disabled={!outcome}
          onClick={() => outcome && flow.submitOutcome(outcome, notes.trim() || undefined)}
        >
          <Wrench size={16} /> Submit
        </Button>
      </div>

      <LogItemsUsedDialog
        open={partsOpen}
        onOpenChange={setPartsOpen}
        items={consumableItems}
        log={consumableLog}
        onSubmit={(rows) => {
          for (const row of rows) {
            logConsumableEvent({ itemId: row.itemId, kind: "CONSUMED", quantity: row.quantity, note: row.note, equipmentId: eq.id });
          }
          setPartsLogged(true);
        }}
      />
    </>
  );
}
