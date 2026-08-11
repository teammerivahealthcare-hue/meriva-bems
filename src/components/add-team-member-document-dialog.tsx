"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Plus } from "@phosphor-icons/react";
import { useDemo } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface FormState {
  label: string;
  file: File | null;
  expiryDate: string;
}

function emptyState(): FormState {
  return { label: "", file: null, expiryDate: "" };
}

/** Trigger + dialog for a member attaching their own certification/training record to their profile. */
export function AddTeamMemberDocumentDialog({ memberId }: { memberId: string }) {
  const addTeamMemberDocument = useDemo((s) => s.addTeamMemberDocument);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyState());

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setForm(emptyState());
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }));
  }

  const canSubmit = form.label.trim() !== "" && !!form.file;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.file || !canSubmit) return;
    addTeamMemberDocument({
      memberId,
      label: form.label.trim(),
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
            <DialogDescription>
              Attach a certification, training record, or other file to your profile.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Label</label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. BMET Certification — Level 2"
                />
              </div>

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

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Expiry date (optional)</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
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
