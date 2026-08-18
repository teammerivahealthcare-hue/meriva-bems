"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_OTP = "1234";

/**
 * The one shared OTP-verify piece, reused by both the in-system and
 * off-system countersignature paths. No SMS backend exists anywhere in
 * this app (there's no backend at all), so it's simulated the same way
 * the QR scanner is — the demo code is shown on screen rather than sent,
 * so the flow is honestly demoable without pretending to send a text.
 */
export function PmSignatureOtp({ phone, onVerified }: { phone: string; onVerified: () => void }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  if (!sent) {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={() => setSent(true)}>
        Send code to {phone}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Demo — no SMS sent. Enter <span className="font-mono">{DEMO_OTP}</span> to simulate verification.
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          placeholder="4-digit code"
          maxLength={4}
          inputMode="numeric"
        />
        <Button type="button" onClick={() => (code === DEMO_OTP ? onVerified() : setError(true))}>
          Verify
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">Incorrect code.</p>}
    </div>
  );
}

/** Finger/stylus signature capture for the off-system countersignature path — no library, a plain canvas. */
export function PmSignatureCanvas({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  function pos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasStroke(true);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={140}
        className="w-full touch-none rounded-lg border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={!hasStroke}
          onClick={() => canvasRef.current && onCapture(canvasRef.current.toDataURL("image/png"))}
        >
          Use this signature
        </Button>
      </div>
    </div>
  );
}
