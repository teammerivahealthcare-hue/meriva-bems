"use client";

import { useState } from "react";
import { CheckCircle, Flask } from "@phosphor-icons/react";
import { useDemo, getUser, getVendor, frequencyLabel, newestFirst, MGPS_EQUIPMENT_IDS, type MgpsTest } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { Field, Pill, SectionCard, TEST_STATE_TONE, formatDay, type MgpsData } from "./mgps-shared";

function RecordResultDialog({ test, onOpenChange, onSaved }: { test: MgpsTest | null; onOpenChange: (open: boolean) => void; onSaved: (message: string) => void }) {
  const record = useDemo((s) => s.recordMgpsTest);
  const [passed, setPassed] = useState("pass");
  const [result, setResult] = useState("");

  function close(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setPassed("pass");
      setResult("");
    }
  }

  function save() {
    if (!test || !result.trim()) return;
    record({ testId: test.id, passed: passed === "pass", result: result.trim() });
    onSaved(`${test.name} recorded`);
    close(false);
  }

  return (
    <Dialog open={test != null} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {test && (
          <>
            <DialogHeader>
              <DialogTitle>Record result</DialogTitle>
              <DialogDescription>
                {test.name} · {test.scope}. The next due date moves on from today.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <RadioGroup value={passed} onValueChange={setPassed} className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="pass" /> Passed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="fail" /> Failed
                </label>
              </RadioGroup>
              <Field label="Result" required>
                <Input value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. All 4 panels passed battery self-test" />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button disabled={!result.trim()} onClick={save}>
                Save result
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TestsTab({ data, onToast }: { data: MgpsData; onToast: (message: string) => void }) {
  const [recording, setRecording] = useState<MgpsTest | null>(null);
  const certificates = data.calibrationRecords
    .filter((c) => MGPS_EQUIPMENT_IDS.includes(c.equipmentId))
    .sort((a, b) => newestFirst(a.performedAt, b.performedAt));

  return (
    <div className="space-y-4">
      <SectionCard title="Test plan" action={<span className="text-xs text-muted-foreground">Statutory MGPS checks and when each is next due</span>}>
        <ul className="divide-y">
          {data.testRows.map(({ test, due, state }) => {
            const last = test.results[0];
            return (
              <li key={test.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Flask size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{test.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {test.scope} · {frequencyLabel(test.frequencyMonths)}
                    {last && ` · last result: ${last.result}`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {last ? `Last done ${formatDay(last.at)} by ${getUser(last.byUserId)?.name ?? "Unknown"}` : "Never done"} · next due {formatDay(due)}
                  </p>
                </div>
                <Pill tone={TEST_STATE_TONE[state]}>{state}</Pill>
                <Button variant="outline" size="sm" onClick={() => setRecording(test)}>
                  Record result
                </Button>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard title="Compliance certificates" action={<span className="text-xs text-muted-foreground">Issued against the source equipment records</span>}>
        {certificates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Performed by</TableHead>
                <TableHead>Certificate #</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDay(c.performedAt)}</TableCell>
                  <TableCell>
                    <Pill tone={c.passed ? "good" : "bad"}>{c.passed ? "Pass" : "Fail"}</Pill>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDay(c.validUntil)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(c.performedByUserId ? getUser(c.performedByUserId)?.name : getVendor(c.performedByVendorId)?.name) ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.certificateNumber}</TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground" title={c.accuracyNotes}>
                    {c.accuracyNotes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState icon={CheckCircle} message="No compliance certificates on file yet." />
        )}
      </SectionCard>

      <RecordResultDialog test={recording} onOpenChange={(open) => !open && setRecording(null)} onSaved={onToast} />
    </div>
  );
}
