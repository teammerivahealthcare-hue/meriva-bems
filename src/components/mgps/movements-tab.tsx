"use client";

import { useState } from "react";
import { ArrowsLeftRight, ClockCounterClockwise, Package, Truck } from "@phosphor-icons/react";
import { getUser, getVendor, isAway, isReturnOverdue, daysBetween, dayKey, mgpsToday, newestFirst, type CylinderMovementKind } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import type { CylinderActionRequest } from "./cylinder-action-dialog";
import { MOVEMENT_TONE, Pill, SectionCard, formatDateTime, formatDay, type MgpsData } from "./mgps-shared";

const ALL = "all";

export function MovementsTab({
  data,
  onOpenCylinder,
  onAction,
}: {
  data: MgpsData;
  onOpenCylinder: (id: string) => void;
  onAction: (request: CylinderActionRequest) => void;
}) {
  const [f, setF] = useState({ q: "", kind: ALL, from: "", to: "" });
  const today = mgpsToday();
  const away = data.cylinders.filter(isAway).sort((a, b) => (a.away?.expectedReturn ?? "").localeCompare(b.away?.expectedReturn ?? ""));
  const overdue = away.filter((c) => isReturnOverdue(c)).length;
  const kinds = [...new Set(data.movements.map((m) => m.kind))].sort() as CylinderMovementKind[];
  const log = data.movements
    .filter(
      (m) =>
        (f.kind === ALL || m.kind === f.kind) &&
        (!f.q.trim() || m.cylinderId.toLowerCase().includes(f.q.trim().toLowerCase())) &&
        (!f.from || dayKey(new Date(m.at)) >= f.from) &&
        (!f.to || dayKey(new Date(m.at)) <= f.to)
    )
    .sort((a, b) => newestFirst(a.at, b.at));
  const filtered = f.q || f.kind !== ALL || f.from || f.to;

  const cylinderLink = (id: string) => (
    <button type="button" className="font-medium hover:underline" onClick={() => onOpenCylinder(id)}>
      {id}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="gap-1.5" onClick={() => onAction({ kind: "receive" })}>
          <Package size={16} /> Receive
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={() => onAction({ kind: "dispatch" })}>
          <Truck size={16} /> Send to vendor
        </Button>
        <Button className="gap-1.5" onClick={() => onAction({ kind: "transfer" })}>
          <ArrowsLeftRight size={16} /> New transfer
        </Button>
      </div>

      <SectionCard
        title="Away at vendors"
        action={
          <span className="text-xs text-muted-foreground">
            {away.length} cylinder{away.length === 1 ? "" : "s"} · {overdue} overdue
          </span>
        }
      >
        {away.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cylinder no.</TableHead>
                <TableHead>Gas</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Sent on</TableHead>
                <TableHead>Expected return</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {away.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{cylinderLink(c.id)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.gas}</TableCell>
                  <TableCell>{c.location.kind === "VENDOR" ? getVendor(c.location.vendorId)?.name : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.away?.purpose}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{c.away && formatDay(c.away.sentOn)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{c.away && formatDay(c.away.expectedReturn)}</TableCell>
                  <TableCell>
                    {isReturnOverdue(c) ? (
                      <Pill tone="bad">{daysBetween(c.away!.expectedReturn, today)} days overdue</Pill>
                    ) : (
                      <Pill tone="good">On time</Pill>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => onAction({ kind: "receive", cylinderId: c.id })}>
                      Receive
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState icon={Truck} message="No cylinders are outside the hospital." />
        )}
      </SectionCard>

      <SectionCard
        title="Movement log"
        action={<span className="text-xs text-muted-foreground">Transfers, vendor dispatch and receiving in one list. Entries cannot be edited.</span>}
      >
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="min-w-44 flex-1 bg-surface"
            placeholder="Cylinder number"
            aria-label="Cylinder number"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
          />
          <Select value={f.kind} onValueChange={(kind) => setF({ ...f, kind })}>
            <SelectTrigger aria-label="Movement type" className="bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={ALL}>All types</SelectItem>
              {kinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            From
            <Input type="date" className="w-auto bg-surface" value={f.from} max={f.to || undefined} onChange={(e) => setF({ ...f, from: e.target.value })} />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            To
            <Input type="date" className="w-auto bg-surface" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </label>
          {filtered && (
            <button type="button" className="h-9 text-sm font-medium text-primary hover:underline" onClick={() => setF({ q: "", kind: ALL, from: "", to: "" })}>
              Clear filters
            </button>
          )}
        </div>

        {log.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Cylinder no.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From → to</TableHead>
                <TableHead>Done by</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(m.at)}</TableCell>
                  <TableCell>{cylinderLink(m.cylinderId)}</TableCell>
                  <TableCell>
                    <Pill tone={MOVEMENT_TONE[m.kind]}>{m.kind}</Pill>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {data.label(m.from)} → <span className="font-medium text-foreground">{data.label(m.to)}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{getUser(m.byUserId)?.name ?? "Unknown"}</TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground" title={m.note}>
                    {m.note ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState icon={ClockCounterClockwise} message="No movements match these filters." />
        )}
      </SectionCard>
    </div>
  );
}
