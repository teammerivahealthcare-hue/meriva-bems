"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardText } from "@phosphor-icons/react";
import { useQrScanFlow } from "@/hooks/use-qr-scan-flow";
import { useDemo, usePortalUser } from "@/lib/bems";
import { ScanStep } from "@/components/qr-scan-scan-step";
import { GateStep } from "@/components/qr-scan-gate-step";
import { MovementFormStep } from "@/components/qr-scan-movement-form-step";
import { MovedScreen } from "@/components/qr-scan-result-screens";
import { Button } from "@/components/ui/button";

/**
 * Engineer scan-and-act flow, nested under /engineer now that real
 * role-routing exists (was its own top-level /qrscanstartengineer route
 * with a dev-only nurse/engineer switcher while both flows were being
 * built in parallel). Shares its scan/movement mechanics with
 * (portal)/staff/scan via useQrScanFlow, but the gate screen diverges hard:
 * an engineer scanning a unit with an open ticket goes straight into the
 * repair flow's own summary+history+start-repair screen instead of the
 * "Ready to use / Start session" gate, which is a staff/clinical-use
 * concept that doesn't apply here -- so SESSION/BREAKDOWN_FORM/DOWN/
 * EMERGENCY_* (all only reachable through that gate action) don't apply
 * to this flow either.
 */
export default function EngineerScanPage() {
  const flow = useQrScanFlow();
  const router = useRouter();
  const user = usePortalUser();
  const setPortalRole = useDemo((s) => s.setPortalRole);
  const tickets = useDemo((s) => s.tickets);

  // Being on an /engineer/* page IS the role -- keep the store in sync
  // regardless of how someone arrived here (typed URL, bookmark, refresh),
  // so downstream role-aware redirects (e.g. /home) resolve correctly.
  useEffect(() => {
    if (user.role !== "ENGINEER") setPortalRole("ENGINEER");
  }, [user.role, setPortalRole]);

  const openTicket = flow.eq
    ? tickets.find((t) => t.equipmentId === flow.eq!.id && t.status !== "RESOLVED" && t.status !== "CLOSED")
    : undefined;

  // Hand off to the repair flow immediately -- no separate "gate" screen
  // for a unit that already has something wrong with it.
  useEffect(() => {
    if (flow.step === "GATE" && flow.eq && openTicket) {
      router.replace(`/repairflow/${flow.eq.id}?ticketId=${openTicket.id}`);
    }
  }, [flow.step, flow.eq, openTicket, router]);

  return (
    <div className="flex flex-1 flex-col">
      {flow.step === "SCAN" && <ScanStep flow={flow} />}
      {flow.step === "GATE" && flow.eq && !openTicket && (
        <GateStep
          flow={flow}
          hideClinicalUse
          extraActions={
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const entry = flow.manualAssetId.trim() ? "manual" : "qr";
                router.push(`/pmreport/${flow.eq!.id}?entry=${entry}`);
              }}
            >
              <ClipboardText size={16} /> Start PM report
            </Button>
          }
        />
      )}
      {flow.step === "MOVEMENT_FORM" && <MovementFormStep flow={flow} />}
      {flow.step === "MOVED" && <MovedScreen flow={flow} />}
    </div>
  );
}
