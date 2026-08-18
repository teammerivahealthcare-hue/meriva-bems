"use client";

import { useState } from "react";
import { CaretDown, Info } from "@phosphor-icons/react";
import type { PmChecklistItem, PmReportResponse } from "@/lib/bems";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PmPhotoCapture } from "@/components/pm-report-photo-capture";

function baseResponse(itemId: string, existing: PmReportResponse | undefined): PmReportResponse {
  return existing ?? { itemId, status: "ANSWERED" };
}

/** One row of the section runner — switches over all 8 PmItemTypes from the spec's §4 table. */
export function PmChecklistItemField({
  item,
  response,
  onSave,
}: {
  item: PmChecklistItem;
  response: PmReportResponse | undefined;
  onSave: (response: PmReportResponse) => void;
}) {
  const [remarkOpen, setRemarkOpen] = useState(!!response?.remark);

  if (item.type === "NOTE") {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
        <span className="mb-1 flex items-center gap-1 font-medium text-foreground">
          <Info size={13} /> {item.label}
        </span>
        {item.hint}
      </div>
    );
  }

  // A failed checkpoint auto-expands and requires its remark — a Not-OK or
  // Found-abnormal with no explanation is worthless to whoever reads this
  // later. N/A never requires one.
  const flaggedProblem = response?.flaggedProblem ?? false;
  const showRemark = remarkOpen || flaggedProblem;

  function save(patch: Partial<PmReportResponse>) {
    onSave({ ...baseResponse(item.id, response), ...patch });
  }

  const pairValue =
    response?.value && typeof response.value === "object" && "a" in response.value
      ? (response.value as { a: number; b: number })
      : { a: NaN, b: NaN };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">
        {item.label}
        {item.required && <span className="text-destructive"> *</span>}
      </p>

      {item.type === "OK_NOT_OK_NA" && (
        <div className="grid grid-cols-3 gap-1.5">
          {(["OK", "NOT_OK", "N_A"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => save({ status: "ANSWERED", value: v, flaggedProblem: v === "NOT_OK" })}
              className={`h-9 rounded-md border text-xs font-medium ${
                response?.value === v
                  ? v === "NOT_OK"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : v === "N_A"
                      ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                      : "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-input text-muted-foreground"
              }`}
            >
              {v === "N_A" ? "N/A" : v === "NOT_OK" ? "Not OK" : "OK"}
            </button>
          ))}
        </div>
      )}

      {item.type === "ABNORMAL_FLAG" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={flaggedProblem}
            onCheckedChange={(v) => save({ status: "ANSWERED", value: v === true, flaggedProblem: v === true })}
          />
          Found abnormal
        </label>
      )}

      {item.type === "NUMERIC" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            value={typeof response?.value === "number" ? response.value : ""}
            onChange={(e) =>
              save({ status: "ANSWERED", value: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            className="max-w-32"
          />
          {item.unit && <span className="text-xs text-muted-foreground">{item.unit}</span>}
        </div>
      )}

      {item.type === "NUMERIC_PAIR" && (
        <div className="grid grid-cols-2 gap-2">
          {(item.subLabels ?? []).map((sub, i) => {
            const current = i === 0 ? pairValue.a : pairValue.b;
            return (
              <div key={sub}>
                <label className="mb-1 block text-xs text-muted-foreground">{sub}</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={Number.isNaN(current) ? "" : current}
                    onChange={(e) => {
                      const n = e.target.value === "" ? NaN : Number(e.target.value);
                      const next = i === 0 ? { a: n, b: pairValue.b } : { a: pairValue.a, b: n };
                      save({ status: "ANSWERED", value: next });
                    }}
                  />
                  {item.unit && <span className="text-xs text-muted-foreground">{item.unit}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {item.type === "TEXT" && (
        <Textarea
          rows={2}
          value={typeof response?.value === "string" ? response.value : ""}
          onChange={(e) => save({ status: "ANSWERED", value: e.target.value })}
        />
      )}

      {item.type === "SELECT" && (
        <Select
          value={typeof response?.value === "string" ? response.value : undefined}
          onValueChange={(v) => save({ status: "ANSWERED", value: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {(item.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {item.type === "PHOTO" && (
        <PmPhotoCapture
          photos={response?.photoDataUrls ?? []}
          onAdd={(url) => save({ status: "ANSWERED", photoDataUrls: [...(response?.photoDataUrls ?? []), url] })}
          onRemove={(i) => save({ photoDataUrls: (response?.photoDataUrls ?? []).filter((_, idx) => idx !== i) })}
        />
      )}

      {item.remarkEnabled && (
        <div>
          {!showRemark ? (
            <button
              type="button"
              onClick={() => setRemarkOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
            >
              <CaretDown size={11} /> Add remark
            </button>
          ) : (
            <Textarea
              rows={2}
              placeholder={flaggedProblem ? "What did you find? (required)" : "Remark (optional)"}
              value={response?.remark ?? ""}
              onChange={(e) => save({ remark: e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  );
}
