"use client";

import Link from "next/link";
import { QrCode, CaretRight } from "@phosphor-icons/react";
import { facility, formatDate, now, useDemo, usePortalUser, recentSessionsPreview } from "@/lib/bems";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HistoryTagBadge } from "@/components/history-tag-badge";

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

export default function PortalHomePage() {
  const user = usePortalUser();
  const sessions = useDemo((s) => s.sessions);
  const tickets = useDemo((s) => s.tickets);
  const emergencySessionIds = useDemo((s) => s.emergencySessionIds);
  const preview = recentSessionsPreview(user, { sessions, tickets, emergencySessionIds }, 3);

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
        <Link
          href="/qrscanstart"
          className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 transition-colors hover:bg-primary/10"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <QrCode size={22} weight="bold" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Scan equipment</span>
            <span className="block text-xs text-muted-foreground">Start a session, check status, or flag a breakdown</span>
          </span>
          <CaretRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent sessions</h2>
            <Link href="/profile" className="text-xs font-medium text-primary hover:underline">
              See all
            </Link>
          </div>

          {preview.length > 0 ? (
            <div>
              {preview.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.equipmentDisplayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(row.dateIso)} · {row.subtext}
                    </p>
                  </div>
                  <HistoryTagBadge row={row} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">No sessions yet — scan equipment to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
