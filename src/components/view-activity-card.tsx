"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeedList } from "@/components/recent-activity-feed";
import type { DayActivity } from "@/lib/bems";
import { cn } from "@/lib/utils";

const VISIBLE_ITEMS = 5;

export function ViewActivityCard({ days }: { days: DayActivity[] }) {
  const [selected, setSelected] = useState(days.length - 1);
  const active = days[selected];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Activity</CardTitle>
          <CardDescription>{active.dateLabel}</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/activity">View all activity</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {days.map((day, i) => (
            <button
              key={day.iso}
              type="button"
              onClick={() => setSelected(i)}
              aria-current={i === selected}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2 text-center transition-colors",
                i === selected
                  ? "border-transparent bg-black text-white"
                  : "border-border hover:bg-muted"
              )}
            >
              <span className={cn("text-xs", i === selected ? "text-white/70" : "text-muted-foreground")}>
                {day.weekdayLabel}
              </span>
              <span className="text-sm font-medium">{day.isToday ? "Today" : day.dayLabel}</span>
            </button>
          ))}
        </div>

        <ActivityFeedList
          items={active.items.slice(0, VISIBLE_ITEMS)}
          emptyText="No activity on this day."
        />
        {active.items.length > VISIBLE_ITEMS && (
          <p className="text-xs text-muted-foreground">+{active.items.length - VISIBLE_ITEMS} more</p>
        )}
      </CardContent>
    </Card>
  );
}
