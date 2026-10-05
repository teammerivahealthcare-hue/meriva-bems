"use client";

import { useState } from "react";
import { ArrowsLeftRight, Plus } from "@phosphor-icons/react";
import { useDemo, inDepartment, reasonOf, CYLINDER_GASES, type GasCylinder } from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CylinderActionRequest } from "./cylinder-action-dialog";
import { Field, PART_COLOR, Problem, floorName, type MgpsData } from "./mgps-shared";

type PartKey = "inUse" | "full" | "empty" | "damaged";

const PARTS: { key: PartKey; label: string; color: string }[] = [
  { key: "inUse", label: "In use", color: PART_COLOR.inUse },
  { key: "full", label: "Full, standing by", color: PART_COLOR.full },
  { key: "empty", label: "Empty, awaiting pickup", color: PART_COLOR.empty },
  { key: "damaged", label: "Damaged", color: PART_COLOR.damaged },
];

function counts(list: GasCylinder[]): Record<PartKey, number> {
  const ok = list.filter((c) => c.status !== "Damaged");
  return {
    inUse: ok.filter((c) => c.fill === "In use").length,
    full: ok.filter((c) => c.fill === "Full").length,
    empty: ok.filter((c) => c.fill === "Empty").length,
    damaged: list.length - ok.length,
  };
}

function partOf(c: GasCylinder): PartKey {
  if (c.status === "Damaged") return "damaged";
  return c.fill === "Empty" ? "empty" : c.fill === "Full" ? "full" : "inUse";
}

function AddDepartmentDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (open: boolean) => void; onAdded: (id: string, name: string) => void }) {
  const departments = useDemo((s) => s.departments);
  const floors = useDemo((s) => s.floors);
  const addDepartment = useDemo((s) => s.addDepartment);
  const [v, setV] = useState({ name: "", code: "", floorId: "", inCharge: "", phone: "" });

  const name = v.name.trim();
  const code = v.code.trim();
  const duplicate =
    (name && departments.some((d) => d.name.toLowerCase() === name.toLowerCase()) && "A department with this name already exists.") ||
    (code && departments.some((d) => d.code?.toLowerCase() === code.toLowerCase()) && "A department with this code already exists.") ||
    "";
  const floorId = v.floorId || floors[0]?.id || "";
  const canSave = name && code && floorId && !duplicate;

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) setV({ name: "", code: "", floorId: "", inCharge: "", phone: "" });
  }

  function save() {
    if (!canSave) return;
    const id = addDepartment(floorId, name, { code: code.toUpperCase(), inCharge: v.inCharge.trim() || undefined, phone: v.phone.trim() || undefined });
    if (id) onAdded(id, name);
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add department</DialogTitle>
          <DialogDescription>Departments are shared with Settings. Cylinders can be issued to it straight away.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Department name" required>
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Cath Lab" />
          </Field>
          <Field label="Short code" required>
            <Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} placeholder="CATH" />
          </Field>
          <Field label="Floor">
            <Select value={floorId} onValueChange={(floor) => setV({ ...v, floorId: floor })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="In-charge">
            <Input value={v.inCharge} onChange={(e) => setV({ ...v, inCharge: e.target.value })} />
          </Field>
          <Field label="Phone / extension">
            <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </Field>
        </div>
        {duplicate && <Problem>{duplicate}</Problem>}
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={save}>
            Save department
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentsTab({
  data,
  selectedId,
  onSelect,
  onOpenCylinder,
  onAction,
  onToast,
}: {
  data: MgpsData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenCylinder: (id: string) => void;
  onAction: (request: CylinderActionRequest) => void;
  onToast: (message: string) => void;
}) {
  const collectEmpty = useDemo((s) => s.collectEmptyCylinders);
  const [adding, setAdding] = useState(false);
  const { cylinders, departments, floors } = data;

  const rows = departments
    .map((d) => ({ dept: d, list: cylinders.filter((c) => inDepartment(c, d.id)) }))
    .sort((a, b) => b.list.length - a.list.length || a.dept.name.localeCompare(b.dept.name));
  const max = Math.max(1, ...rows.map((r) => r.list.length));
  const current = rows.find((r) => r.dept.id === selectedId) ?? rows[0];
  const totalPlaced = rows.reduce((s, r) => s + r.list.length, 0);
  const totalEmpty = rows.reduce((s, r) => s + counts(r.list).empty, 0);

  if (!current) return null;
  const k = counts(current.list);
  const gasMix = CYLINDER_GASES.map((g) => [g, current.list.filter((c) => c.gas === g).length] as const).filter(([, n]) => n > 0);
  const sorted = [...current.list].sort((a, b) => Number(b.fill === "Empty") - Number(a.fill === "Empty") || a.id.localeCompare(b.id));

  function collect() {
    const n = collectEmpty(current.dept.id);
    onToast(`${n} empty cylinder${n === 1 ? "" : "s"} returned to central stock`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalPlaced}</span> cylinders across{" "}
          <span className="font-medium text-foreground">{rows.filter((r) => r.list.length).length}</span> departments
          {totalEmpty > 0 && (
            <>
              {" · "}
              <span className="font-medium text-amber-700">{totalEmpty} empty to collect</span>
            </>
          )}
        </p>
        <Button onClick={() => setAdding(true)} className="gap-2 px-4">
          <Plus size={16} /> Add department
        </Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Card className="min-w-0 gap-3 p-4 lg:col-span-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
            {PARTS.map((p) => (
              <span key={p.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
                {p.label}
              </span>
            ))}
          </div>
          <ul className="space-y-1" aria-label="Departments">
            {rows.map(({ dept, list }) => {
              const c = counts(list);
              const on = dept.id === current.dept.id;
              return (
                <li key={dept.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(dept.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      on ? "border-primary bg-blue-50/40" : "border-transparent hover:bg-muted"
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{dept.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{list.length}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="truncate">
                        {floorName(floors, dept.floor)}
                        {dept.inCharge && ` · ${dept.inCharge}`}
                      </span>
                      {c.empty > 0 && <span className="shrink-0 font-medium text-amber-700">{c.empty} empty</span>}
                    </span>
                    {list.length > 0 && (
                      <span className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full" style={{ width: `${Math.max(6, (list.length / max) * 100)}%` }}>
                        {PARTS.map((p) =>
                          c[p.key] ? <span key={p.key} style={{ width: `${(c[p.key] / list.length) * 100}%`, background: p.color }} /> : null
                        )}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="min-w-0 gap-3 p-5 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{current.dept.name}</h3>
                {current.dept.code && (
                  <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                    {current.dept.code}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {floorName(floors, current.dept.floor)}
                {current.dept.inCharge && ` · In-charge ${current.dept.inCharge}`}
                {current.dept.phone && ` · ${current.dept.phone}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {k.empty > 0 && (
                <Button variant="outline" onClick={collect}>
                  Collect {k.empty} empty
                </Button>
              )}
              <Button className="gap-1.5" onClick={() => onAction({ kind: "transfer", presetTo: current.dept.id })}>
                <ArrowsLeftRight size={16} /> Issue cylinder
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PARTS.map((p) => (
              <div key={p.key} className="rounded-lg bg-muted p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{k[p.key]}</p>
              </div>
            ))}
          </div>

          {gasMix.length > 0 && <p className="text-sm text-muted-foreground">{gasMix.map(([g, n]) => `${g} ${n}`).join(" · ")}</p>}

          {sorted.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cylinder no.</TableHead>
                  <TableHead>Gas</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button type="button" className="font-medium hover:underline" onClick={() => onOpenCylinder(c.id)}>
                        {c.id}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.gas}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{c.size}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: PARTS.find((p) => p.key === partOf(c))!.color }} />
                        {reasonOf(c)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAction({ kind: "transfer", cylinderId: c.id, presetTo: c.fill === "Empty" ? "STOCK" : undefined })}
                      >
                        {c.fill === "Empty" ? "Return to stock" : "Transfer"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
              No cylinders in {current.dept.name}. Use Issue cylinder to send one from central stock.
            </p>
          )}
        </Card>
      </div>

      <AddDepartmentDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={(id, name) => {
          onSelect(id);
          onToast(`${name} added`);
        }}
      />
    </div>
  );
}
