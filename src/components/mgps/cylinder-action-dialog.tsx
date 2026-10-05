"use client";

import { useState } from "react";
import {
  useDemo,
  CYLINDER_GASES,
  CYLINDER_SIZES,
  CYLINDER_VENDOR_IDS,
  VENDOR_PURPOSES,
  getVendor,
  isAway,
  isReady,
  inStock,
  sameLocation,
  transferProblem,
  dispatchProblem,
  receiveProblem,
  registerProblem,
  nextHydroDue,
  mgpsToday,
  dayKey,
  locationLabel,
  type CylinderGas,
  type CylinderSize,
  type CylinderVendorPurpose,
  type GasCylinder,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, Problem, locationFromKey } from "./mgps-shared";

export type CylinderActionKind = "transfer" | "dispatch" | "receive" | "damage" | "register";

export interface CylinderActionRequest {
  kind: CylinderActionKind;
  /** Acting on one cylinder (from its drawer or a table row) rather than choosing in the dialog. */
  cylinderId?: string;
  /** Transfer destination: "STOCK" or a department id. A department preset means "issue": only full cylinders from central stock are offered. */
  presetTo?: string;
}

const COPY: Record<CylinderActionKind, { title: string; description: string; submit: string }> = {
  transfer: { title: "Transfer cylinder", description: "Move a cylinder between central stock and departments.", submit: "Transfer" },
  dispatch: { title: "Send to vendor", description: "Dispatch a cylinder for refilling, hydro testing or repair.", submit: "Send to vendor" },
  receive: { title: "Receive from vendor", description: "Bring a cylinder back into central stock.", submit: "Receive into stock" },
  damage: { title: "Report damage", description: "Damaged cylinders can't be issued until repaired.", submit: "Report damage" },
  register: { title: "Register cylinder", description: "New cylinders start full, in central stock.", submit: "Register cylinder" },
};

function inDays(n: number): string {
  const [y, m, d] = mgpsToday().split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

function ActionForm({ request, onClose, onDone }: { request: CylinderActionRequest; onClose: () => void; onDone: (message: string) => void }) {
  const cylinders = useDemo((s) => s.cylinders);
  const departments = useDemo((s) => s.departments);
  const store = useDemo.getState;
  const { kind } = request;
  const copy = COPY[kind];
  const today = mgpsToday();

  const preset = request.cylinderId ? cylinders.find((c) => c.id === request.cylinderId) : undefined;
  const issuing = kind === "transfer" && !!request.presetTo && request.presetTo !== "STOCK";
  const [v, setV] = useState({
    cylinderId: request.cylinderId ?? "",
    to: request.presetTo ?? "",
    receivedBy: "",
    vendorId: CYLINDER_VENDOR_IDS[0],
    purpose: "Refilling" as CylinderVendorPurpose,
    expectedReturn: inDays(6),
    filled: true,
    challan: "",
    note: "",
    newId: "",
    gas: "Oxygen" as CylinderGas,
    size: "D type (46.7 L)" as CylinderSize,
    serial: "",
    hydroDue: nextHydroDue(),
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof v>) => {
    setV({ ...v, ...patch });
    setError(null);
  };

  const c: GasCylinder | undefined = cylinders.find((x) => x.id === v.cylinderId);

  // Offer every cylinder the action could apply to, so a blocked one explains why
  // instead of silently missing — except issuing, which only offers ready stock.
  const options = cylinders.filter((x) => {
    if (issuing) return inStock(x) && isReady(x);
    if (kind === "receive") return isAway(x);
    if (kind === "damage") return !isAway(x) && x.status !== "Damaged";
    return true;
  });

  const destinations = [
    { key: "STOCK", label: "Central stock" },
    ...departments.map((d) => ({ key: d.id, label: d.name })),
  ].filter((d) => !c || !sameLocation(c.location, locationFromKey(d.key)));

  let problem: string | null = null;
  let ready = false;
  if (kind === "register") {
    problem = v.newId.trim() ? registerProblem(v.newId, cylinders) : null;
    ready = !!v.newId.trim() && !problem && !!v.hydroDue;
  } else if (c) {
    if (kind === "transfer") {
      const to = locationFromKey(v.to);
      problem = to || isAway(c) ? transferProblem(c, to) : null;
      ready = !!to && !problem;
    } else if (kind === "dispatch") {
      problem = dispatchProblem(c, v.purpose) ?? (v.expectedReturn && v.expectedReturn < today ? "Expected return can't be in the past." : null);
      ready = !problem && !!v.expectedReturn;
    } else if (kind === "receive") {
      problem = receiveProblem(c);
      ready = !problem;
    } else if (kind === "damage") {
      problem = isAway(c) ? "This cylinder is at a vendor. It can only be received." : c.status === "Damaged" ? "Damage is already reported on this cylinder." : null;
      ready = !problem && !!v.note.trim();
    }
  }

  function submit() {
    if (!ready) return;
    const s = store();
    let result: string | null = null;
    let message = "";
    if (kind === "register") {
      result = s.registerCylinder({ id: v.newId, gas: v.gas, size: v.size, serialNumber: v.serial, hydroTestDue: v.hydroDue });
      message = `${v.newId.trim().toUpperCase()} registered in central stock`;
    } else if (c && kind === "transfer") {
      const to = locationFromKey(v.to)!;
      result = s.transferCylinder({ cylinderId: c.id, to, receivedBy: v.receivedBy, note: v.note });
      message = `${c.id} transferred to ${destinations.find((d) => d.key === v.to)?.label ?? "central stock"}`;
    } else if (c && kind === "dispatch") {
      result = s.sendCylinderToVendor({ cylinderId: c.id, vendorId: v.vendorId, purpose: v.purpose, expectedReturn: v.expectedReturn, note: v.note });
      message = `${c.id} sent to ${getVendor(v.vendorId)?.name ?? "vendor"}`;
    } else if (c && kind === "receive") {
      result = s.receiveCylinder({ cylinderId: c.id, filled: v.filled, challan: v.challan, note: v.note });
      message = `${c.id} received into central stock`;
    } else if (c && kind === "damage") {
      result = s.reportCylinderDamage({ cylinderId: c.id, note: v.note });
      message = `Damage reported on ${c.id}`;
    }
    if (result) setError(result);
    else onDone(message);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{issuing ? `Issue a full cylinder from central stock to ${departments.find((d) => d.id === request.presetTo)?.name}.` : copy.description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        {kind !== "register" &&
          (preset ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{preset.id}</span>
              <span className="text-muted-foreground">
                {" "}· {preset.gas} · {preset.size} · {preset.fill.toLowerCase()} · now at {locationLabel(preset.location, departments)}
              </span>
            </p>
          ) : (
            <Field label="Cylinder" required>
              <Select value={v.cylinderId} onValueChange={(cylinderId) => set({ cylinderId })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={options.length ? "Select cylinder" : "No cylinders available"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {options.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.id} · {x.gas} · {x.fill} · {locationLabel(x.location, departments)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ))}

        {kind === "transfer" && (
          <>
            <Field label="Transfer to" required>
              <Select value={v.to} onValueChange={(to) => set({ to })} disabled={issuing}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {destinations.some((d) => d.key === "STOCK") && (
                    <>
                      <SelectItem value="STOCK">Central stock</SelectItem>
                      <SelectSeparator />
                    </>
                  )}
                  {destinations
                    .filter((d) => d.key !== "STOCK")
                    .map((d) => (
                      <SelectItem key={d.key} value={d.key}>
                        {d.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Received by">
              <Input value={v.receivedBy} onChange={(e) => set({ receivedBy: e.target.value })} placeholder="Name of the nurse or technician" />
            </Field>
          </>
        )}

        {kind === "dispatch" && (
          <>
            <Field label="Vendor" required>
              <Select value={v.vendorId} onValueChange={(vendorId) => set({ vendorId })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {CYLINDER_VENDOR_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {getVendor(id)?.name ?? id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Purpose" required>
              <Select value={v.purpose} onValueChange={(purpose) => set({ purpose: purpose as CylinderVendorPurpose })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {VENDOR_PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Expected return" required>
              <Input type="date" value={v.expectedReturn} min={today} onChange={(e) => set({ expectedReturn: e.target.value })} />
            </Field>
          </>
        )}

        {kind === "receive" && (
          <>
            <Field label="Vendor challan number">
              <Input value={v.challan} onChange={(e) => set({ challan: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={v.filled} onCheckedChange={(checked) => set({ filled: checked === true })} />
              Filled, seal intact and valve checked
            </label>
          </>
        )}

        {kind === "register" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cylinder number" required>
              <Input value={v.newId} onChange={(e) => set({ newId: e.target.value })} placeholder="e.g. OXD-029" />
            </Field>
            <Field label="Serial number">
              <Input value={v.serial} onChange={(e) => set({ serial: e.target.value })} />
            </Field>
            <Field label="Gas" required>
              <Select value={v.gas} onValueChange={(gas) => set({ gas: gas as CylinderGas })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {CYLINDER_GASES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Size" required>
              <Select value={v.size} onValueChange={(size) => set({ size: size as CylinderSize })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {CYLINDER_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Next hydro test due" required>
              <Input type="date" value={v.hydroDue} onChange={(e) => set({ hydroDue: e.target.value })} />
            </Field>
          </div>
        )}

        {kind !== "register" && (
          <Field label={kind === "damage" ? "What is damaged?" : "Remarks"} required={kind === "damage"}>
            <Input value={v.note} onChange={(e) => set({ note: e.target.value })} />
          </Field>
        )}

        {(problem || error) && <Problem>{problem ?? error}</Problem>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!ready} onClick={submit}>
          {copy.submit}
        </Button>
      </DialogFooter>
    </>
  );
}

/** One dialog for every cylinder action. `request` null = closed; a new request object remounts the form. */
export function CylinderActionDialog({
  request,
  requestKey,
  onClose,
  onDone,
}: {
  request: CylinderActionRequest | null;
  requestKey: number;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  return (
    <Dialog open={request != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {request && <ActionForm key={requestKey} request={request} onClose={onClose} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}
