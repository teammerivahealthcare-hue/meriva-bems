"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  X,
  ArrowsLeftRight,
  ArrowUUpLeft,
  ShieldWarning,
  ClockCounterClockwise,
  CalendarBlank,
  HourglassMedium,
  WarningCircle,
  Tray,
  Archive,
  type Icon,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import {
  formatDate,
  getEquipmentById,
  getDepartment,
  getUser,
  getRoom,
  getManufacturer,
  modelFor,
  categoryName,
  contractsFor,
  equipmentName,
  useDemo,
  daysUntil,
  relativeTimeFromNow,
  CRITICALITY_LABEL,
  CRITICALITY_BADGE_CLASS,
  type Equipment,
  type MovementRequest,
  type WarrantyOverrideRequest,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ApprovalRequestCard,
  ApprovalDetailDialog,
  APPROVAL_TAG_CLASS,
  type ApprovalDetailField,
} from "@/components/approval-request-card";
import { useUpdatedAgoLabel } from "@/hooks/use-updated-ago";
import { cn } from "@/lib/utils";

type View = "pending" | "settled";
type Category = "movement" | "return" | "warranty";

const CATEGORY_META: Record<Category, { label: string; icon: Icon; pending: string; settled: string }> = {
  movement: {
    label: "Movement approvals",
    icon: ArrowsLeftRight,
    pending: "Requests for changing location of equipment",
    settled: "Movement requests that have been approved or declined",
  },
  return: {
    label: "Awaiting return",
    icon: ArrowUUpLeft,
    pending: "Equipment yet to arrive back from its temporary location",
    settled: "Temporary loans that have come back",
  },
  warranty: {
    label: "Warranty override",
    icon: ShieldWarning,
    pending: "Staff requesting to keep using an expired-warranty unit",
    settled: "Warranty overrides that have been approved or declined",
  },
};

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

const OUTCOME_CLASS = {
  approved: "bg-emerald-50 text-emerald-700 border-transparent",
  declined: "bg-red-50 text-red-700 border-transparent",
  pending: "bg-amber-50 text-amber-800 border-transparent",
} as const;

// ─────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────

function daysLabel(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(1, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 864e5));
}

function warrantyEndFor(eq: Equipment): string | undefined {
  return contractsFor(eq.id).find((c) => c.type === "WARRANTY")?.endDate;
}

function whenBy(iso: string, userId?: string): string {
  return `${relativeTimeFromNow(iso)} by ${getUser(userId)?.name ?? "Unknown"}`;
}

function EquipmentCell({ eq }: { eq?: Equipment }) {
  if (!eq) return <span className="font-medium">Unknown equipment</span>;
  return (
    <div className="min-w-0">
      <Link
        href={`/equipment/${eq.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block truncate font-medium hover:underline"
      >
        {categoryName(eq)}
      </Link>
      <p className="truncate text-xs text-muted-foreground">{modelFor(eq)?.modelName ?? equipmentName(eq)}</p>
    </div>
  );
}

function WarrantyExpiry({ endDate }: { endDate?: string }) {
  if (!endDate) return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(endDate);
  const tone = d < 0 ? "text-red-700" : d <= 30 ? "text-amber-700" : "text-muted-foreground";
  return (
    <div className="flex items-start gap-2">
      <CalendarBlank size={16} className={cn("mt-0.5 shrink-0", d < 0 ? "text-red-600" : "text-muted-foreground")} />
      <div>
        <p className="font-medium">{formatDate(endDate)}</p>
        <p className={cn("text-xs", tone)}>
          {d < 0 ? `Expired ${daysLabel(-d)} ago` : d === 0 ? "Expires today" : `Expires in ${daysLabel(d)}`}
        </p>
      </div>
    </div>
  );
}

function OutcomeBadge({ approved, label }: { approved: boolean; label?: string }) {
  return (
    <Badge variant="outline" className={approved ? OUTCOME_CLASS.approved : OUTCOME_CLASS.declined}>
      {approved ? <Check /> : <X />}
      {label ?? (approved ? "Approved" : "Declined")}
    </Badge>
  );
}

function ApproveDeclineButtons({ onApprove, onDecline }: { onApprove: () => void; onDecline: () => void }) {
  return (
    <>
      <Button variant="approve" onClick={onApprove}>
        <Check /> Approve
      </Button>
      <Button variant="outline" onClick={onDecline}>
        <X /> Decline
      </Button>
    </>
  );
}

/** "Returned with all accessories" — checked by default; unchecking flags the loan for follow-up on return. */
function AccessoriesCheck({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={`acc-${id}`} className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox id={`acc-${id}`} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      All accessories back
    </label>
  );
}

function SectionIntro({ icon: IconCmp, text }: { icon: Icon; text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <IconCmp size={18} className="text-muted-foreground" />
      {text}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

type Selected =
  | { kind: "movement"; id: string }
  | { kind: "warranty"; id: string };

export default function ApprovalsPage() {
  const movementRequests = useDemo((s) => s.movementRequests);
  const warrantyOverrideRequests = useDemo((s) => s.warrantyOverrideRequests);
  const approveMovement = useDemo((s) => s.approveMovement);
  const rejectMovement = useDemo((s) => s.rejectMovement);
  const confirmMovementReturn = useDemo((s) => s.confirmMovementReturn);
  const approveWarrantyOverride = useDemo((s) => s.approveWarrantyOverride);
  const rejectWarrantyOverride = useDemo((s) => s.rejectWarrantyOverride);
  const updatedAgo = useUpdatedAgoLabel();

  const [view, setView] = useState<View>("pending");
  const [category, setCategory] = useState<Category>("movement");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [accessoriesById, setAccessoriesById] = useState<Record<string, boolean>>({});
  const accessoriesBack = (id: string) => accessoriesById[id] ?? true;
  const setAccessoriesBack = (id: string, v: boolean) => setAccessoriesById((s) => ({ ...s, [id]: v }));

  // Pending
  const pendingMoves = movementRequests
    .filter((m) => m.approvalStatus === "PENDING" || m.flaggedUnapproved)
    .sort((a, b) => Number(b.flaggedUnapproved) - Number(a.flaggedUnapproved) || b.initiatedAt.localeCompare(a.initiatedAt));
  const awaitingReturn = movementRequests
    .filter((m) => m.approvalStatus === "APPROVED" && m.movementKind === "TEMPORARY" && !m.returnedAt)
    .sort((a, b) => (a.expectedReturnAt ?? "9999").localeCompare(b.expectedReturnAt ?? "9999"));
  const pendingWarranty = warrantyOverrideRequests
    .filter((r) => r.status === "PENDING")
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  // Settled
  const settledMoves = movementRequests
    .filter((m) => m.approvalStatus !== "PENDING" && !m.flaggedUnapproved)
    .sort((a, b) => (b.approvedAt ?? b.initiatedAt).localeCompare(a.approvedAt ?? a.initiatedAt));
  const returnedLoans = movementRequests
    .filter((m) => m.movementKind === "TEMPORARY" && m.returnedAt)
    .sort((a, b) => b.returnedAt!.localeCompare(a.returnedAt!));
  const settledWarranty = warrantyOverrideRequests
    .filter((r) => r.status !== "PENDING")
    .sort((a, b) => (b.decidedAt ?? b.requestedAt).localeCompare(a.decidedAt ?? a.requestedAt));

  const counts: Record<View, Record<Category, number>> = {
    pending: { movement: pendingMoves.length, return: awaitingReturn.length, warranty: pendingWarranty.length },
    settled: { movement: settledMoves.length, return: returnedLoans.length, warranty: settledWarranty.length },
  };

  const selectedMove = selected?.kind === "movement" ? movementRequests.find((m) => m.id === selected.id) : undefined;
  const selectedWarranty =
    selected?.kind === "warranty" ? warrantyOverrideRequests.find((r) => r.id === selected.id) : undefined;
  const close = () => setSelected(null);

  // ── Pending lists ──────────────────────────────────────────

  function renderPending(cat: Category): ReactNode {
    if (cat === "movement") {
      if (pendingMoves.length === 0) return <EmptyState icon={ArrowsLeftRight} message="No movement requests waiting on you." />;
      return pendingMoves.map((m) => {
        const eq = getEquipmentById(m.equipmentId);
        const from = getRoom(m.fromRoomId)?.name ?? "—";
        const to = getRoom(m.toRoomId)?.name ?? "—";
        const facts: ReactNode[] = [`${from} → ${to}`, m.movementKind === "TEMPORARY" ? "Temporary move" : "Permanent move"];
        if (m.movementKind === "TEMPORARY" && m.expectedReturnAt) {
          facts.push(`Return: ${daysLabel(daysBetween(m.initiatedAt, m.expectedReturnAt))}`);
        }
        return (
          <ApprovalRequestCard
            key={m.id}
            title={eq ? equipmentName(eq) : "Unknown equipment"}
            assetId={eq?.assetId}
            department={eq ? getDepartment(eq.departmentId)?.name : undefined}
            subtitle={
              m.note ??
              (m.flaggedUnapproved
                ? "Moved before sign-off was granted — needs retroactive review."
                : `Requested move to ${to}.`)
            }
            meta={
              <>
                <ClockCounterClockwise size={16} className="text-muted-foreground" />
                {whenBy(m.initiatedAt, m.initiatedByUserId)}
              </>
            }
            tag={
              <Badge variant="outline" className={m.flaggedUnapproved ? OUTCOME_CLASS.declined : APPROVAL_TAG_CLASS}>
                {m.flaggedUnapproved ? "Moved without approval" : "Pre-movement approval"}
              </Badge>
            }
            facts={facts}
            actions={<ApproveDeclineButtons onApprove={() => approveMovement(m.id)} onDecline={() => rejectMovement(m.id)} />}
            onOpen={() => setSelected({ kind: "movement", id: m.id })}
          />
        );
      });
    }

    if (cat === "return") {
      if (awaitingReturn.length === 0) return <EmptyState icon={ArrowUUpLeft} message="Every temporary loan is back." />;
      return awaitingReturn.map((m) => {
        const eq = getEquipmentById(m.equipmentId);
        const dueIn = m.expectedReturnAt ? daysUntil(m.expectedReturnAt) : undefined;
        const overdue = dueIn !== undefined && dueIn < 0;
        const outFor = Math.max(1, -daysUntil(m.arrivedAt ?? m.initiatedAt));
        const facts: ReactNode[] = [
          `Borrowed by ${getRoom(m.toRoomId)?.name ?? "—"}`,
          `For ${daysLabel(outFor)}`,
        ];
        if (m.expectedReturnAt) facts.push(`Expected ${formatDate(m.expectedReturnAt)}`);
        facts.push(getUser(m.initiatedByUserId)?.name ?? "Unknown");
        return (
          <ApprovalRequestCard
            key={m.id}
            title={eq ? equipmentName(eq) : "Unknown equipment"}
            assetId={eq?.assetId}
            department={eq ? getDepartment(eq.departmentId)?.name : undefined}
            subtitle={m.note ?? "On temporary loan."}
            meta={
              overdue ? (
                <span className="flex items-center gap-1.5 font-medium text-red-700">
                  <WarningCircle size={16} /> Return overdue by {daysLabel(-dueIn!)}
                </span>
              ) : (
                <>
                  <HourglassMedium size={16} className="text-muted-foreground" />
                  {dueIn === undefined ? "No return date" : dueIn === 0 ? "Due back today" : `Due back in ${daysLabel(dueIn)}`}
                </>
              )
            }
            tag={
              <Badge variant="outline" className={APPROVAL_TAG_CLASS}>
                Temporary loan
              </Badge>
            }
            facts={facts}
            actions={
              <>
                <AccessoriesCheck id={m.id} checked={accessoriesBack(m.id)} onChange={(v) => setAccessoriesBack(m.id, v)} />
                <Button
                  variant="approve"
                  onClick={() => confirmMovementReturn(m.id, { returnedWithAllAccessories: accessoriesBack(m.id) })}
                >
                  <Check /> Mark as returned
                </Button>
              </>
            }
            onOpen={() => setSelected({ kind: "movement", id: m.id })}
          />
        );
      });
    }

    if (pendingWarranty.length === 0) return <EmptyState icon={ShieldWarning} message="No warranty overrides waiting on you." />;
    return pendingWarranty.map((r) => {
      const eq = getEquipmentById(r.equipmentId);
      const end = eq ? warrantyEndFor(eq) : undefined;
      const facts: ReactNode[] = [];
      if (end) facts.push(daysUntil(end) < 0 ? `Warranty expired ${daysLabel(-daysUntil(end))} ago` : `Warranty ends ${formatDate(end)}`);
      if (eq) facts.push(`${eq.cumulativeUsageHours.toLocaleString("en-IN")} lifetime hours`);
      return (
        <ApprovalRequestCard
          key={r.id}
          title={eq ? equipmentName(eq) : "Unknown equipment"}
          assetId={eq?.assetId}
          department={eq ? getDepartment(eq.departmentId)?.name : undefined}
          subtitle={eq ? categoryName(eq) : undefined}
          meta={
            <>
              <ClockCounterClockwise size={16} className="text-muted-foreground" />
              {whenBy(r.requestedAt, r.requestedByUserId)}
            </>
          }
          facts={facts}
          actions={
            <ApproveDeclineButtons onApprove={() => approveWarrantyOverride(r.id)} onDecline={() => rejectWarrantyOverride(r.id)} />
          }
          onOpen={() => setSelected({ kind: "warranty", id: r.id })}
        />
      );
    });
  }

  // ── Settled tables ─────────────────────────────────────────

  function renderSettled(cat: Category): ReactNode {
    if (cat === "movement") {
      if (settledMoves.length === 0) return <EmptyState icon={Archive} message="No movement requests settled yet." />;
      return (
        <SettledTable headers={["Equipment", "Department", "Move", "Type", "Decided", "Outcome"]}>
          {settledMoves.map((m) => {
            const eq = getEquipmentById(m.equipmentId);
            const toRoom = getRoom(m.toRoomId);
            return (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => setSelected({ kind: "movement", id: m.id })}>
                <TableCell><EquipmentCell eq={eq} /></TableCell>
                <TableCell className="text-muted-foreground">{toRoom ? getDepartment(toRoom.departmentId)?.name : "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {getRoom(m.fromRoomId)?.name ?? "—"} → {toRoom?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{m.movementKind === "TEMPORARY" ? "Temporary" : "Permanent"}</TableCell>
                <TableCell className="text-muted-foreground">{m.approvedAt ? formatDate(m.approvedAt) : "—"}</TableCell>
                <TableCell><OutcomeBadge approved={m.approvalStatus === "APPROVED"} /></TableCell>
              </TableRow>
            );
          })}
        </SettledTable>
      );
    }

    if (cat === "return") {
      if (returnedLoans.length === 0) return <EmptyState icon={Archive} message="No loans returned yet." />;
      return (
        <SettledTable headers={["Equipment", "Borrowed by", "Out since", "Returned", "Accessories", "Outcome"]}>
          {returnedLoans.map((m) => {
            const eq = getEquipmentById(m.equipmentId);
            const late = m.expectedReturnAt ? m.returnedAt!.slice(0, 10) > m.expectedReturnAt : false;
            return (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => setSelected({ kind: "movement", id: m.id })}>
                <TableCell><EquipmentCell eq={eq} /></TableCell>
                <TableCell className="text-muted-foreground">{getRoom(m.toRoomId)?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(m.arrivedAt ?? m.initiatedAt)}</TableCell>
                <TableCell>
                  <p>{formatDate(m.returnedAt!)}</p>
                  <p className={cn("text-xs", late ? "text-red-700" : "text-muted-foreground")}>{late ? "Returned late" : "On time"}</p>
                </TableCell>
                <TableCell>
                  {m.returnedWithAllAccessories === false ? (
                    <Badge variant="outline" className={OUTCOME_CLASS.declined}>Missing items</Badge>
                  ) : (
                    <span className="text-muted-foreground">All back</span>
                  )}
                </TableCell>
                <TableCell><OutcomeBadge approved label="Returned" /></TableCell>
              </TableRow>
            );
          })}
        </SettledTable>
      );
    }

    if (settledWarranty.length === 0) return <EmptyState icon={Archive} message="No warranty overrides settled yet." />;
    return (
      <SettledTable headers={["Equipment", "Department", "Warranty exp.", "Category", "Manufacturer", "Outcome"]}>
        {settledWarranty.map((r) => {
          const eq = getEquipmentById(r.equipmentId);
          const model = eq ? modelFor(eq) : undefined;
          return (
            <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected({ kind: "warranty", id: r.id })}>
              <TableCell><EquipmentCell eq={eq} /></TableCell>
              <TableCell className="text-muted-foreground">{eq ? getDepartment(eq.departmentId)?.name : "—"}</TableCell>
              <TableCell><WarrantyExpiry endDate={eq ? warrantyEndFor(eq) : undefined} /></TableCell>
              <TableCell>
                {eq && (
                  <Badge variant="outline" className={CRITICALITY_BADGE_CLASS[eq.criticality]}>
                    {CRITICALITY_LABEL[eq.criticality]}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{model ? getManufacturer(model.manufacturerId)?.name : "—"}</TableCell>
              <TableCell><OutcomeBadge approved={r.status === "APPROVED"} /></TableCell>
            </TableRow>
          );
        })}
      </SettledTable>
    );
  }

  function renderCategoryTabs(v: View) {
    return (
      <Tabs value={category} onValueChange={(c) => setCategory(c as Category)} className="gap-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 sm:w-fit group-data-horizontal/tabs:h-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c} className="h-9 flex-none gap-2.5 px-4 text-sm">
              {CATEGORY_META[c].label}
              <span className={cn("min-w-6 rounded-full px-1.5 py-0.5 text-xs tabular-nums", c === category && "bg-foreground/10")}>
                {counts[v][c]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="space-y-4">
            <SectionIntro icon={CATEGORY_META[c].icon} text={CATEGORY_META[c][v]} />
            <div className="space-y-4">{v === "pending" ? renderPending(c) : renderSettled(c)}</div>
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground text-sm">{updatedAgo}</p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList variant="line" className="gap-4 group-data-horizontal/tabs:h-11">
          <TabsTrigger value="pending" className="gap-2 px-3">
            <Tray size={16} /> Pending
          </TabsTrigger>
          <TabsTrigger value="settled" className="gap-2 px-3">
            <Archive size={16} /> Settled
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="pt-4">
          {renderCategoryTabs("pending")}
        </TabsContent>
        <TabsContent value="settled" className="pt-4">
          {renderCategoryTabs("settled")}
        </TabsContent>
      </Tabs>

      {selectedMove && (
        <MovementDetail
          move={selectedMove}
          accessoriesBack={accessoriesBack(selectedMove.id)}
          onAccessoriesChange={(v) => setAccessoriesBack(selectedMove.id, v)}
          onApprove={() => { approveMovement(selectedMove.id); close(); }}
          onDecline={() => { rejectMovement(selectedMove.id); close(); }}
          onReturned={() => {
            confirmMovementReturn(selectedMove.id, { returnedWithAllAccessories: accessoriesBack(selectedMove.id) });
            close();
          }}
          onClose={close}
        />
      )}
      {selectedWarranty && (
        <WarrantyDetail
          request={selectedWarranty}
          onApprove={() => { approveWarrantyOverride(selectedWarranty.id); close(); }}
          onDecline={() => { rejectWarrantyOverride(selectedWarranty.id); close(); }}
          onClose={close}
        />
      )}
    </div>
  );
}

function SettledTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-hidden p-0 gap-0">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail dialogs
// ─────────────────────────────────────────────────────────────

function DialogDeclineApprove({ onApprove, onDecline }: { onApprove: () => void; onDecline: () => void }) {
  return (
    <>
      <Button variant="outline" className="text-red-700 hover:text-red-700" onClick={onDecline}>
        <X /> Decline
      </Button>
      <Button variant="approve" onClick={onApprove}>
        <Check /> Approve
      </Button>
    </>
  );
}

function requestedField(iso: string): ApprovalDetailField {
  return { label: "Requested", value: `${relativeTimeFromNow(iso)} · ${formatDate(iso)}` };
}

function equipmentFields(eq?: Equipment): ApprovalDetailField[] {
  if (!eq) return [];
  const model = modelFor(eq);
  const mfr = model ? getManufacturer(model.manufacturerId) : undefined;
  return [
    { label: "Manufacturer / model", value: [mfr?.name, model?.modelName].filter(Boolean).join(" · ") || "—" },
    {
      label: "Asset ID",
      value: (
        <Link href={`/equipment/${eq.id}`} className="hover:underline">
          {eq.assetId}
        </Link>
      ),
    },
    { label: "Category", value: `${categoryName(eq)} · ${CRITICALITY_LABEL[eq.criticality]}` },
    { label: "Department", value: getDepartment(eq.departmentId)?.name ?? "—" },
  ];
}

function MovementDetail({
  move: m,
  accessoriesBack,
  onAccessoriesChange,
  onApprove,
  onDecline,
  onReturned,
  onClose,
}: {
  move: MovementRequest;
  accessoriesBack: boolean;
  onAccessoriesChange: (v: boolean) => void;
  onApprove: () => void;
  onDecline: () => void;
  onReturned: () => void;
  onClose: () => void;
}) {
  const eq = getEquipmentById(m.equipmentId);
  const pending = m.approvalStatus === "PENDING" || m.flaggedUnapproved;
  const onLoan = !pending && m.approvalStatus === "APPROVED" && m.movementKind === "TEMPORARY" && !m.returnedAt;
  const overdue = onLoan && !!m.expectedReturnAt && daysUntil(m.expectedReturnAt) < 0;

  const status = m.flaggedUnapproved
    ? { label: "Unapproved", className: OUTCOME_CLASS.declined, text: "text-red-700" }
    : pending
      ? { label: "Pending", className: OUTCOME_CLASS.pending, text: "text-amber-700" }
      : m.returnedAt
        ? { label: "Returned", className: OUTCOME_CLASS.approved, text: "text-emerald-700" }
        : overdue
          ? { label: "Return overdue", className: OUTCOME_CLASS.declined, text: "text-red-700" }
          : m.approvalStatus === "REJECTED"
            ? { label: "Declined", className: OUTCOME_CLASS.declined, text: "text-red-700" }
            : { label: onLoan ? "On loan" : "Approved", className: OUTCOME_CLASS.approved, text: "text-emerald-700" };

  const fields: ApprovalDetailField[] = [
    ...equipmentFields(eq),
    { label: "From → destination", value: `${getRoom(m.fromRoomId)?.name ?? "—"} → ${getRoom(m.toRoomId)?.name ?? "—"}` },
    { label: "Requested by", value: getUser(m.initiatedByUserId)?.name ?? "Unknown" },
    requestedField(m.initiatedAt),
    { label: "Status", value: status.label, className: status.text },
  ];
  if (m.movementKind === "TEMPORARY" && m.expectedReturnAt) fields.push({ label: "Expected back", value: formatDate(m.expectedReturnAt) });
  if (m.approvedAt && !pending) {
    fields.push({
      label: m.approvalStatus === "REJECTED" ? "Declined" : "Approved",
      value: `${formatDate(m.approvedAt)} by ${getUser(m.approvedByUserId)?.name ?? "Unknown"}`,
    });
  }
  if (m.returnedAt) {
    fields.push({
      label: "Returned",
      value: `${formatDate(m.returnedAt)} by ${getUser(m.returnedByUserId)?.name ?? "Unknown"}${m.returnedWithAllAccessories === false ? " · items missing" : ""}`,
    });
  }

  return (
    <ApprovalDetailDialog
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={m.movementKind === "TEMPORARY" ? "Temporary movement" : "Movement"}
      title={eq ? equipmentName(eq) : "Unknown equipment"}
      chips={
        <>
          <Badge variant="outline" className={status.className}>{status.label}</Badge>
          {eq && <Badge variant="outline" className={CRITICALITY_BADGE_CLASS[eq.criticality]}>{CRITICALITY_LABEL[eq.criticality]}</Badge>}
        </>
      }
      note={
        m.note ??
        (m.flaggedUnapproved ? "Unit was physically moved before sign-off was granted — flagged for retroactive review." : undefined)
      }
      fields={fields}
      footer={
        pending ? (
          <DialogDeclineApprove onApprove={onApprove} onDecline={onDecline} />
        ) : onLoan ? (
          <>
            <AccessoriesCheck id={`dlg-${m.id}`} checked={accessoriesBack} onChange={onAccessoriesChange} />
            <Button variant="approve" onClick={onReturned}>
              <Check /> Mark as returned
            </Button>
          </>
        ) : undefined
      }
    />
  );
}

function WarrantyDetail({
  request: r,
  onApprove,
  onDecline,
  onClose,
}: {
  request: WarrantyOverrideRequest;
  onApprove: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const eq = getEquipmentById(r.equipmentId);
  const end = eq ? warrantyEndFor(eq) : undefined;
  const pending = r.status === "PENDING";
  const status = pending
    ? { label: "Pending", className: OUTCOME_CLASS.pending, text: "text-amber-700" }
    : r.status === "APPROVED"
      ? { label: "Approved", className: OUTCOME_CLASS.approved, text: "text-emerald-700" }
      : { label: "Declined", className: OUTCOME_CLASS.declined, text: "text-red-700" };

  const fields: ApprovalDetailField[] = [
    ...equipmentFields(eq),
    {
      label: "Warranty",
      value: end ? `${daysUntil(end) < 0 ? "Expired" : "Ends"} ${formatDate(end)}` : "No warranty on file",
      className: end && daysUntil(end) < 0 ? "text-red-700" : undefined,
    },
    { label: "Lifetime hours", value: eq ? eq.cumulativeUsageHours.toLocaleString("en-IN") : "—" },
    { label: "Requested by", value: getUser(r.requestedByUserId)?.name ?? "Unknown" },
    requestedField(r.requestedAt),
    { label: "Status", value: status.label, className: status.text },
  ];
  if (r.decidedAt) {
    fields.push({ label: "Decided", value: `${formatDate(r.decidedAt)} by ${getUser(r.decidedByUserId)?.name ?? "Unknown"}` });
  }

  return (
    <ApprovalDetailDialog
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow="Warranty override"
      title={eq ? equipmentName(eq) : "Unknown equipment"}
      chips={
        <>
          <Badge variant="outline" className={status.className}>{status.label}</Badge>
          {eq && <Badge variant="outline" className={CRITICALITY_BADGE_CLASS[eq.criticality]}>{CRITICALITY_LABEL[eq.criticality]}</Badge>}
        </>
      }
      note={`${getUser(r.requestedByUserId)?.name ?? "A staff member"} wants to keep using this unit after its warranty lapsed. Approving lets staff past the QR scan gate; repairs won't be covered by the OEM.`}
      fields={fields}
      footer={pending ? <DialogDeclineApprove onApprove={onApprove} onDecline={onDecline} /> : undefined}
    />
  );
}
