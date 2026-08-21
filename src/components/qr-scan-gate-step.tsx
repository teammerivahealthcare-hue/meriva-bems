import type { ReactNode } from "react";
import { CheckCircle, WarningCircle, Prohibit, ArrowsLeftRight } from "@phosphor-icons/react";
import { equipmentName, formatDate, getRoom, type GateEvaluation } from "@/lib/bems";
import type { QrScanFlow } from "@/hooks/use-qr-scan-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const GATE_STYLES: Record<GateEvaluation["state"], { icon: typeof CheckCircle; wrap: string; iconClass: string }> = {
  GREEN: { icon: CheckCircle, wrap: "bg-emerald-50 border-emerald-200", iconClass: "text-emerald-600" },
  AMBER: { icon: WarningCircle, wrap: "bg-amber-50 border-amber-200", iconClass: "text-amber-600" },
  RED: { icon: Prohibit, wrap: "bg-red-50 border-red-200", iconClass: "text-red-600" },
};

/**
 * The gate-check step, shared across roles. `extraActions` lets a role-specific
 * page (e.g. engineer) inject its own buttons below "Log movement" without
 * forking this whole step. `hideClinicalUse` drops the expected-duration
 * field, "Start session", and the emergency-use link -- for the engineer
 * flow, where scanning a unit with nothing currently wrong with it isn't
 * "starting to use it". It also hides the GREEN "Ready to use" banner
 * specifically (that headline is clinical-readiness framing) while keeping
 * AMBER/RED banners, since those convey real equipment-condition warnings
 * an engineer needs too.
 */
export function GateStep({
  flow,
  extraActions,
  hideClinicalUse = false,
}: {
  flow: QrScanFlow;
  extraActions?: ReactNode;
  hideClinicalUse?: boolean;
}) {
  const { eq, gate } = flow;
  if (!eq || !gate) return null;

  const { icon: Icon, wrap, iconClass } = GATE_STYLES[gate.state];

  return (
    <>
      <StepHeader title={equipmentName(eq)} onBack={() => flow.setStep("SCAN")} />
      <div className="flex-1 space-y-4 p-5">
        {!(hideClinicalUse && gate.state === "GREEN") && (
          <div className={`flex gap-3 rounded-xl border p-4 ${wrap}`}>
            <Icon size={22} className={`mt-0.5 shrink-0 ${iconClass}`} weight="fill" />
            <div>
              <p className="text-sm font-semibold">{gate.headline}</p>
              {gate.detail && <p className="mt-0.5 text-xs text-muted-foreground">{gate.detail}</p>}
            </div>
          </div>
        )}

        {flow.activeLoan && (
          <div className="flex gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <ArrowsLeftRight size={22} className="mt-0.5 shrink-0 text-cyan-600" weight="fill" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold">
                  On temporary loan to {getRoom(flow.activeLoan.toRoomId)?.name ?? "another location"}
                </p>
                {flow.activeLoan.expectedReturnAt && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Expected back {formatDate(flow.activeLoan.expectedReturnAt)}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={flow.returnedWithAccessories}
                  onCheckedChange={(v) => flow.setReturnedWithAccessories(v === true)}
                />
                Returned with all accessories
              </label>
              <Button size="sm" onClick={flow.handleConfirmReturn}>Confirm it&apos;s back</Button>
            </div>
          </div>
        )}

        {flow.warrantyBlocked && !flow.warrantyApproved ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {flow.latestWarrantyRequest?.status === "PENDING"
                ? "An engineer needs to approve continued use before you can start a session on this unit."
                : "This unit's warranty has expired. Request engineer approval to keep using it."}
            </p>
            {flow.latestWarrantyRequest?.status === "PENDING" ? (
              <Button variant="outline" className="w-full" disabled>
                Waiting for engineer approval
              </Button>
            ) : (
              <Button className="w-full" onClick={() => flow.requestWarrantyOverride(eq.id)}>
                Request approval
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => flow.setStep("SCAN")}>
              Back to scan
            </Button>
          </div>
        ) : !gate.canProceed ? (
          <Button variant="outline" className="w-full" onClick={() => flow.setStep("SCAN")}>
            Back to scan
          </Button>
        ) : !hideClinicalUse ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Expected duration (minutes, optional)
              </label>
              <Input
                type="number"
                min={1}
                value={flow.expectedMinutes}
                onChange={(e) => flow.setExpectedMinutes(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>

            {gate.state === "AMBER" && (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={flow.acknowledged} onCheckedChange={(v) => flow.setAcknowledged(v === true)} className="mt-0.5" />
                I acknowledge this advisory and will proceed.
              </label>
            )}

            <Button
              className="w-full"
              disabled={gate.state === "AMBER" && !flow.acknowledged}
              onClick={flow.handleStartSession}
            >
              Start session
            </Button>
          </>
        ) : null}

        <Button variant="outline" className="w-full" onClick={() => flow.setStep("MOVEMENT_FORM")}>
          <ArrowsLeftRight size={16} /> Log movement
        </Button>

        {extraActions}

        {!hideClinicalUse && (
          <button
            type="button"
            onClick={() => {
              flow.setIsEmergencyFlow(true);
              flow.setStep("EMERGENCY_TIME");
            }}
            className="mx-auto block text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            Already used it? Log emergency use instead
          </button>
        )}
      </div>
    </>
  );
}
