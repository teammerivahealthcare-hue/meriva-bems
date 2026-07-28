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

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.dotClass}`} />
              <div>
                <p className="text-sm">
                  {item.summary} —{" "}
                  <Link href={item.href} className="hover:underline">
                    {item.equipmentName}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">{item.relativeTime}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-zinc-300" />
          <p className="text-sm text-muted-foreground">
            {trimmed ? `No activity matching "${query}".` : "No recent activity."}
          </p>
        </div>
      )}
    </div>
  );
}
