import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Asset ID as joined segments (e.g. SMH | ICU | 0012) with the running number highlighted. */
export function AssetIdChip({ assetId, className }: { assetId: string; className?: string }) {
  const parts = assetId.split("/").filter(Boolean);
  return (
    <span
      className={cn(
        "inline-flex overflow-hidden rounded-md border border-border text-[11px] font-medium leading-5 uppercase",
        className
      )}
      title={assetId}
    >
      {parts.map((part, i) => (
        <span
          key={i}
          className={cn(
            "px-1.5",
            i > 0 && "border-l border-border",
            i === parts.length - 1 ? "bg-blue-50 text-blue-700" : "bg-white text-muted-foreground"
          )}
        >
          {part}
        </span>
      ))}
    </span>
  );
}

/** Rounded status pill with a leading dot in the text colour. */
export function DotPill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-full", className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}

export const DOT_PILL_CLASS = {
  blue: "bg-blue-50 text-blue-700 border-transparent",
  red: "bg-red-50 text-red-600 border-transparent",
  amber: "bg-amber-50 text-amber-800 border-transparent",
  green: "bg-emerald-50 text-emerald-700 border-transparent",
  gray: "bg-zinc-100 text-zinc-700 border-transparent",
} as const;
