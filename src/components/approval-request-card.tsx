"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Muted capsule for a request's kind ("Pre-movement approval", "Temporary loan"). */
export const APPROVAL_TAG_CLASS = "bg-muted text-foreground border-transparent";

/**
 * One pending request on the Approvals page — the same shell for movement,
 * loan-return, and warranty-override requests. Top half says what and who;
 * the grey strip below carries the request's facts and its actions. Clicking
 * anywhere outside the actions opens the detail dialog.
 */
export function ApprovalRequestCard({
  title,
  assetId,
  department,
  subtitle,
  meta,
  tag,
  facts,
  actions,
  onOpen,
}: {
  title: string;
  assetId?: string;
  department?: string;
  subtitle?: string;
  /** Top-right line — "5 hrs ago by Ananya Rao", "Return overdue". */
  meta: ReactNode;
  tag?: ReactNode;
  facts: ReactNode[];
  actions: ReactNode;
  onOpen: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-surface">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
      >
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-lg font-medium leading-snug">{title}</span>
            {(assetId || department) && (
              <span className="text-sm text-muted-foreground">
                {assetId && `ID: ${assetId}`}
                {assetId && department && "  ·  "}
                {department}
              </span>
            )}
          </p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 text-sm">{meta}</div>
          {tag}
        </div>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/60 px-5 py-3">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          {facts.map((fact, i) => (
            <span key={i} className="flex items-center gap-2.5">
              {i > 0 && <span className="size-1 rounded-full bg-muted-foreground/40" aria-hidden />}
              {fact}
            </span>
          ))}
        </p>
        <div className="flex items-center gap-3">{actions}</div>
      </div>
    </div>
  );
}

export interface ApprovalDetailField {
  label: string;
  value: ReactNode;
  className?: string;
}

/** Detail view for one request, pending or settled — eyebrow, chips, note, a two-column field grid, and the request's actions. */
export function ApprovalDetailDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  chips,
  note,
  fields,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  chips?: ReactNode;
  note?: string;
  fields: ApprovalDetailField[];
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="gap-1 border-b px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          <DialogTitle className="text-xl leading-tight">{title}</DialogTitle>
          <DialogDescription className="sr-only">{eyebrow} request details</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          {chips && <div className="flex flex-wrap gap-2">{chips}</div>}
          {note && <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">{note}</p>}
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="space-y-0.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                <dd className={cn("text-sm font-medium", f.className)}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {footer && (
          <DialogFooter className="mx-0 mb-0 items-center gap-3 rounded-b-none border-t bg-transparent px-6 py-4">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
