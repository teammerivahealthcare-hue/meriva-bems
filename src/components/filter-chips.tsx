"use client";

import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Single-select row of pill filters — Activity's Live/History filters and
 * the MGPS page. `activeClassName` swaps the selected look where a
 * screen wants its own accent.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  activeClassName = "border-foreground/40 bg-muted text-foreground",
  className,
}: {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Filter operations". */
  label: string;
  activeClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? activeClassName : "border-border bg-surface text-foreground/80 hover:bg-muted"
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
