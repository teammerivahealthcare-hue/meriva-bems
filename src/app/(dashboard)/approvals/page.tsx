"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle,
  X,
  ArrowsLeftRight,
  ArrowUUpLeft,
  Warning,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import {
  facility,
  formatDate,
  getEquipmentById,
  getUser,
  getRoom,
  equipmentName,
  useDemo,
  daysUntil,
  type MovementRequest,
  type WarrantyOverrideRequest,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SummaryCard } from "@/components/summary-card";

interface SettledItem {
  key: string;
  type: "Movement" | "Condemnation";
  equipmentId: string;
  status: "Approved" | "Rejected";
  settledAt: string;
}

export default function ApprovalsPage() {
  const movementRequests = useDemo((s) => s.movementRequests);
  const condemnationRecords = useDemo((s) => s.condemnationRecords);
  const warrantyOverrideRequests = useDemo((s) => s.warrantyOverrideRequests);
  const approveMovement = useDemo((s) => s.approveMovement);
  const rejectMovement = useDemo((s) => s.rejectMovement);
  const confirmMovementReturn = useDemo((s) => s.confirmMovementReturn);
  const approveWarrantyOverride = useDemo((s) => s.approveWarrantyOverride);
  const rejectWarrantyOverride = useDemo((s) => s.rejectWarrantyOverride);

  const [selectedMovement, setSelectedMovement] = useState<MovementRequest | null>(null);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyOverrideRequest | null>(null);
  const [returnAccessoriesById, setReturnAccessoriesById] = useState<Record<string, boolean>>({});
  const returnedWithAccessories = (id: string) => returnAccessoriesById[id] ?? true;
  const setReturnedWithAccessories = (id: string, checked: boolean) =>
    setReturnAccessoriesById((s) => ({ ...s, [id]: checked }));

  const pendingMoves = movementRequests.filter(
    (m) => m.approvalStatus === "PENDING" || m.flaggedUnapproved
  );
  const pendingWarranty = warrantyOverrideRequests.filter((r) => r.status === "PENDING");
  const totalPendingApprovals = pendingMoves.length + pendingWarranty.length;

  const awaitingReturn = movementRequests
    .filter((m) => m.approvalStatus === "APPROVED" && m.movementKind === "TEMPORARY" && !m.returnedAt)
    .sort((a, b) => (a.expectedReturnAt ? daysUntil(a.expectedReturnAt) : Infinity) - (b.expectedReturnAt ? daysUntil(b.expectedReturnAt) : Infinity));
  const overdueReturnCount = awaitingReturn.filter((m) => m.expectedReturnAt && daysUntil(m.expectedReturnAt) < 0).length;

  const settledMoves: SettledItem[] = movementRequests
    .filter((m) => m.approvalStatus !== "PENDING" && !m.flaggedUnapproved)
    .map((m) => ({
      key: `move-${m.id}`,
      type: "Movement",
      equipmentId: m.equipmentId,
      status: m.approvalStatus === "REJECTED" ? "Rejected" : "Approved",
      settledAt: m.approvedAt ?? m.initiatedAt,
    }));
  const settledCondemnations: SettledItem[] = condemnationRecords
    .filter((c) => c.approvedAt || c.rejectedAt)
    .map((c) => ({
      key: `cnd-${c.id}`,
      type: "Condemnation",
      equipmentId: c.equipmentId,
      status: c.rejectedAt ? "Rejected" : "Approved",
      settledAt: (c.approvedAt ?? c.rejectedAt)!,
    }));
  const recentlySettled = [...settledMoves, ...settledCondemnations]
    .sort((a, b) => b.settledAt.localeCompare(a.settledAt))
    .slice(0, 10);

  const flaggedUnapprovedCount = pendingMoves.filter((m) => m.flaggedUnapproved).length;

  const approvalSummaryCards = [
    {
      key: "movementApprovals",
      title: "Movement approvals",
      value: String(pendingMoves.length),
      icon: ArrowsLeftRight,
      iconColor: "cyan" as const,
      changeDirection: flaggedUnapprovedCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(flaggedUnapprovedCount),
      footerText: "flagged unapproved",
    },
    {
      key: "warrantyOverrides",
      title: "Warranty overrides",
      value: String(pendingWarranty.length),
      icon: Warning,
      iconColor: "fuchsia" as const,
      changeDirection: pendingWarranty.length > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(pendingWarranty.length),
      footerText: "expired-warranty units in use",
    },
    {
      key: "awaitingReturn",
      title: "Awaiting return",
      value: String(awaitingReturn.length),
      icon: ArrowUUpLeft,
      iconColor: "teal" as const,
      changeDirection: overdueReturnCount > 0 ? ("negative" as const) : ("positive" as const),
      footerLeadText: String(overdueReturnCount),
      footerText: "overdue",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground text-sm">
          Edge-case sign-offs — equipment movement, temporary-loan returns, and expired-warranty continued use — at {facility.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:max-w-3xl">
        {approvalSummaryCards.map((card) => (
          <SummaryCard
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            changeDirection={card.changeDirection}
            footerLeadText={card.footerLeadText}
            footerText={card.footerText}
            showChevron={false}
          />
        ))}
      </div>

      {totalPendingApprovals === 0 && awaitingReturn.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle size={28} weight="fill" className="text-emerald-600" />
            </span>
            <p className="text-sm font-medium">Nothing pending review</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              All movement and warranty-override requests have been settled, and every temporary loan is back. New
              requests will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pendingMoves.length > 0 && (
            <Card className="overflow-hidden p-0 gap-0">
              <CardHeader className="gap-0 px-4 pt-3 pb-2">
                <CardTitle className="text-lg">Movement approvals</CardTitle>
                <CardDescription>Pending equipment relocations, flagged unapproved moves first</CardDescription>
              </CardHeader>
              <div className="px-4 pt-2 pb-3">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requested by</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Accessories</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingMoves.map((m) => {
                        const eq = getEquipmentById(m.equipmentId);
                        const fromRoom = getRoom(m.fromRoomId);
                        const toRoom = getRoom(m.toRoomId);
                        const initiator = getUser(m.initiatedByUserId);
                        return (
                          <TableRow
                            key={m.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedMovement(m)}
                          >
                            <TableCell>
                              {eq ? (
                                <Link
                                  href={`/equipment/${eq.id}`}
                                  className="font-medium hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {equipmentName(eq)}
                                </Link>
                              ) : (
                                <span className="font-medium">Unknown equipment</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  m.flaggedUnapproved
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }
                              >
                                {m.flaggedUnapproved ? "Unapproved" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{m.movementKind === "TEMPORARY" ? "Temporary" : "Permanent"}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{initiator?.name ?? "Unknown"}</TableCell>
                            <TableCell className="text-muted-foreground">{fromRoom?.name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{toRoom?.name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(m.initiatedAt)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {m.accessoryCheckIns.length > 0 ? m.accessoryCheckIns.length : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="approve"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approveMovement(m.id);
                                  }}
                                >
                                  <Check /> Approve
                                </Button>
                                <Button
                                  variant="decline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rejectMovement(m.id);
                                  }}
                                >
                                  <X /> Decline
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          )}

          {awaitingReturn.length > 0 && (
            <Card className="overflow-hidden p-0 gap-0">
              <CardHeader className="gap-0 px-4 pt-3 pb-2">
                <CardTitle className="text-lg">Awaiting return</CardTitle>
                <CardDescription>Temporary loans still out, overdue ones first</CardDescription>
              </CardHeader>
              <div className="px-4 pt-2 pb-3">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Since</TableHead>
                        <TableHead>Expected back</TableHead>
                        <TableHead>With accessories</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {awaitingReturn.map((m) => {
                        const eq = getEquipmentById(m.equipmentId);
                        const toRoom = getRoom(m.toRoomId);
                        const overdue = m.expectedReturnAt ? daysUntil(m.expectedReturnAt) < 0 : false;
                        return (
                          <TableRow key={m.id} className="cursor-pointer" onClick={() => setSelectedMovement(m)}>
                            <TableCell>
                              {eq ? (
                                <Link
                                  href={`/equipment/${eq.id}`}
                                  className="font-medium hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {equipmentName(eq)}
                                </Link>
                              ) : (
                                <span className="font-medium">Unknown equipment</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{toRoom?.name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(m.arrivedAt ?? m.initiatedAt)}</TableCell>
                            <TableCell>
                              {m.expectedReturnAt ? (
                                <span className={overdue ? "font-medium text-red-600" : "text-muted-foreground"}>
                                  {formatDate(m.expectedReturnAt)}{overdue ? " · overdue" : ""}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={returnedWithAccessories(m.id)}
                                onCheckedChange={(v) => setReturnedWithAccessories(m.id, v === true)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end">
                                <Button
                                  variant="approve"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmMovementReturn(m.id, { returnedWithAllAccessories: returnedWithAccessories(m.id) });
                                  }}
                                >
                                  <ArrowUUpLeft /> Mark as returned
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          )}

          {pendingWarranty.length > 0 && (
            <Card className="overflow-hidden p-0 gap-0">
              <CardHeader className="gap-0 px-4 pt-3 pb-2">
                <CardTitle className="text-lg">Warranty override requests</CardTitle>
                <CardDescription>Staff requesting to keep using an expired-warranty unit</CardDescription>
              </CardHeader>
              <div className="px-4 pt-2 pb-3">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Requested by</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWarranty.map((r) => {
                        const eq = getEquipmentById(r.equipmentId);
                        const requester = getUser(r.requestedByUserId);
                        return (
                          <TableRow
                            key={r.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedWarranty(r)}
                          >
                            <TableCell>
                              {eq ? (
                                <Link
                                  href={`/equipment/${eq.id}`}
                                  className="font-medium hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {equipmentName(eq)}
                                </Link>
                              ) : (
                                <span className="font-medium">Unknown equipment</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{requester?.name ?? "Unknown"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(r.requestedAt)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="approve"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approveWarrantyOverride(r.id);
                                  }}
                                >
                                  <Check /> Approve
                                </Button>
                                <Button
                                  variant="decline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rejectWarrantyOverride(r.id);
                                  }}
                                >
                                  <X /> Decline
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      <Card className="overflow-hidden p-0 gap-0">
        <CardHeader className="gap-0 px-4 pt-3 pb-2">
          <CardTitle className="text-lg">Recently settled</CardTitle>
          <CardDescription>Movement and condemnation requests, most recently settled first</CardDescription>
        </CardHeader>
        {recentlySettled.length > 0 ? (
          <div className="px-4 pt-2 pb-3">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlySettled.map((item) => {
                    const eq = getEquipmentById(item.equipmentId);
                    return (
                      <TableRow key={item.key}>
                        <TableCell className="font-medium">
                          {eq ? equipmentName(eq) : "Unknown equipment"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.status === "Rejected"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(item.settledAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState icon={CheckCircle} message="Nothing settled yet." />
          </div>
        )}
      </Card>

      <Sheet open={!!selectedMovement} onOpenChange={(open) => !open && setSelectedMovement(null)}>
        <SheetContent className="w-full sm:max-w-120">
          {selectedMovement &&
            (() => {
              const m = selectedMovement;
              const eq = getEquipmentById(m.equipmentId);
              const fromRoom = getRoom(m.fromRoomId);
              const toRoom = getRoom(m.toRoomId);
              const initiator = getUser(m.initiatedByUserId);
              return (
                <>
                  <SheetHeader className="border-b">
                    <SheetTitle>{eq ? equipmentName(eq) : "Unknown equipment"}</SheetTitle>
                    <SheetDescription>
                      {fromRoom?.name ?? "—"} → {toRoom?.name ?? "—"}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 space-y-5 overflow-y-auto px-4">
                    <div className="flex flex-wrap gap-2">
                      {m.approvalStatus === "PENDING" ? (
                        <Badge
                          variant="outline"
                          className={
                            m.flaggedUnapproved
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {m.flaggedUnapproved ? "Unapproved" : "Pending"}
                        </Badge>
                      ) : m.returnedAt ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Returned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Approved
                        </Badge>
                      )}
                      <Badge variant="outline">{m.movementKind === "TEMPORARY" ? "Temporary" : "Permanent"}</Badge>
                    </div>

                    {m.movementKind === "TEMPORARY" && (m.expectedReturnAt || m.returnedAt) && (
                      <div className="grid grid-cols-2 gap-4">
                        {m.expectedReturnAt && (
                          <div>
                            <p className="text-xs text-muted-foreground">Expected back</p>
                            <p className="text-sm">{formatDate(m.expectedReturnAt)}</p>
                          </div>
                        )}
                        {m.returnedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground">Returned on</p>
                            <p className="text-sm">
                              {formatDate(m.returnedAt)}
                              {m.returnedByUserId && ` by ${getUser(m.returnedByUserId)?.name ?? "Unknown"}`}
                            </p>
                            {m.returnedWithAllAccessories === false && (
                              <Badge variant="outline" className="mt-1 bg-red-50 text-red-700 border-red-200">
                                Accessories missing
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {m.note && (
                      <div>
                        <p className="text-xs text-muted-foreground">Note</p>
                        <p className="text-sm">{m.note}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Initiated by</p>
                        <p className="text-sm">{initiator?.name ?? "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Initiated on</p>
                        <p className="text-sm">{formatDate(m.initiatedAt)}</p>
                      </div>
                    </div>

                    {m.accessoryCheckIns.length > 0 && (
                      <div className="space-y-2 border-t pt-4">
                        <p className="text-xs font-medium text-muted-foreground">Accessories checked in</p>
                        <div className="space-y-1.5 text-sm">
                          {m.accessoryCheckIns.map((a) => (
                            <div key={a.accessoryId} className="flex items-center justify-between">
                              <span className="text-muted-foreground">{a.accessoryId}</span>
                              <span>{a.state.replace(/_/g, " ").toLowerCase()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 border-t pt-4">
                      <p className="text-xs text-muted-foreground">Equipment</p>
                      {eq ? (
                        <Link href={`/equipment/${eq.id}`} className="text-sm font-medium hover:underline">
                          {equipmentName(eq)}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">Unknown equipment</p>
                      )}
                    </div>
                  </div>
                  {m.approvalStatus === "PENDING" ? (
                    <SheetFooter className="flex-row border-t">
                      <Button
                        variant="approve"
                        className="flex-1"
                        onClick={() => {
                          approveMovement(m.id);
                          setSelectedMovement(null);
                        }}
                      >
                        <Check /> Approve
                      </Button>
                      <Button
                        variant="decline"
                        className="flex-1"
                        onClick={() => {
                          rejectMovement(m.id);
                          setSelectedMovement(null);
                        }}
                      >
                        <X /> Decline
                      </Button>
                    </SheetFooter>
                  ) : m.movementKind === "TEMPORARY" && !m.returnedAt ? (
                    <SheetFooter className="border-t">
                      <label className="mb-1 flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={returnedWithAccessories(m.id)}
                          onCheckedChange={(v) => setReturnedWithAccessories(m.id, v === true)}
                        />
                        Returned with all accessories
                      </label>
                      <Button
                        variant="approve"
                        className="w-full"
                        onClick={() => {
                          confirmMovementReturn(m.id, { returnedWithAllAccessories: returnedWithAccessories(m.id) });
                          setSelectedMovement(null);
                        }}
                      >
                        <ArrowUUpLeft /> Mark as returned
                      </Button>
                    </SheetFooter>
                  ) : null}
                </>
              );
            })()}
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedWarranty} onOpenChange={(open) => !open && setSelectedWarranty(null)}>
        <SheetContent className="w-full sm:max-w-120">
          {selectedWarranty &&
            (() => {
              const r = selectedWarranty;
              const eq = getEquipmentById(r.equipmentId);
              const requester = getUser(r.requestedByUserId);
              return (
                <>
                  <SheetHeader className="border-b">
                    <SheetTitle>{eq ? equipmentName(eq) : "Unknown equipment"}</SheetTitle>
                    <SheetDescription>Warranty override request</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 space-y-5 overflow-y-auto px-4">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Pending
                    </Badge>

                    <p className="text-sm text-muted-foreground">
                      This unit&apos;s warranty has expired. {requester?.name ?? "A staff member"} is requesting
                      approval to continue using it.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Requested by</p>
                        <p className="text-sm">{requester?.name ?? "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Requested on</p>
                        <p className="text-sm">{formatDate(r.requestedAt)}</p>
                      </div>
                    </div>

                    <div className="space-y-1 border-t pt-4">
                      <p className="text-xs text-muted-foreground">Equipment</p>
                      {eq ? (
                        <Link href={`/equipment/${eq.id}`} className="text-sm font-medium hover:underline">
                          {equipmentName(eq)}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">Unknown equipment</p>
                      )}
                    </div>
                  </div>
                  <SheetFooter className="flex-row border-t">
                    <Button
                      variant="approve"
                      className="flex-1"
                      onClick={() => {
                        approveWarrantyOverride(r.id);
                        setSelectedWarranty(null);
                      }}
                    >
                      <Check /> Approve
                    </Button>
                    <Button
                      variant="decline"
                      className="flex-1"
                      onClick={() => {
                        rejectWarrantyOverride(r.id);
                        setSelectedWarranty(null);
                      }}
                    >
                      <X /> Decline
                    </Button>
                  </SheetFooter>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
