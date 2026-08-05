"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Phone, DotsThreeVertical, PencilSimple } from "@phosphor-icons/react";
import {
  useDemo,
  TEAM_ROLE_LABEL,
  AVAILABILITY_LABEL,
  AVAILABILITY_DOT_CLASS,
  availabilityFor,
  activeTicketsCountFor,
  completedTicketsCountFor,
  avgResolutionTimeFor,
  equipmentTypesHandledFor,
  ticketHistoryFor,
  sessionsForMember,
  sessionsLoggedCountFor,
  formatDate,
  formatINR,
  type TeamMember,
  type TicketHistoryRow,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Breadcrumb } from "@/components/breadcrumb";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function TeamMemberProfilePage() {
  const params = useParams<{ id: string }>();
  const teamMembers = useDemo((s) => s.teamMembers);
  const deactivateTeamMember = useDemo((s) => s.deactivateTeamMember);
  const activateTeamMember = useDemo((s) => s.activateTeamMember);
  const updateTeamMember = useDemo((s) => s.updateTeamMember);

  const member = teamMembers.find((m) => m.id === params.id);

  const [editingDetails, setEditingDetails] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [draft, setDraft] = useState<Pick<TeamMember, "name" | "phone" | "email"> | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  if (!member) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: "Team", href: "/team" }, { label: "Not found" }]} />
        <p className="text-sm text-muted-foreground">Team member not found.</p>
      </div>
    );
  }

  const isEngineer = member.role === "ENGINEER";
  const availability = isEngineer ? availabilityFor(member.id) : null;
  const equipmentTypes = isEngineer ? equipmentTypesHandledFor(member.id) : [];

  function startEditingDetails() {
    setDraft({ name: member!.name, phone: member!.phone, email: member!.email });
    setEditingDetails(true);
  }

  function saveDetails() {
    if (!draft) return;
    updateTeamMember(member!.id, draft);
    setEditingDetails(false);
  }

  function startEditingNotes() {
    setNotesDraft(member!.notes ?? "");
    setEditingNotes(true);
  }

  function saveNotes() {
    updateTeamMember(member!.id, { notes: notesDraft });
    setEditingNotes(false);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Breadcrumb items={[{ label: "Team", href: "/team" }, { label: member.name }]} />

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 py-5">
          <div className="flex items-start gap-4">
            <Avatar className="size-12">
              <AvatarFallback className="text-base">{initials(member.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              {editingDetails && draft ? (
                <div className="space-y-2">
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="h-8 max-w-56"
                  />
                  <Input
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    className="h-8 max-w-56"
                  />
                  <Input
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className="h-8 max-w-56"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveDetails}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDetails(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold">{member.name}</h1>
                    <Badge variant="outline">{TEAM_ROLE_LABEL[member.role]}</Badge>
                    {!member.active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  {isEngineer && equipmentTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {equipmentTypes.map((type) => (
                        <Badge key={type} variant="outline" className="rounded-full text-muted-foreground">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} /> {member.phone}
                    </span>
                    {availability && (
                      <span className="flex items-center gap-1.5">
                        <span className={`size-2 shrink-0 rounded-full ${AVAILABILITY_DOT_CLASS[availability]}`} />
                        {AVAILABILITY_LABEL[availability]}
                      </span>
                    )}
                    <span>Member since {formatDate(member.joinedAt)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!editingDetails && (
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={startEditingDetails}>
                <PencilSimple /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <DotsThreeVertical />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {member.active ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => deactivateTeamMember(member.id)}>
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => activateTeamMember(member.id)}>Activate</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>

      {isEngineer ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Tickets completed" value={String(completedTicketsCountFor(member.id))} />
          <StatTile label="Active tickets" value={String(activeTicketsCountFor(member.id))} />
          <StatTile label="Avg resolution time" value={avgResolutionTimeFor(member.id)} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Sessions logged" value={String(sessionsLoggedCountFor(member.id))} />
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Notes</p>
            {!editingNotes && (
              <button
                type="button"
                onClick={startEditingNotes}
                className="text-xs font-medium text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNotes}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{member.notes || "No notes yet."}</p>
          )}
        </CardContent>
      </Card>

      {isEngineer ? <TicketHistorySection memberId={member.id} /> : <SessionHistorySection memberId={member.id} />}
    </div>
  );
}

const TICKET_STATUS_BADGE: Record<"Completed" | "In progress", string> = {
  Completed: "bg-success/10 text-success border-success/30",
  "In progress": "bg-status-accent/10 text-status-accent border-status-accent/30",
};

const TICKET_TYPE_LABEL: Record<TicketHistoryRow["type"], string> = {
  CORRECTIVE: "Corrective repair",
  PREVENTIVE: "Preventive maintenance",
  CALIBRATION: "Calibration",
  INSTALLATION: "Installation",
  INSPECTION: "Inspection",
};

function TicketHistorySection({ memberId }: { memberId: string }) {
  const rows = ticketHistoryFor(memberId);
  const [selected, setSelected] = useState<TicketHistoryRow | null>(null);

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <p className="text-sm font-medium">Ticket history</p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className="block w-full space-y-1 border-b pb-4 text-left last:border-0 last:pb-0 hover:opacity-70"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-sm">{row.equipmentName}</span>
                  <Badge variant="outline" className={TICKET_STATUS_BADGE[row.status]}>
                    {row.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(row.date)}
                  {row.resolutionDuration && ` · resolved in ${row.resolutionDuration}`}
                </p>
                {row.origin && (
                  <p className="text-xs text-muted-foreground">
                    Flagged by {row.origin.flaggedBy} after {row.origin.usedFor} of use — {row.origin.reason}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle>{selected.equipmentName}</SheetTitle>
                <SheetDescription>
                  {selected.workOrderNumber} · {TICKET_TYPE_LABEL[selected.type]}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className={TICKET_STATUS_BADGE[selected.status]}>
                    {selected.status}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Started</p>
                  <p className="text-sm">{formatDate(selected.date)}</p>
                </div>

                {selected.resolutionDuration && (
                  <div>
                    <p className="text-xs text-muted-foreground">Resolution time</p>
                    <p className="text-sm">{selected.resolutionDuration}</p>
                  </div>
                )}

                {selected.findings && (
                  <div>
                    <p className="text-xs text-muted-foreground">Findings</p>
                    <p className="text-sm">{selected.findings}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Labour cost</p>
                    <p className="text-sm">{formatINR(selected.labourCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parts cost</p>
                    <p className="text-sm">{formatINR(selected.partsCost)}</p>
                  </div>
                </div>

                {selected.ticketNumber && (
                  <div className="space-y-1 border-t pt-4">
                    <p className="text-xs text-muted-foreground">Originating ticket</p>
                    <p className="text-sm font-medium">{selected.ticketNumber}</p>
                    {selected.ticketDescription && (
                      <p className="text-sm text-muted-foreground">{selected.ticketDescription}</p>
                    )}
                  </div>
                )}

                {selected.origin && (
                  <div className="space-y-1 border-t pt-4">
                    <p className="text-xs text-muted-foreground">Usage session that triggered this</p>
                    <p className="text-sm">
                      Flagged by {selected.origin.flaggedBy} after {selected.origin.usedFor} of use —{" "}
                      {selected.origin.reason}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function SessionHistorySection({ memberId }: { memberId: string }) {
  const rows = sessionsForMember(memberId);
  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <p className="text-sm font-medium">Usage sessions</p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No usage sessions recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="space-y-1 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-sm">{row.equipmentName}</span>
                  <span className="text-sm text-muted-foreground">{row.duration}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(row.date)}</p>
                {row.breakdownFlag && (
                  <p className="text-xs text-danger">Breakdown flagged — {row.breakdownFlag}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
