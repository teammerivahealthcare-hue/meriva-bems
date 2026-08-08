"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EquipmentLabel, type EquipmentLabelData } from "@/components/equipment-label";

interface EquipmentLabelDialogProps extends EquipmentLabelData {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Controlled QR/label-print dialog — the profile header's "..." menu owns the open state and triggers it. */
export function EquipmentLabelDialog({ open, onOpenChange, ...labelProps }: EquipmentLabelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="w-full max-w-sm gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Print QR</DialogTitle>
          <DialogDescription>Reprint the scan-ready QR sticker for this unit.</DialogDescription>
        </DialogHeader>
        <div className="p-5">
          <EquipmentLabel {...labelProps} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
