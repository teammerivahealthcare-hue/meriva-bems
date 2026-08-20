"use client";

import { useState } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

export interface ActivityFeedItem {
  id: string;
  equipmentName: string;
  href: string;
  summary: string;
  relativeTime: string;
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
  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3">
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-zinc-300" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {items.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.dotClass}`} />
            <p className="text-sm">
              {item.summary} —{" "}
              <Link href={item.href} className="hover:underline">
                {item.equipmentName}
              </Link>
            </p>
          </div>
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{item.relativeTime}</span>
        </div>
      ))}
    </div>
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
