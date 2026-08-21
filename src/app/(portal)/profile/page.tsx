"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CaretLeft, SignOut, CheckCircle, Coffee, MoonStars, ArrowsLeftRight, ArrowUUpLeft,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import {
  useDemo, usePortalUser, buildProfileHistory, formatDate,
  type PortalAvailability,
} from "@/lib/bems";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { HistoryTagBadge } from "@/components/history-tag-badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

const AVAILABILITY_OPTIONS: { value: PortalAvailability; label: string; icon: typeof CheckCircle; activeClass: string }[] = [
  { value: "AVAILABLE", label: "Available", icon: CheckCircle, activeClass: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  { value: "ON_BREAK", label: "On break", icon: Coffee, activeClass: "bg-amber-50 text-amber-800 border-amber-300" },
  { value: "OFF_DUTY", label: "Off duty", icon: MoonStars, activeClass: "bg-zinc-100 text-zinc-700 border-zinc-300" },
];

export default function PortalProfilePage() {
  const user = usePortalUser();
  const notificationsEnabled = useDemo((s) => s.portalNotificationsEnabled);
  const setNotificationsEnabled = useDemo((s) => s.setPortalNotificationsEnabled);
  const availability = useDemo((s) => s.engineerAvailability);
  const setAvailability = useDemo((s) => s.setEngineerAvailability);
  const sessions = useDemo((s) => s.sessions);
  const tickets = useDemo((s) => s.tickets);
  const emergencySessionIds = useDemo((s) => s.emergencySessionIds);
  const movementRequests = useDemo((s) => s.movementRequests);
  const confirmMovementReturn = useDemo((s) => s.confirmMovementReturn);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [returnAccessoriesById, setReturnAccessoriesById] = useState<Record<string, boolean>>({});
  const returnedWithAccessories = (id: string) => returnAccessoriesById[id] ?? true;

  const isEngineer = user.role === "ENGINEER";
  const history = buildProfileHistory(user, { sessions, tickets, emergencySessionIds, movementRequests });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-4">
        <Link href="/home" aria-label="Back" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <CaretLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold">Profile</h1>
      </header>

      <div className="flex-1 space-y-6 p-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar size="lg" className="size-16">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold">{user.name}</p>
            <Badge variant="outline" className="mt-1">{user.designation}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">Alerts for gate advisories and ticket updates</p>
          </div>
          <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
        </div>

        {isEngineer && (
          <div className="rounded-xl border p-3">
            <p className="mb-2 text-sm font-medium">Availability</p>
            <div className="grid grid-cols-3 gap-2">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = availability === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAvailability(opt.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      active ? opt.activeClass : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon size={16} weight={active ? "fill" : "regular"} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">History</h2>
          {history.length > 0 ? (
            <div>
              {history.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/equipment/${row.equipmentId}`} className="text-sm font-medium hover:underline">
                        {row.equipmentDisplayName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(row.dateIso)} · {row.subtext}
                      </p>
                    </div>
                    {!(row.awaitingReturn && row.movementId) && <HistoryTagBadge row={row} />}
                  </div>
                  {row.awaitingReturn && row.movementId && (
                    <div className="flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={returnedWithAccessories(row.movementId)}
                          onCheckedChange={(v) =>
                            setReturnAccessoriesById((s) => ({ ...s, [row.movementId!]: v === true }))
                          }
                        />
                        Returned with all accessories
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 gap-1"
                        onClick={() =>
                          confirmMovementReturn(row.movementId!, {
                            actorUserId: user.id,
                            returnedWithAllAccessories: returnedWithAccessories(row.movementId!),
                          })
                        }
                      >
                        <ArrowUUpLeft size={14} /> Mark as returned
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ArrowsLeftRight} message="No history yet." />
          )}
        </div>

        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="flex items-center gap-2 py-2 text-sm font-medium text-destructive"
        >
          <SignOut size={16} /> Log out
        </button>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logged out</DialogTitle>
            <DialogDescription>
              No authentication backend is wired up in this demo — in the real app this would end your session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild>
              <Link href="/signup">Back to sign-in</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
