"use client";

import { useQrScanFlow } from "@/hooks/use-qr-scan-flow";
import { PortalShell } from "@/components/portal-shell";
import { QrScanDevSwitch } from "@/components/qr-scan-dev-switch";
import { ScanStep } from "@/components/qr-scan-scan-step";
import { GateStep } from "@/components/qr-scan-gate-step";
import { MovementFormStep } from "@/components/qr-scan-movement-form-step";
import { EmergencyTimeStep, EmergencyActionStep } from "@/components/qr-scan-emergency-steps";
import { SessionStep } from "@/components/qr-scan-session-step";
import { BreakdownFormStep } from "@/components/qr-scan-breakdown-form-step";
import { MovedScreen, EndedScreen, DownScreen } from "@/components/qr-scan-result-screens";

/**
 * Engineer scan-and-act flow. Shares its mechanics with qrscanstartnurse via
 * useQrScanFlow — add engineer-only steps here (e.g. PM checklist, parts used)
 * without touching the nurse flow. GateStep's `extraActions` slot is the spot
 * to hang engineer-only buttons off the gate-check screen.
 */
export default function QrScanStartEngineerPage() {
  const flow = useQrScanFlow();

  return (
    <PortalShell>
      <div className="flex flex-1 flex-col">
        <QrScanDevSwitch current="engineer" />

        {flow.step === "SCAN" && <ScanStep flow={flow} />}
        {flow.step === "GATE" && <GateStep flow={flow} />}
        {flow.step === "MOVEMENT_FORM" && <MovementFormStep flow={flow} />}
        {flow.step === "EMERGENCY_TIME" && <EmergencyTimeStep flow={flow} />}
        {flow.step === "EMERGENCY_ACTION" && <EmergencyActionStep flow={flow} />}
        {flow.step === "SESSION" && <SessionStep flow={flow} />}
        {flow.step === "BREAKDOWN_FORM" && <BreakdownFormStep flow={flow} />}
        {flow.step === "MOVED" && <MovedScreen flow={flow} />}
        {flow.step === "ENDED" && <EndedScreen flow={flow} />}
        {flow.step === "DOWN" && <DownScreen />}
      </div>
    </PortalShell>
  );
}
