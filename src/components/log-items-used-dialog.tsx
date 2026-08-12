"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { consumableStock, type ConsumableItem, type ConsumableLogEntry } from "@/lib/bems";

interface ItemRow {
  key: number;
  itemId: string;
  quantity: string;
}

let rowKeySeq = 0;
function newRow(): ItemRow {
  return { key: rowKeySeq++, itemId: "", quantity: "" };
}

export interface LoggedItemRow {
  itemId: string;
  quantity: number;
  note?: string;
}

/**
 * Multi-row "parts used on this repair" form — an item picker + quantity per
 * row, "Add another item" to log several in one go. Each valid row is a
 * CONSUMED entry once the caller applies it via logConsumableEvent; this
 * dialog only collects and validates, it doesn't touch the store itself
 * (same separation as StockMovementDialog).
 */
export function LogItemsUsedDialog({
  open,
  onOpenChange,
  items,
  log,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ConsumableItem[];
  log: ConsumableLogEntry[];
  onSubmit: (rows: LoggedItemRow[]) => void;
}) {
  const [rows, setRows] = useState<ItemRow[]>([newRow()]);
  const [note, setNote] = useState("");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setRows([newRow()]);
      setNote("");
    }
  }

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  const chosenItemIds = new Set(rows.map((r) => r.itemId).filter(Boolean));
  const validRows = rows.filter((r) => r.itemId && Number(r.quantity) > 0);

  function handleSubmit() {
    if (validRows.length === 0) return;
    onSubmit(
      validRows.map((r) => ({ itemId: r.itemId, quantity: Number(r.quantity), note: note.trim() || undefined }))
    );
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="w-full max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Log items used</DialogTitle>
          <DialogDescription>Parts consumed on this repair — subtracted from inventory stock.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <Select value={row.itemId} onValueChange={(v) => updateRow(row.key, { itemId: v })}>
                  <SelectTrigger className="w-full flex-1">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.id}
                        disabled={chosenItemIds.has(item.id) && item.id !== row.itemId}
                      >
                        {item.name} · {consumableStock(item.id, log)} {item.unit} in stock
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                  placeholder="Qty"
                  className="w-20 shrink-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, newRow()])}>
            <Plus size={14} /> Add another item
          </Button>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. which ticket or repair this was for"
            />
          </div>
        </div>
        <DialogFooter className="rounded-b-none p-8">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={validRows.length === 0} onClick={handleSubmit}>
            Log {validRows.length > 0 ? `${validRows.length} ` : ""}item{validRows.length === 1 ? "" : "s"} used
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
