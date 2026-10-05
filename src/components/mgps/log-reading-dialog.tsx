"use client";

import { useState } from "react";
import { useDemo, MGPS_ZONES, pipedGas, readingState, formatRange, type PipedGasId } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, Problem } from "./mgps-shared";

function ReadingForm({ initialGas, onClose, onSaved }: { initialGas: PipedGasId; onClose: () => void; onSaved: (message: string) => void }) {
  const logReading = useDemo((s) => s.logMgpsReading);
  const firstZone = MGPS_ZONES.find((z) => z.gases.includes(initialGas)) ?? MGPS_ZONES[0];
  const [zoneId, setZoneId] = useState(firstZone.id);
  const [gasId, setGasId] = useState<PipedGasId>(firstZone.gases.includes(initialGas) ? initialGas : firstZone.gases[0]);
  const [value, setValue] = useState("");

  const zone = MGPS_ZONES.find((z) => z.id === zoneId)!;
  const gas = pipedGas(gasId);
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(n) && n > 0;
  const state = valid ? readingState(n, gas.range) : null;

  function changeZone(id: string) {
    const next = MGPS_ZONES.find((z) => z.id === id)!;
    setZoneId(id);
    if (!next.gases.includes(gasId)) setGasId(next.gases[0]);
  }

  function save() {
    if (!valid) return;
    const saved = logReading({ zoneId, gasId, value: n });
    onSaved(saved === "Normal" ? "Reading saved" : "Reading saved and alarm raised");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log a pressure reading</DialogTitle>
        <DialogDescription>From the zone&apos;s area alarm panel. Out-of-range readings raise an alarm.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Field label="Zone" required>
          <Select value={zoneId} onValueChange={changeZone}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {MGPS_ZONES.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name} · {z.panel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Gas" required>
          <Select value={gasId} onValueChange={(g) => setGasId(g as PipedGasId)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {zone.gases.map((g) => (
                <SelectItem key={g} value={g}>
                  {pipedGas(g).name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={`Reading (${gas.unit})`} required>
          <Input
            type="number"
            inputMode="decimal"
            step={gas.unit === "bar" ? 0.1 : 5}
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Normal range ${formatRange(gas)}`}
          />
        </Field>
        {state && state !== "Normal" && (
          <Problem>
            This reading is {state.toLowerCase()} for {gas.name.toLowerCase()} (normal is {formatRange(gas)}). Saving it raises an alarm for {zone.name}.
          </Problem>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!valid} onClick={save}>
          {state && state !== "Normal" ? "Save and raise alarm" : "Save reading"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function LogReadingDialog({
  open,
  initialGas,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initialGas: PipedGasId;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <ReadingForm
            initialGas={initialGas}
            onClose={() => onOpenChange(false)}
            onSaved={(message) => {
              onOpenChange(false);
              onSaved(message);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
