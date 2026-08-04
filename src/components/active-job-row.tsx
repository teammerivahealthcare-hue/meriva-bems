import { Badge } from "@/components/ui/badge";
import { formatDate, PRIORITY_BADGE, type ActiveJob } from "@/lib/bems";

function ActiveJobRowContent({ job }: { job: ActiveJob }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <Badge variant="outline" className={`shrink-0 ${PRIORITY_BADGE[job.priority]}`}>
          {job.priority.charAt(0) + job.priority.slice(1).toLowerCase()}
        </Badge>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{job.equipmentDisplayName}</p>
          <p className="text-xs text-muted-foreground">
            {job.department} · Updated {formatDate(job.lastUpdated)}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm">{job.statusLabel}</p>
        <p className="text-xs text-muted-foreground">{job.engineerName ?? "Unassigned"}</p>
      </div>
    </>
  );
}

/** Row for a ticket-backed job. Pass `onClick` to open the ticket detail sheet; omitted for read-only previews (e.g. the dashboard). */
export function ActiveJobRow({ job, onClick }: { job: ActiveJob; onClick?: (job: ActiveJob) => void }) {
  if (!onClick) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0">
        <ActiveJobRowContent job={job} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(job)}
      className="flex w-full items-center justify-between gap-4 border-b border-muted py-3 text-left first:pt-0 last:border-0 last:pb-0 hover:bg-muted/40"
    >
      <ActiveJobRowContent job={job} />
    </button>
  );
}
