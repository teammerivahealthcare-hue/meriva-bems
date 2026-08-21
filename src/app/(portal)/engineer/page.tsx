"use client";

import { useEffect } from "react";
import Link from "next/link";
import { QrCode, CaretRight, Wrench } from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import { facility, now, useDemo, usePortalUser, buildEngineerOpenTickets, PRIORITY_BADGE } from "@/lib/bems";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function greeting(): string {
  const hour = now().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Engineer's own dashboard -- a durable landing page for engineer-specific
 * flows (repairs today, more to come), separate from the shared nurse/staff
 * (portal)/home. Nested under (portal) so it picks up PortalShell from the
 * existing layout, same as home/profile.
 */
export default function EngineerHomePage() {
  const user = usePortalUser();
  const setPortalRole = useDemo((s) => s.setPortalRole);
  const tickets = useDemo((s) => s.tickets);
  const workOrders = useDemo((s) => s.workOrders);
  const assignedRepairs = buildEngineerOpenTickets(user.id, tickets, workOrders);

  // Being on /engineer IS the role -- keep the store in sync regardless of
  // how someone arrived here (typed URL, bookmark, refresh).
  useEffect(() => {
    if (user.role !== "ENGINEER") setPortalRole("ENGINEER");
  }, [user.role, setPortalRole]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{greeting()}, {user.name.split(" ")[0]}</p>
          <h1 className="truncate text-lg font-semibold">{facility.name}</h1>
        </div>
        <Link href="/profile" aria-label="Open profile" className="shrink-0">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Link>
      </header>

      <div className="flex-1 space-y-6 p-5">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-medium">Your assigned repairs</h2>
            {assignedRepairs.length > 0 && (
              <span className="text-xs text-muted-foreground">{assignedRepairs.length}</span>
            )}
          </div>

          {assignedRepairs.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border">
              {assignedRepairs.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/repairflow/${ticket.equipmentId}?ticketId=${ticket.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ticket.equipmentDisplayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.ticketNumber} · {ticket.location}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={PRIORITY_BADGE[ticket.priority]}>
                      {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                    </Badge>
                    <CaretRight size={16} className="text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={Wrench} message="No repairs assigned to you right now." />
          )}
        </div>

        <Link
          href="/engineer/scan"
          className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 transition-colors hover:bg-primary/10"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <QrCode size={22} weight="bold" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Scan equipment</span>
            <span className="block text-xs text-muted-foreground">Start a PM report, check status, or flag a breakdown</span>
          </span>
          <CaretRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
