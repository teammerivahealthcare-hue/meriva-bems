"use client";

import { useState } from "react";
import {
  CheckCircle, WarningCircle, Prohibit, Pulse, CaretRight, QrCode, Keyboard,
} from "@phosphor-icons/react";
import {
  equipmentName, formatDate, daysUntil, getRoom, getDepartment, getVendor, getModel, getUser,
  PM_SOURCE_LABEL,
  type PmGateState,
} from "@/lib/bems";
import type { PmReportFlow } from "@/hooks/use-pm-report-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const PM_GATE_STYLES: Record<PmGateState, { icon: typeof CheckCircle; wrap: string; iconClass: string }> = {
  CLEAR: { icon: CheckCircle, wrap: "bg-emerald-50 border-emerald-200", iconClass: "text-emerald-600" },
  CAUTION: { icon: WarningCircle, wrap: "bg-amber-50 border-amber-200", iconClass: "text-amber-600" },
  BLOCKED: { icon: Prohibit, wrap: "bg-red-50 border-red-200", iconClass: "text-red-600" },
};

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function PmReportStatusStep({ flow }: { flow: PmReportFlow }) {
  const { eq, template, schedule, gate, activeUsageSession } = flow;
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [incorrectNoted, setIncorrectNoted] = useState(false);

  if (!eq || !gate) return null;

  const model = getModel(eq.equipmentModelId);
  const dealer = getVendor(eq.dealerVendorId);
  const room = getRoom(eq.roomId);
  const dept = getDepartment(eq.departmentId);
  const { icon: Icon, wrap, iconClass } = PM_GATE_STYLES[gate.state];
  const overdueDays = schedule?.nextDueDate ? -daysUntil(schedule.nextDueDate) : null;
  const sessionUser = activeUsageSession ? getUser(activeUsageSession.userId) : undefined;

  return (
    <>
      <StepHeader title="Confirm equipment" />
      <div className="flex-1 space-y-4 p-5">
        {flow.resumeAvailable && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">Resume the PM report you started earlier on this unit?</p>
            <p className="text-xs text-muted-foreground">A draft was saved locally and wasn&apos;t submitted.</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={flow.resumeDraft}>Resume</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={flow.discardDraftAndStartFresh}>
                Start fresh
              </Button>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold leading-tight">{equipmentName(eq)}</h2>
          <p className="font-mono text-xs text-muted-foreground">{eq.assetId}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-4">
          <Field label="Make / model" value={model ? `${model.modelName}${model.series ? ` (${model.series})` : ""}` : undefined} />
          <Field label="Serial no." value={eq.serialNumber} />
          <Field label="Department" value={dept?.name} />
          <Field label="Location" value={room ? `Floor ${room.floor} · ${room.name}` : undefined} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-4">
          <Field label="Last PM done" value={schedule?.lastPerformedAt ? formatDate(schedule.lastPerformedAt) : "—"} />
          <Field label="PM due" value={schedule?.nextDueDate ? formatDate(schedule.nextDueDate) : "—"} />
          <Field label="PM frequency" value={schedule?.intervalMonths ? `Every ${schedule.intervalMonths} mo` : undefined} />
          <Field label="Source" value={schedule?.pmSource ? PM_SOURCE_LABEL[schedule.pmSource] : undefined} />
        </div>

        {overdueDays !== null && overdueDays > 0 && (
          <p className="text-sm text-amber-700">Overdue by {overdueDays} day{overdueDays === 1 ? "" : "s"}.</p>
        )}

        <button
          type="button"
          onClick={() => setTemplatePreviewOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border p-4 text-left hover:bg-muted/40"
        >
          <span className="text-sm">
            Using: <span className="font-medium">{template?.name ?? "Standard PM checklist"}</span>
            <span className="block text-xs text-muted-foreground">
              {template?.scope === "EQUIPMENT" ? "Equipment-specific template" : template?.scope === "CATEGORY" ? "Category template" : "Base template"}
            </span>
          </span>
          <CaretRight size={16} className="shrink-0 text-muted-foreground" />
        </button>

        {activeUsageSession && (
          <div className="flex gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <Pulse size={20} className="mt-0.5 shrink-0 text-cyan-600" weight="fill" />
            <p className="text-sm">
              In use by {sessionUser?.name ?? "someone"} since {formatDate(activeUsageSession.startedAt)}.
            </p>
          </div>
        )}

        <div className={`flex gap-3 rounded-xl border p-4 ${wrap}`}>
          <Icon size={22} className={`mt-0.5 shrink-0 ${iconClass}`} weight="fill" />
          <div>
            <p className="text-sm font-semibold">{gate.headline}</p>
            {gate.detail && <p className="mt-0.5 text-xs text-muted-foreground">{gate.detail}</p>}
          </div>
        </div>

        {gate.canProceed ? (
          <Button className="w-full" onClick={flow.startReport}>Start PM</Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Request approval from admin
          </Button>
        )}

        {!incorrectNoted ? (
          <button
            type="button"
            onClick={() => setIncorrectNoted(true)}
            className="mx-auto block text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            Report incorrect details
          </button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Noted — flagged for admin review.</p>
        )}
      </div>

      <Sheet open={templatePreviewOpen} onOpenChange={setTemplatePreviewOpen}>
        <SheetContent className="w-full sm:max-w-120">
          <SheetHeader className="border-b">
            <SheetTitle>{template?.name ?? "Standard PM checklist"}</SheetTitle>
            <SheetDescription>Read-only preview — checkpoints run on the next screen</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
            {template?.sections.map((section) => (
              <div key={section.id} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <span>{item.label}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{item.type.replace(/_/g, " ").toLowerCase()}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
