"use client";

import Link from "next/link";
import { CheckCircle, House } from "@phosphor-icons/react";
import { equipmentName, REPAIR_OUTCOME_LABEL } from "@/lib/bems";
import type { RepairFlow } from "@/hooks/use-repair-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";

export function RepairDoneStep({ flow }: { flow: RepairFlow }) {
  const { eq, outcome } = flow;
  if (!eq || !outcome) return null;

  return (
    <>
      <StepHeader title="Repair complete" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle size={48} weight="fill" className="text-emerald-500" />
        <div>
          <p className="text-sm font-medium">{equipmentName(eq)}</p>
          <p className="text-xs text-muted-foreground">{REPAIR_OUTCOME_LABEL[outcome]}</p>
        </div>

        <Button asChild className="w-full">
          <Link href="/engineer"><House size={16} /> Back to Engineer home</Link>
        </Button>
      </div>
    </>
  );
}
