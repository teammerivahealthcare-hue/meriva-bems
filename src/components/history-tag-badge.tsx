import { Badge } from "@/components/ui/badge";
import type { PortalHistoryRow } from "@/lib/bems";

const TONE_CLASS: Record<PortalHistoryRow["tone"], string> = {
  default: "",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "",
};

/** Renders a PortalHistoryRow's tag — danger uses the Badge's own destructive variant, warning reuses the shared warning token, default falls back to outline. */
export function HistoryTagBadge({ row, className }: { row: PortalHistoryRow; className?: string }) {
  return (
    <Badge
      variant={row.tone === "danger" ? "destructive" : "outline"}
      className={`shrink-0 ${TONE_CLASS[row.tone]} ${className ?? ""}`}
    >
      {row.tagLabel}
    </Badge>
  );
}
