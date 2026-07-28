import Link from "next/link";
import {
  facility,
  buildInTransitMoves,
  buildActiveUsage,
  buildActiveRepairs,
  relativeTimeFromNow,
  formatDate,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCards, type StatCardSpec } from "@/components/stat-cards";

export default function SchedulePage() {
  const inTransit = buildInTransitMoves();
  const activeUsage = buildActiveUsage();
  const { internal: internalRepairs, external: externalRepairs } = buildActiveRepairs();

  const statCards: StatCardSpec[] = [
    {
      key: "inTransit",
      label: "Equipment moving",
      value: String(inTransit.length),
      subtext: "In transit between rooms",
    },
    {
      key: "activeSessions",
      label: "Equipment in use",
      value: String(activeUsage.length),
      subtext: "Switched on right now",
    },
    {
      key: "internalRepairs",
      label: "Internal repairs",
      value: String(internalRepairs.length),
      subtext: "By in-house engineers",
    },
    {
      key: "externalRepairs",
      label: "External repairs",
      value: String(externalRepairs.length),
      subtext: "By vendor / OEM",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-muted-foreground text-sm">
          Everything moving, switched on, or being repaired right now at {facility.name}.
        </p>
      </div>

      <StatCards stats={statCards} />

      <Card>
        <CardHeader>
          <CardTitle>Moving</CardTitle>
          <CardDescription>Equipment currently in transit between rooms</CardDescription>
        </CardHeader>
        <CardContent>
          {inTransit.length > 0 ? (
            <div>
              {inTransit.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link href={`/equipment/${m.equipmentId}`} className="text-sm font-medium hover:underline">
                      {m.equipmentDisplayName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.fromRoom} → {m.toRoom} · Initiated by {m.initiatedByName}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 bg-amber-50 text-amber-800 border-amber-200">
                    {relativeTimeFromNow(m.initiatedAt)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No equipment is being moved right now.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In use</CardTitle>
          <CardDescription>Equipment switched on right now, with an active usage session</CardDescription>
        </CardHeader>
        <CardContent>
          {activeUsage.length > 0 ? (
            <div>
              {activeUsage.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link href={`/equipment/${s.equipmentId}`} className="text-sm font-medium hover:underline">
                      {s.equipmentDisplayName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{s.userName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Started {relativeTimeFromNow(s.startedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No equipment is in active use right now.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>In repair — internal</CardTitle>
            <CardDescription>Work orders being handled by in-house engineers</CardDescription>
          </CardHeader>
          <CardContent>
            {internalRepairs.length > 0 ? (
              <div>
                {internalRepairs.map((r) => (
                  <div
                    key={r.id}
                    className="border-b border-muted py-3 text-sm first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/equipment/${r.equipmentId}`} className="font-medium hover:underline">
                        {r.equipmentDisplayName}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(r.startedAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.workOrderNumber} · {r.type} · {r.performerName}
                    </p>
                    {r.findings && <p className="text-xs text-muted-foreground">{r.findings}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No repairs currently with an internal engineer.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>In repair — external</CardTitle>
            <CardDescription>Work orders being handled by an external vendor or OEM</CardDescription>
          </CardHeader>
          <CardContent>
            {externalRepairs.length > 0 ? (
              <div>
                {externalRepairs.map((r) => (
                  <div
                    key={r.id}
                    className="border-b border-muted py-3 text-sm first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/equipment/${r.equipmentId}`} className="font-medium hover:underline">
                        {r.equipmentDisplayName}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(r.startedAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.workOrderNumber} · {r.type} · {r.performerName}
                    </p>
                    {r.findings && <p className="text-xs text-muted-foreground">{r.findings}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No repairs currently with an external vendor.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
