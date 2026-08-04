"use client";

import { useState } from "react";
import { Tag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EquipmentLabel, type EquipmentLabelData } from "@/components/equipment-label";

/** Trigger + dialog for reprinting a unit's asset label from its profile page. */
export function EquipmentLabelDialog(props: EquipmentLabelData) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setOpen(true)}>
        <Tag size={14} /> Print label
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton className="w-full max-w-sm gap-0 p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Asset label</DialogTitle>
            <DialogDescription>Reprint the scan-ready sticker for this unit.</DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <EquipmentLabel {...props} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
