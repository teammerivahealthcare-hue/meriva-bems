"use client";

import { useState } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export interface ActivityFeedItem {
  id: string;
  equipmentId: string;
  equipmentName: string;
  href: string;
  summary: string;
  relativeTime: string;
  fullDate: string;
  dotClass: string;
}

/** Shared row list, no search box — used standalone (e.g. day-scoped activity) or wrapped by RecentActivityFeed. */
export function ActivityFeedList({
  items,
  emptyText = "No recent activity.",
}: {
  items: ActivityFeedItem[];
  emptyText?: string;
}) {
  const [selected, setSelected] = useState<ActivityFeedItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3">
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-zinc-300" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className="flex w-full items-start justify-between gap-3 py-3 text-left transition-colors first:pt-0 last:pb-0 hover:bg-muted/50"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.dotClass}`} />
              <p className="text-sm">
                {item.summary} — {item.equipmentName}
              </p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{item.relativeTime}</span>
          </button>
        ))}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.equipmentName}</DialogTitle>
                <DialogDescription>{selected.summary}</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{selected.fullDate} · {selected.relativeTime}</p>
              <DialogFooter>
                <Button asChild>
                  <Link href={selected.href}>View equipment</Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RecentActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? items.filter((item) => item.equipmentName.toLowerCase().includes(trimmed))
    : items;

  return (
    <div className="space-y-4">
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by equipment name"
          className="pl-9"
        />
      </div>

      <ActivityFeedList
        items={filtered}
        emptyText={trimmed ? `No activity matching "${query}".` : "No recent activity."}
      />
    </div>
  );
}
