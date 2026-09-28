"use client";

import { useEffect, useState } from "react";

function updatedAgoLabel(minutes: number): string {
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
}

/** "Updated N mins ago" for a page header — counts from when the page loaded its data, ticking once a minute. */
export function useUpdatedAgoLabel(): string {
  const [loadedAt] = useState(() => Date.now());
  const [minutesSinceLoad, setMinutesSinceLoad] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinutesSinceLoad(Math.floor((Date.now() - loadedAt) / 60_000)), 60_000);
    return () => clearInterval(id);
  }, [loadedAt]);
  return updatedAgoLabel(minutesSinceLoad);
}
