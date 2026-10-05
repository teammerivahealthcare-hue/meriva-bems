"use client";

import { useState } from "react";
import { BellSimple, QrCode, WarningOctagon } from "@phosphor-icons/react";
import {
  useDemo,
  PIPED_GASES,
  readingState,
  formatReading,
  formatDate,
  type MgpsAlarm,
  type MgpsRoomStatus,
  type MgpsZoneView,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoomLabelDialog } from "@/components/room-label-dialog";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { Pill, SectionCard, ZONE_STATUS_TONE, TONE_TEXT, formatDateTime, type MgpsData } from "./mgps-shared";

// ─────────────────────────────────────────────────────────────
// Alarms
// ─────────────────────────────────────────────────────────────

export function AlarmList({ alarms, onAcknowledge }: { alarms: MgpsAlarm[]; onAcknowledge: (id: string) => void }) {
  if (alarms.length === 0) return <EmptyState icon={BellSimple} message="No alarms or open incidents on the pipeline." />;
  return (
    <ul className="divide-y">
      {alarms.map((a) => (
        <li key={a.id} className={cn("flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0", a.acknowledged && "opacity-70")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <WarningOctagon size={16} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">{a.title}</p>
            <p className="text-sm text-muted-foreground">{a.detail}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(a.raisedAt)} · {a.reference} · {a.owner} · {a.zoneName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={a.statusLabel === "Needs review" ? "warn" : "bad"}>{a.statusLabel}</Pill>
            {a.acknowledged ? (
              <Pill tone="neutral">Acknowledged</Pill>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onAcknowledge(a.id)}>
                Acknowledge
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
// Rooms behind a zone — each room's open fault (if any) plus its
// printable QR, to post in the room for reporting MGPS issues.
// ─────────────────────────────────────────────────────────────

function RoomStatusCard({ status, onPrintQr }: { status: MgpsRoomStatus; onPrintQr: () => void }) {
  const fault = status.fault;
  return (
    <Card className="gap-0 p-0">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{status.roomName}</p>
            <p className="truncate text-xs text-muted-foreground">{status.roomLabel}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onPrintQr} title={`Print QR for ${status.roomName}`} aria-label={`Print QR for ${status.roomName}`}>
            <QrCode size={16} />
          </Button>
        </div>
        {fault ? (
          <div className={cn("space-y-1 rounded-lg p-2", fault.priority === "CRITICAL" || fault.responseOverdue ? "bg-red-50" : "bg-amber-50")}>
            <p className="text-xs font-medium">
              {fault.issueType} · {fault.ticketNumber}
            </p>
            <p className="text-xs text-muted-foreground">{fault.description}</p>
            <p className="text-[11px] text-muted-foreground">
              Reported by {fault.reportedByName} · {formatDate(fault.reportedAt)}
            </p>
          </div>
        ) : (
          <Pill tone="good">OK, no open issues</Pill>
        )}
      </CardContent>
    </Card>
  );
}

export function ZoneRoomsDialog({ zone, onOpenChange }: { zone: MgpsZoneView | null; onOpenChange: (open: boolean) => void }) {
  const [qrRoom, setQrRoom] = useState<MgpsRoomStatus | null>(null);
  return (
    <>
      <Dialog open={zone != null} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {zone && (
            <>
              <DialogHeader>
                <DialogTitle>{zone.zone.name}</DialogTitle>
                <DialogDescription>
                  {zone.zone.panel} · {zone.rooms.filter((r) => r.fault).length} of {zone.rooms.length} rooms need support
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {zone.rooms.map((status) => (
                  <RoomStatusCard key={status.roomId} status={status} onPrintQr={() => setQrRoom(status)} />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <RoomLabelDialog
        open={qrRoom != null}
        onOpenChange={(open) => !open && setQrRoom(null)}
        roomId={qrRoom?.roomId ?? ""}
        roomName={qrRoom?.roomName ?? ""}
        floorLabel={qrRoom?.roomLabel}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab
// ─────────────────────────────────────────────────────────────

export function ZonesTab({ data }: { data: MgpsData }) {
  const acknowledge = useDemo((s) => s.acknowledgeMgpsAlarm);
  const [openZone, setOpenZone] = useState<MgpsZoneView | null>(null);

  return (
    <div className="space-y-4">
      <SectionCard title="Active alarms and incidents" action={<span className="text-xs text-muted-foreground">{data.activeAlarms} active</span>}>
        <AlarmList alarms={data.alarms} onAcknowledge={acknowledge} />
      </SectionCard>

      <SectionCard title="Zones" action={<span className="text-xs text-muted-foreground">Latest reading per gas. Select a zone to see its rooms.</span>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone</TableHead>
              <TableHead>Area alarm panel</TableHead>
              <TableHead>Isolation valve</TableHead>
              {PIPED_GASES.map((g) => (
                <TableHead key={g.id}>{g.name}</TableHead>
              ))}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.zones.map((z) => (
              <TableRow key={z.zone.id} className="cursor-pointer" onClick={() => setOpenZone(z)}>
                <TableCell>
                  <button type="button" className="font-medium hover:underline" onClick={(e) => {
                      e.stopPropagation();
                      setOpenZone(z);
                    }}
                  >
                    {z.zone.name}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{z.zone.panel}</TableCell>
                <TableCell className="text-muted-foreground">{z.zone.valve}</TableCell>
                {PIPED_GASES.map((g) => {
                  const r = z.readings[g.id];
                  if (!z.zone.gases.includes(g.id)) return <TableCell key={g.id} className="text-muted-foreground/70">Not piped</TableCell>;
                  if (!r) return <TableCell key={g.id} className="text-muted-foreground">No reading</TableCell>;
                  const state = readingState(r.value, g.range);
                  return (
                    <TableCell key={g.id} className={cn("whitespace-nowrap tabular-nums", state === "Normal" ? "font-medium" : "font-medium text-red-600")}>
                      {formatReading(r.value, g)}
                      {state !== "Normal" && ` (${state})`}
                    </TableCell>
                  );
                })}
                <TableCell className={cn("whitespace-nowrap font-medium", TONE_TEXT[ZONE_STATUS_TONE[z.status]])}>{z.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <ZoneRoomsDialog zone={openZone} onOpenChange={(open) => !open && setOpenZone(null)} />
    </div>
  );
}
