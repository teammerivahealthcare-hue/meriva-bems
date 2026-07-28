import Link from "next/link";
import {
  facility,
  condemnationRecords,
  movementRequests,
  workOrders,
  getEquipmentById,
  getUser,
  getRoom,
  equipmentName,
  formatDate,
  formatINR,
  now,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatCards, type StatCardSpec } from "@/components/stat-cards";

export default function ApprovalsPage() {
  const pendingMoves = movementRequests.filter(
    (m) => m.approvalStatus === "PENDING" || m.flaggedUnapproved
  );
  const moveHistory = movementRequests
    .filter((m) => m.approvalStatus !== "PENDING" && !m.flaggedUnapproved)
    .sort((a, b) => (b.approvedAt ?? b.initiatedAt).localeCompare(a.approvedAt ?? a.initiatedAt))
    .slice(0, 10);

  const pendingCondemnations = condemnationRecords.filter((c) => !c.approvedAt);
  const condemnationHistory = condemnationRecords
    .filter((c) => c.approvedAt)
    .sort((a, b) => b.approvedAt!.localeCompare(a.approvedAt!))
    .slice(0, 10);

  const activeWorkOrders = workOrders
    .filter((w) => !w.completedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const totalPendingApprovals = activeWorkOrders.length + pendingMoves.length + pendingCondemnations.length;

  const statCards: StatCardSpec[] = [
    {
      key: "jobAssignments",
      label: "Job assignments",
      value: String(activeWorkOrders.length),
      subtext: "Awaiting completion",
    },
    {
      key: "movementApprovals",
      label: "Movement approvals",
      value: String(pendingMoves.length),
      subtext: `${pendingMoves.filter((m) => m.flaggedUnapproved).length} flagged unapproved`,
    },
    {
      key: "condemnationApprovals",
      label: "Condemnation approvals",
      value: String(pendingCondemnations.length),
      subtext: "Pending review",
    },
    {
      key: "totalApprovals",
      label: "Total pending",
      value: String(totalPendingApprovals),
      subtext: "Across all types",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground text-sm">
          All pending and recently settled approvals at {facility.name} — job assignments, equipment movement,
          and condemnation requests.
        </p>
      </div>

      <StatCards stats={statCards} />

      <Card>
        <CardHeader>
          <CardTitle>Job assignments</CardTitle>
          <CardDescription>Work orders in progress or scheduled, oldest first</CardDescription>
        </CardHeader>
        <CardContent>
          {activeWorkOrders.length > 0 ? (
            <div className="space-y-3">
              {activeWorkOrders.map((w) => {
                const eq = getEquipmentById(w.equipmentId);
                const engineer = getUser(w.performedByUserId);
                const scheduled = new Date(w.startedAt).getTime() > now().getTime();
                const cost = w.labourCost + w.partsCost;
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {w.workOrderNumber} · {w.type.charAt(0) + w.type.slice(1).toLowerCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {eq ? (
                          <Link href={`/equipment/${eq.id}`} className="hover:underline">
                            {equipmentName(eq)}
                          </Link>
                        ) : (
                          "Unknown equipment"
                        )}
                      </p>
                      {w.findings && <p className="text-xs text-muted-foreground">{w.findings}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm">{engineer?.name ?? "Unassigned"}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {formatDate(w.startedAt)} · {formatINR(cost)}
                      </p>
                      <Badge
                        variant="outline"
                        className={scheduled ? "" : "bg-amber-50 text-amber-800 border-amber-200"}
                      >
                        {scheduled ? "Scheduled" : "In progress"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No jobs assigned right now.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movement approvals</CardTitle>
          <CardDescription>Pending equipment relocations, flagged unapproved moves first</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingMoves.length > 0 ? (
            <div className="space-y-3">
              {pendingMoves.map((m) => {
                const eq = getEquipmentById(m.equipmentId);
                const fromRoom = getRoom(m.fromRoomId);
                const toRoom = getRoom(m.toRoomId);
                const initiator = getUser(m.initiatedByUserId);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        {eq ? (
                          <Link href={`/equipment/${eq.id}`} className="hover:underline">
                            {equipmentName(eq)}
                          </Link>
                        ) : (
                          "Unknown equipment"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fromRoom?.name ?? "—"} → {toRoom?.name ?? "—"} · Initiated by{" "}
                        {initiator?.name ?? "Unknown"} on {formatDate(m.initiatedAt)}
                      </p>
                      {m.accessoryCheckIns.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {m.accessoryCheckIns.length} accessor{m.accessoryCheckIns.length === 1 ? "y" : "ies"}{" "}
                          checked in
                        </p>
                      )}
                    </div>
                    <Badge variant={m.flaggedUnapproved ? "destructive" : "outline"}>
                      {m.flaggedUnapproved ? "Unapproved" : "Pending"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No movement approvals pending.</p>
          )}

          {moveHistory.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Recently settled</p>
                <div className="space-y-2">
                  {moveHistory.map((m) => {
                    const eq = getEquipmentById(m.equipmentId);
                    return (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span className="truncate text-muted-foreground">
                          {eq ? equipmentName(eq) : "Unknown equipment"}
                        </span>
                        <Badge variant="outline" className={m.approvalStatus === "REJECTED" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                          {m.approvalStatus === "REJECTED" ? "Rejected" : "Approved"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condemnation approvals</CardTitle>
          <CardDescription>Awaiting biomedical sign-off</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingCondemnations.length > 0 ? (
            <div className="space-y-3">
              {pendingCondemnations.map((c) => {
                const eq = getEquipmentById(c.equipmentId);
                const requester = getUser(c.requestedByUserId);
                return (
                  <div
                    key={c.id}
                    className="border-b border-muted py-3 text-sm first:pt-0 last:border-0 last:pb-0"
                  >
                    <p className="font-medium">
                      {eq ? (
                        <Link href={`/equipment/${eq.id}`} className="hover:underline">
                          {equipmentName(eq)}
                        </Link>
                      ) : (
                        "Unknown equipment"
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.justification}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested by {requester?.name ?? "Unknown"} · {c.breakdownCountLast12m} breakdowns in last
                      12 months · {formatINR(c.repairCostLast12m)} repair cost
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No condemnation requests awaiting approval.</p>
          )}

          {condemnationHistory.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Recently approved</p>
                <div className="space-y-2">
                  {condemnationHistory.map((c) => {
                    const eq = getEquipmentById(c.equipmentId);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span className="truncate text-muted-foreground">
                          {eq ? equipmentName(eq) : "Unknown equipment"}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(c.approvedAt!)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
