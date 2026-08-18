"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { formatDate, usePortalUser, useDemo, type SignatureRecord } from "@/lib/bems";
import type { PmReportFlow } from "@/hooks/use-pm-report-flow";
import { StepHeader } from "@/components/qr-scan-step-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PmSignatureOtp, PmSignatureCanvas } from "@/components/pm-signature-otp";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

const DEMO_IP = "10.0.0.1";

function EngineerSignoff({ flow }: { flow: PmReportFlow }) {
  const user = usePortalUser();

  function sign() {
    const signature: SignatureRecord = {
      signerName: user.name,
      signerPhone: user.phone,
      signedAt: new Date().toISOString(),
      otpVerifiedAt: new Date().toISOString(), // already authenticated in the portal — no re-auth, no drawing, per spec
      ipAddress: DEMO_IP,
    };
    flow.signEngineer(signature);
  }

  return (
    <>
      <StepHeader title="Sign report" onBack={() => flow.backFromSignoff("OUTCOME")} />
      <div className="flex-1 space-y-5 p-5">
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.designation} · {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Signing confirms this report as you&apos;ve entered it — a countersignature from the department is next.
        </p>
        <Button className="w-full" onClick={sign}>Sign report</Button>
      </div>
    </>
  );
}

function CountersignSignoff({ flow, engineerSigned }: { flow: PmReportFlow; engineerSigned: boolean }) {
  const teamMembers = useDemo((s) => s.teamMembers);
  const [path, setPath] = useState<"IN_SYSTEM" | "OFF_SYSTEM">("IN_SYSTEM");

  // In-system
  const inSystemOptions = teamMembers.filter((m) => m.active);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const selectedMember = inSystemOptions.find((m) => m.id === selectedMemberId);

  // Off-system
  const [offName, setOffName] = useState("");
  const [offDesignation, setOffDesignation] = useState("");
  const [offPhone, setOffPhone] = useState("");
  const [offSignatureUrl, setOffSignatureUrl] = useState<string | null>(null);

  // Defer
  const [deferReason, setDeferReason] = useState("");
  const [deferring, setDeferring] = useState(false);

  function completeInSystem() {
    if (!selectedMember) return;
    const signature: SignatureRecord = {
      signerName: selectedMember.name,
      signerPhone: selectedMember.phone,
      signedAt: new Date().toISOString(),
      otpVerifiedAt: new Date().toISOString(),
      ipAddress: DEMO_IP,
    };
    flow.counterSign(signature, "IN_SYSTEM");
  }

  function completeOffSystemUnverified() {
    if (!offName.trim() || !offSignatureUrl) return;
    const signature: SignatureRecord = {
      signerName: offName.trim(),
      signerPhone: offPhone.trim(),
      signatureDataUrl: offSignatureUrl,
      signedAt: new Date().toISOString(),
      ipAddress: DEMO_IP,
    };
    flow.counterSign(signature, "OFF_SYSTEM");
  }

  function completeOffSystemVerified() {
    if (!offName.trim() || !offSignatureUrl) return;
    const signature: SignatureRecord = {
      signerName: offName.trim(),
      signerPhone: offPhone.trim(),
      signatureDataUrl: offSignatureUrl,
      signedAt: new Date().toISOString(),
      otpVerifiedAt: new Date().toISOString(),
      ipAddress: DEMO_IP,
    };
    flow.counterSign(signature, "OFF_SYSTEM");
  }

  if (deferring) {
    return (
      <>
        <StepHeader title="Submit without countersignature" onBack={() => setDeferring(false)} />
        <div className="flex-1 space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            The report submits as <span className="font-medium text-foreground">Awaiting countersignature</span> and
            appears in the admin&apos;s pending list — it can be signed later from the equipment profile.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason</label>
            <Textarea rows={3} value={deferReason} onChange={(e) => setDeferReason(e.target.value)} placeholder="e.g. Department in-charge not available on the ward" />
          </div>
          <Button className="w-full" disabled={!deferReason.trim()} onClick={() => flow.deferCountersign(deferReason.trim())}>
            Submit without countersignature
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <StepHeader title="Department countersignature" onBack={() => flow.backFromSignoff("SIGNOFF_ENGINEER")} />
      <div className="flex-1 space-y-4 p-5">
        {engineerSigned && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle size={16} weight="fill" /> Engineer signature captured
          </div>
        )}

        <RadioGroup value={path} onValueChange={(v) => setPath(v as typeof path)} className="gap-2">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="IN_SYSTEM" /> They have a system account
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="OFF_SYSTEM" /> They don&apos;t — capture on the spot
          </label>
        </RadioGroup>

        {path === "IN_SYSTEM" ? (
          <div className="space-y-3">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select department in-charge / head" /></SelectTrigger>
              <SelectContent>
                {inSystemOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} · {m.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMember && (
              <PmSignatureOtp phone={selectedMember.phone} onVerified={completeInSystem} />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Input placeholder="Name" value={offName} onChange={(e) => setOffName(e.target.value)} />
            <Input placeholder="Designation" value={offDesignation} onChange={(e) => setOffDesignation(e.target.value)} />
            <Input placeholder="Phone (optional)" value={offPhone} onChange={(e) => setOffPhone(e.target.value)} />

            {!offSignatureUrl ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Signature</p>
                <PmSignatureCanvas onCapture={setOffSignatureUrl} />
              </div>
            ) : (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={offSignatureUrl} alt="Captured signature" className="h-24 w-full rounded-lg border bg-white object-contain" />
                <Button type="button" variant="outline" size="sm" onClick={() => setOffSignatureUrl(null)}>Redo signature</Button>
              </div>
            )}

            {offSignatureUrl && offName.trim() && (
              offPhone.trim() ? (
                <PmSignatureOtp phone={offPhone.trim()} onVerified={completeOffSystemVerified} />
              ) : (
                <Button className="w-full" onClick={completeOffSystemUnverified}>
                  Complete — unverified (no phone given)
                </Button>
              )
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setDeferring(true)}
          className="mx-auto block text-xs font-medium text-muted-foreground underline underline-offset-2"
        >
          Submit without countersignature
        </button>
      </div>
    </>
  );
}

export function PmReportSignoffStep({ flow }: { flow: PmReportFlow }) {
  const { report } = flow;
  if (!report) return null;

  if (flow.step === "SIGNOFF_ENGINEER") return <EngineerSignoff flow={flow} />;

  return <CountersignSignoff flow={flow} engineerSigned={!!report.engineerSignature} />;
}
