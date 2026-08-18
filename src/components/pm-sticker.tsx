"use client";

import { PrintableQrLabel } from "@/components/printable-qr-label";
import { formatDate, PM_SOURCE_LABEL, type PmSource } from "@/lib/bems";

export interface PmStickerData {
  assetId: string;
  name: string;
  doneOn: string;
  dueOn?: string;
  pmSource?: PmSource;
}

/** PM-done sticker — same mechanism as EquipmentLabel/RoomLabel (both build on PrintableQrLabel), just different face content. */
export function PmSticker({ assetId, name, doneOn, dueOn, pmSource }: PmStickerData) {
  return (
    <PrintableQrLabel value={assetId}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PM completed</p>
      <p className="text-sm font-medium">{name}</p>
      <p className="font-mono text-xs text-muted-foreground">{assetId}</p>
      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        <p>Done {formatDate(doneOn)}</p>
        {dueOn && <p>Next due {formatDate(dueOn)}</p>}
        {pmSource && <p>{PM_SOURCE_LABEL[pmSource]}</p>}
      </div>
    </PrintableQrLabel>
  );
}
