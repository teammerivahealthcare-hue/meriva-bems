"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type StockMovementKind = "RESTOCK" | "CONSUMED";

/**
 * Shared restock/consume logging dialog — one small controlled form (kind,
 * quantity, note) reused wherever the app tracks a derived stock count from
 * an event log (MGPS cylinders, general consumables). Callers own what the
 * logged event is attached to via `onSubmit`.
 */
export function StockMovementDialog({
  open,
  onOpenChange,
  initialKind,
  title,
  description,
  restockLabel,
  consumedLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKind: StockMovementKind;
  title: string;
  description: string;
  restockLabel: string;
  consumedLabel: string;
  onSubmit: (args: { kind: StockMovementKind; quantity: number; note?: string }) => void;
}) {
  const [kind, setKind] = useState<StockMovementKind>(initialKind);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setKind(initialKind);
      setQuantity("");
      setNote("");
    }
  }

  function handleSubmit() {
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    onSubmit({ kind, quantity: qty, note: note.trim() || undefined });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="w-full max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as StockMovementKind)}>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="RESTOCK" /> {restockLabel}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="CONSUMED" /> {consumedLabel}
              </label>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantity</label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 4" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="rounded-b-none p-8">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!quantity || Number(quantity) <= 0} onClick={handleSubmit}>
            Log entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
