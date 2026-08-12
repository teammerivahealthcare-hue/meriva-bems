"use client";

import { PrintableQrLabel } from "@/components/printable-qr-label";

export interface RoomLabelData {
  roomId: string;
  roomName: string;
  departmentName?: string;
  floorLabel?: string;
}

/**
 * A printable per-room label for the gas pipeline network — meant to be
 * posted in the room itself. QR encodes the room id: a plain identifying
 * reference today (the scan portal doesn't resolve room QRs yet, only
 * equipment ones), not a scan-to-report flow.
 */
export function RoomLabel({ roomId, roomName, departmentName, floorLabel }: RoomLabelData) {
  return (
    <PrintableQrLabel value={roomId}>
      <p className="text-lg font-bold tracking-tight">{roomName}</p>
      <div className="space-y-0.5">
        {departmentName && <p className="text-sm font-medium">{departmentName}</p>}
        {floorLabel && <p className="text-xs text-muted-foreground">{floorLabel}</p>}
      </div>
      <p className="text-[11px] text-muted-foreground">MGPS room support</p>
    </PrintableQrLabel>
  );
}
