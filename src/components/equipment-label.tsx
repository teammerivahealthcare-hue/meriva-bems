"use client";

import { PrintableQrLabel } from "@/components/printable-qr-label";

export interface EquipmentLabelData {
  assetId: string;
  name: string;
  category: string;
  serialNumber: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
}

/**
 * A printable asset label: QR (encodes assetId — the same value the portal's
 * QR-scan screen and its manual-entry fallback resolve equipment by) plus
 * the identifying details, sized for a small sticker rather than a full page.
 */
export function EquipmentLabel({
  assetId,
  name,
  category,
  serialNumber,
  purchaseDate,
  warrantyExpiry,
}: EquipmentLabelData) {
  return (
    <PrintableQrLabel value={assetId}>
      <p className="text-2xl font-bold tracking-tight">{assetId}</p>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {category} · S/N {serialNumber}
        </p>
      </div>
      {(purchaseDate || warrantyExpiry) && (
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          {purchaseDate && <span>Purchased {purchaseDate}</span>}
          {warrantyExpiry && <span>Warranty {warrantyExpiry}</span>}
        </div>
      )}
    </PrintableQrLabel>
  );
}
