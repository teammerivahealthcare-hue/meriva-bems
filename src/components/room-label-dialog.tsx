"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RoomLabel, type RoomLabelData } from "@/components/room-label";

interface RoomLabelDialogProps extends RoomLabelData {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Controlled QR/label-print dialog for a single MGPS room — mirrors EquipmentLabelDialog. */
export function RoomLabelDialog({ open, onOpenChange, ...labelProps }: RoomLabelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="w-full max-w-sm gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Print room QR</DialogTitle>
          <DialogDescription>Sticker to post in the room for reporting MGPS issues.</DialogDescription>
        </DialogHeader>
        <div className="p-5">
          <RoomLabel {...labelProps} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
