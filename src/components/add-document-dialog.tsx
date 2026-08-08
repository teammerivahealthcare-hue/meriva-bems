"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Plus } from "@phosphor-icons/react";
import { DOCUMENT_TYPE_LABEL, useDemo, type DocumentType } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Certifications/insurance need a distinguishing label (a unit can carry
// several); other types are identified by their type alone.
const LABELLED_DOC_TYPES: DocumentType[] = ["CERTIFICATION", "INSURANCE"];

// Types that commonly carry a validity window worth tracking.
const EXPIRING_DOC_TYPES: DocumentType[] = ["CERTIFICATION", "INSURANCE", "CALIBRATION_CERT", "AMC_CONTRACT", "WARRANTY_CARD"];

interface FormState {
  type: DocumentType;
  label: string;
  file: File | null;
  expiryDate: string;
}

function emptyState(): FormState {
  return { type: "MANUAL", label: "", file: null, expiryDate: "" };
}

/** Trigger + dialog for attaching a document to a unit — built from the same Dialog/Select/Input/Button primitives used across the app. */
export function AddDocumentDialog({ equipmentId }: { equipmentId: string }) {
  const addEquipmentDocument = useDemo((s) => s.addEquipmentDocument);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyState());

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setForm(emptyState());
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
  }

  const needsLabel = LABELLED_DOC_TYPES.includes(form.type);
  const canSubmit = !!form.file && (!needsLabel || form.label.trim() !== "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.file) return;
    addEquipmentDocument({
      equipmentId,
      type: form.type,
      label: form.label.trim() || undefined,
      fileName: form.file.name,
      fileSizeKb: Math.max(1, Math.round(form.file.size / 1024)),
      expiryDate: form.expiryDate || undefined,
    });
    handleOpenChange(false);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add document
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton className="w-full max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Add document</DialogTitle>
            <DialogDescription>Attach a manual, invoice, certificate, or other file to this unit.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Document type</label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DocumentType }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {DOCUMENT_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsLabel && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Label</label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. AERB Radiological Safety Certification"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">File</label>
                <input
                  type="file"
                  onChange={handleFile}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                />
                {form.file && (
                  <p className="text-xs text-muted-foreground">
                    {form.file.name} · {Math.max(1, Math.round(form.file.size / 1024))} KB
                  </p>
                )}
              </div>

              {EXPIRING_DOC_TYPES.includes(form.type) && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Expiry date (optional)</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="rounded-b-none p-8">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                Add document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
