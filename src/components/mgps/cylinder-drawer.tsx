"use client";

import { ArrowsLeftRight, Package, Truck, Warning } from "@phosphor-icons/react";
import {
  useDemo,
  getUser,
  isAway,
  isReturnOverdue,
  isHydroOverdue,
  reasonOf,
  locationLabel,
  newestFirst,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PrintableQrLabel } from "@/components/printable-qr-label";
import { cn } from "@/lib/utils";
import type { CylinderActionRequest } from "./cylinder-action-dialog";
import { CYLINDER_STATUS_TONE, MOVEMENT_TONE, Pill, formatDateTime, formatDay } from "./mgps-shared";

export function CylinderDrawer({
  cylinderId,
  open,
  onOpenChange,
  onAction,
  onToast,
}: {
  cylinderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (request: CylinderActionRequest) => void;
  onToast: (message: string) => void;
}) {
  const c = useDemo((s) => s.cylinders.find((x) => x.id === cylinderId));
  const allMovements = useDemo((s) => s.cylinderMovements);
  const departments = useDemo((s) => s.departments);
  const markEmpty = useDemo((s) => s.markCylinderEmpty);

  const movements = c ? allMovements.filter((m) => m.cylinderId === c.id).sort((a, b) => newestFirst(a.at, b.at)) : [];
  const away = c ? isAway(c) : false;

  const facts: [string, React.ReactNode][] = c
    ? [
        ["Current location", locationLabel(c.location, departments)],
        ["Why it is there", reasonOf(c)],
        ["Fill state", c.fill],
        ["Serial number", c.serialNumber],
        [
          "Next hydro test",
          <span key="hydro" className={cn(isHydroOverdue(c) && "font-semibold text-red-600")}>
            {formatDay(c.hydroTestDue)}
            {isHydroOverdue(c) && " (overdue)"}
          </span>,
        ],
        ...(c.away
          ? ([
              ["Sent for", c.away.purpose],
              ["Sent on", formatDay(c.away.sentOn)],
              ["Expected return", formatDay(c.away.expectedReturn)],
            ] as [string, React.ReactNode][])
          : []),
        ...(c.damageNote ? ([["Damage", c.damageNote]] as [string, React.ReactNode][]) : []),
      ]
    : [];

  function handleMarkEmpty() {
    if (!c) return;
    const problem = markEmpty(c.id);
    onToast(problem ?? `${c.id} marked empty`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        {c && (
          <>
            <SheetHeader className="border-b pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg">{c.id}</SheetTitle>
                <Pill tone={CYLINDER_STATUS_TONE[c.status]}>{c.status}</Pill>
                {isReturnOverdue(c) && <Pill tone="bad">Return overdue</Pill>}
              </div>
              <SheetDescription>
                {c.gas} · {c.size}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2">
                {away ? (
                  <Button className="gap-1.5" onClick={() => onAction({ kind: "receive", cylinderId: c.id })}>
                    <Package size={16} /> Receive
                  </Button>
                ) : (
                  <>
                    <Button className="gap-1.5" onClick={() => onAction({ kind: "transfer", cylinderId: c.id })}>
                      <ArrowsLeftRight size={16} /> Transfer
                    </Button>
                    <Button variant="outline" className="gap-1.5" onClick={() => onAction({ kind: "dispatch", cylinderId: c.id })}>
                      <Truck size={16} /> Send to vendor
                    </Button>
                    {c.fill !== "Empty" && (
                      <Button variant="outline" onClick={handleMarkEmpty}>
                        Mark empty
                      </Button>
                    )}
                    {c.status !== "Damaged" && (
                      <Button variant="outline" className="gap-1.5" onClick={() => onAction({ kind: "damage", cylinderId: c.id })}>
                        <Warning size={16} /> Report damage
                      </Button>
                    )}
                  </>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {facts.map(([k, val]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{val}</dd>
                  </div>
                ))}
              </dl>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">QR label</h3>
                <p className="text-sm text-muted-foreground">Stick it on the cylinder shoulder. The code encodes {c.id}.</p>
                <PrintableQrLabel value={c.id}>
                  <p className="text-lg font-bold tracking-tight">{c.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.gas} · {c.size.split(" (")[0]}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Serial {c.serialNumber}</p>
                </PrintableQrLabel>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium">Movement history</h3>
                {movements.length > 0 ? (
                  <ol className="space-y-4 border-l pl-4">
                    {movements.map((m) => (
                      <li key={m.id} className="relative space-y-1">
                        <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-foreground" aria-hidden />
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <Pill tone={MOVEMENT_TONE[m.kind]}>{m.kind}</Pill>
                          {locationLabel(m.from, departments)} → {locationLabel(m.to, departments)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(m.at)} · {getUser(m.byUserId)?.name ?? "Unknown"}
                          {m.note && ` · ${m.note}`}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No movements recorded yet.</p>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
