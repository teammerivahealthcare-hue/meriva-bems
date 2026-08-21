"use client";

import { useEffect } from "react";
import { useQrScanFlow } from "@/hooks/use-qr-scan-flow";
import { useDemo, usePortalUser } from "@/lib/bems";
import { ScanStep } from "@/components/qr-scan-scan-step";
import { GateStep } from "@/components/qr-scan-gate-step";
import { MovementFormStep } from "@/components/qr-scan-movement-form-step";
import { EmergencyTimeStep, EmergencyActionStep } from "@/components/qr-scan-emergency-steps";
import { SessionStep } from "@/components/qr-scan-session-step";
import { BreakdownFormStep } from "@/components/qr-scan-breakdown-form-step";
import { MovedScreen, EndedScreen, DownScreen } from "@/components/qr-scan-result-screens";

/**
 * Staff/nurse scan-and-act flow, nested under /staff now that real
 * role-routing exists (was its own top-level /qrscanstartnurse route with
 * a dev-only nurse/engineer switcher while both flows were being built in
 * parallel). Shares its mechanics with (portal)/engineer/scan via
 * useQrScanFlow — add staff-only steps here without touching engineer's.
 */
export default function StaffScanPage() {
  const flow = useQrScanFlow();
  const user = usePortalUser();
  const setPortalRole = useDemo((s) => s.setPortalRole);

  // Being on /staff/* IS the role -- keep the store in sync regardless of
  // how someone arrived here (typed URL, bookmark, refresh).
  useEffect(() => {
    if (user.role === "ENGINEER") setPortalRole("STAFF");
  }, [user.role, setPortalRole]);

  return (
    <div className="flex flex-1 flex-col">
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
  );
}
