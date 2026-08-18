"use client";

import { useEffect, useRef } from "react";
import { Printer } from "@phosphor-icons/react";
import {
  facility, equipmentName, formatDate, getModel, getRoom, getDepartment, getUser,
  PM_VERDICT_LABEL, PM_SOURCE_LABEL,
  type Equipment, type PmTemplate, type PmReport, type PmSchedule,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";

const VALUE_LABEL: Record<string, string> = { OK: "OK", NOT_OK: "Not OK", N_A: "N/A" };

function responseValueText(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Found abnormal" : "OK";
  if (typeof value === "object" && "a" in (value as object)) {
    const v = value as { a: number; b: number };
    return `${Number.isFinite(v.a) ? v.a : "—"} / ${Number.isFinite(v.b) ? v.b : "—"}`;
  }
  if (typeof value === "string" && VALUE_LABEL[value]) return VALUE_LABEL[value];
  return String(value);
}

/**
 * The "PDF" — a print-optimized HTML view of the submitted report, same
 * mechanism PrintableQrLabel already uses (window.print() + a scoped
 * data-print-active class, see globals.css's .print-pm-report block)
 * rather than a PDF-generation library, since this app has none and the
 * browser's own print dialog already produces a real PDF from this.
 */
export function PmReportPrintable({
  eq, template, report, schedule,
}: {
  eq: Equipment;
  template: PmTemplate;
  report: PmReport;
  schedule?: PmSchedule;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const model = getModel(eq.equipmentModelId);
  const room = getRoom(eq.roomId);
  const dept = getDepartment(eq.departmentId);
  const engineer = getUser(report.performedByUserId);

  useEffect(() => {
    function clearActive() {
      rootRef.current?.removeAttribute("data-print-active");
    }
    window.addEventListener("afterprint", clearActive);
    return () => window.removeEventListener("afterprint", clearActive);
  }, []);

  function handlePrint() {
    rootRef.current?.setAttribute("data-print-active", "true");
    window.print();
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" className="w-full" onClick={handlePrint}>
        <Printer size={16} /> Print / Save as PDF
      </Button>

      <div ref={rootRef} className="print-pm-report space-y-5 rounded-lg border bg-white p-5 text-sm text-zinc-900">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <p className="text-base font-bold">{facility.name}</p>
            <p className="text-xs text-zinc-500">{facility.address}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Preventive maintenance report</p>
            <p className="text-xs text-zinc-500">{report.reportNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="text-zinc-500">Equipment</span><p className="font-medium text-zinc-900">{equipmentName(eq)}</p></div>
          <div><span className="text-zinc-500">Asset code</span><p className="font-mono font-medium text-zinc-900">{eq.assetId}</p></div>
          <div><span className="text-zinc-500">Make / model</span><p className="font-medium text-zinc-900">{model ? `${model.modelName}${model.series ? ` (${model.series})` : ""}` : "—"}</p></div>
          <div><span className="text-zinc-500">Serial no.</span><p className="font-medium text-zinc-900">{eq.serialNumber}</p></div>
          <div><span className="text-zinc-500">Department / location</span><p className="font-medium text-zinc-900">{dept?.name ?? "—"}{room ? ` · ${room.name}` : ""}</p></div>
          <div><span className="text-zinc-500">PM source</span><p className="font-medium text-zinc-900">{schedule?.pmSource ? PM_SOURCE_LABEL[schedule.pmSource] : "—"}</p></div>
          <div><span className="text-zinc-500">PM done</span><p className="font-medium text-zinc-900">{report.submittedAt ? formatDate(report.submittedAt) : "—"}</p></div>
          <div><span className="text-zinc-500">Next PM due</span><p className="font-medium text-zinc-900">{report.nextPmDueAt ? formatDate(report.nextPmDueAt) : "—"}</p></div>
        </div>

        <p className="border-t pt-2 text-[11px] text-zinc-500">
          {report.entryMethod === "QR" ? "Resolved via QR scan" : "Resolved via manual asset-ID entry"} at {formatDate(report.scannedAt)} —
          confirms the engineer was physically at the unit.
        </p>

        {template.sections.map((section) => (
          <div key={section.id} className="space-y-1.5">
            <p className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">{section.title}</p>
            <table className="w-full text-xs">
              <tbody>
                {section.items.map((item) => {
                  const response = report.responses.find((r) => r.itemId === item.id);
                  if (item.type === "NOTE") {
                    return (
                      <tr key={item.id}>
                        <td colSpan={3} className="py-1 italic text-zinc-500">{item.hint}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={item.id} className="border-b border-zinc-100">
                      <td className="w-1/2 py-1.5 text-zinc-700">{item.label}</td>
                      <td className="w-1/6 py-1.5 font-medium text-zinc-900">{responseValueText(response?.value)}</td>
                      <td className="py-1.5 text-zinc-500">{response?.remark ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div className="grid grid-cols-1 gap-3 border-t pt-3">
          <div><span className="text-xs text-zinc-500">Problem diagnosed</span><p>{report.problemDiagnosed || "—"}</p></div>
          <div><span className="text-xs text-zinc-500">Action taken</span><p>{report.actionTaken || "—"}</p></div>
          {report.partsUsed.length > 0 && (
            <div>
              <span className="text-xs text-zinc-500">Parts used</span>
              <ul className="list-disc pl-4">
                {report.partsUsed.map((p, i) => (
                  <li key={i}>{p.name} × {p.quantity} — ₹{p.cost} ({p.source.replace(/_/g, " ").toLowerCase()})</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t pt-2">
          <span className="text-xs text-zinc-500">Verdict</span>
          <p className="font-medium">{report.verdict ? PM_VERDICT_LABEL[report.verdict] : "—"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs">
          <div>
            <p className="mb-6 text-zinc-500">Biomedical engineer</p>
            <p className="border-t border-zinc-300 pt-1 font-medium">{engineer?.name ?? report.engineerSignature?.signerName ?? "—"}</p>
            <p className="text-zinc-500">{report.engineerSignature?.signedAt ? formatDate(report.engineerSignature.signedAt) : "Not yet signed"}</p>
          </div>
          <div>
            <p className="mb-6 text-zinc-500">Department in-charge / Head</p>
            <p className="border-t border-zinc-300 pt-1 font-medium">{report.counterSignature?.signerName ?? "—"}</p>
            <p className="text-zinc-500">
              {report.counterSignature?.signedAt
                ? `${formatDate(report.counterSignature.signedAt)}${report.counterSignature.otpVerifiedAt ? "" : " (unverified)"}`
                : report.status === "AWAITING_COUNTERSIGN" ? "Awaiting countersignature" : "Not yet signed"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
