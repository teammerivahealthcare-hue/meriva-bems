"use client";

import { useEffect, useRef, type ReactNode } from "react";
import QRCode from "qrcode";
import { Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * Shared QR-sticker chrome: renders the QR canvas for `value`, wraps it with
 * whatever identifying body `children` supplies, and owns the print button
 * plus print-scoping (see .print-label in globals.css). EquipmentLabel and
 * RoomLabel both build on this instead of each re-implementing the canvas
 * ref, print handler, and afterprint cleanup.
 */
export function PrintableQrLabel({ value, children }: { value: string; children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, { width: 132, margin: 1 }).catch(() => {});
    }
  }, [value]);

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
        className="print-label flex w-fit flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
      >
        <canvas ref={canvasRef} />
        {children}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
        <Printer size={14} /> Print label
      </Button>
    </div>
  );
}
