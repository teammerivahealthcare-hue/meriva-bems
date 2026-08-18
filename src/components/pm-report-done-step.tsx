"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, House, FileText, Printer, CloudSlash } from "@phosphor-icons/react";
import { equipmentName, formatDate, PM_VERDICT_LABEL } from "@/lib/bems";
import type { PmReportFlow } from "@/hooks/use-pm-report-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PmReportPrintable } from "@/components/pm-report-printable";
import { PmSticker } from "@/components/pm-sticker";

export function PmSubmitPendingStep() {
  return (
    <>
      <StepHeader title="Saved" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <CloudSlash size={48} className="text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Saved — will submit when you&apos;re back online</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing is lost. This screen updates itself the moment a connection is back.
          </p>
        </div>
      </div>
    </>
  );
}

export function PmReportDoneStep({ flow }: { flow: PmReportFlow }) {
  const { eq, template, report, schedule } = flow;
  const [reportOpen, setReportOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);

  if (!eq || !report) return null;

  return (
    <>
      <StepHeader title="PM report complete" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle size={48} weight="fill" className="text-emerald-500" />
        <div>
          <p className="text-sm font-medium">{equipmentName(eq)}</p>
          <p className="text-xs text-muted-foreground">
            {report.verdict ? PM_VERDICT_LABEL[report.verdict] : ""}
            {report.nextPmDueAt ? ` · Next PM due ${formatDate(report.nextPmDueAt)}` : ""}
          </p>
          {report.status === "AWAITING_COUNTERSIGN" && (
            <p className="mt-1 text-xs text-amber-700">Awaiting countersignature — visible in the admin&apos;s pending list.</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={() => setReportOpen(true)}>
            <FileText size={16} /> View report
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStickerOpen(true)}>
            <Printer size={16} /> Print stickers
          </Button>
          <Button asChild className="w-full">
            <Link href="/home"><House size={16} /> Back to home</Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={flow.startAnother}>
            Start next PM
          </Button>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent showCloseButton className="w-full max-w-2xl gap-0 overflow-y-auto p-0" style={{ maxHeight: "85vh" }}>
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>{report.reportNumber}</DialogTitle>
            <DialogDescription>Hospital-letterhead layout — print or save as PDF</DialogDescription>
          </DialogHeader>
          <div className="p-5">
            {template && <PmReportPrintable eq={eq} template={template} report={report} schedule={schedule} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stickerOpen} onOpenChange={setStickerOpen}>
        <DialogContent showCloseButton className="w-full max-w-sm gap-0 p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Print PM sticker</DialogTitle>
            <DialogDescription>Done-on / due-on sticker for the unit.</DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <PmSticker
              assetId={eq.assetId}
              name={equipmentName(eq)}
              doneOn={report.submittedAt ?? report.startedAt}
              dueOn={report.nextPmDueAt}
              pmSource={schedule?.pmSource}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
