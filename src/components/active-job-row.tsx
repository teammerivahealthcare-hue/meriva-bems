import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, PRIORITY_BADGE, type ActiveJob } from "@/lib/bems";

export function ActiveJobRow({ job }: { job: ActiveJob }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0">
      <div className="min-w-0">
        <Link href={`/equipment/${job.equipmentId}`} className="text-sm font-medium hover:underline">
          {job.equipmentDisplayName}
        </Link>
        <p className="text-xs text-muted-foreground">
          {job.department} · Updated {formatDate(job.lastUpdated)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Badge variant="outline" className={PRIORITY_BADGE[job.priority]}>
          {job.priority.charAt(0) + job.priority.slice(1).toLowerCase()}
        </Badge>
        <div className="text-right">
          <p className="text-sm">{job.statusLabel}</p>
          <p className="text-xs text-muted-foreground">{job.engineerName ?? "Unassigned"}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/equipment/${job.equipmentId}`}>{job.engineerName ? "View" : "Assign"}</Link>
        </Button>
      </div>
    </div>
  );
}
