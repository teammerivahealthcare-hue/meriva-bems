"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, assetId, { width: 132, margin: 1 }).catch(() => {});
    }
  }, [assetId]);

  useEffect(() => {
    function clearActive() {
      labelRef.current?.removeAttribute("data-print-active");
    }
    window.addEventListener("afterprint", clearActive);
    return () => window.removeEventListener("afterprint", clearActive);
  }, []);

  function handlePrint() {
    labelRef.current?.setAttribute("data-print-active", "true");
    window.print();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={labelRef}
        className="equipment-label flex w-fit flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
      >
        <canvas ref={canvasRef} />
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
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
        <Printer size={14} /> Print label
      </Button>
    </div>
  );
}
