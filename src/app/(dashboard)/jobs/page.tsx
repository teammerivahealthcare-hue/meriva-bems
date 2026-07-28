import Link from "next/link";
import { facility, buildActiveJobs, buildClosedJobs, formatDate } from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveJobRow } from "@/components/active-job-row";
import { StatCards, type StatCardSpec } from "@/components/stat-cards";

export default function JobsPage() {
  const activeJobs = buildActiveJobs();
  const closedJobs = buildClosedJobs().slice(0, 10);

  const statCards: StatCardSpec[] = [
    {
      key: "tickets",
      label: "Open jobs",
      value: String(activeJobs.length),
      subtext: `${activeJobs.filter((j) => j.slaBreached).length} SLA breached`,
    },
    {
      key: "critical",
      label: "Critical priority",
      value: String(activeJobs.filter((j) => j.priority === "CRITICAL").length),
    },
    {
      key: "unassigned",
      label: "Unassigned",
      value: String(activeJobs.filter((j) => !j.engineerName).length),
    },
    {
      key: "slaBreach",
      label: "SLA breached",
      value: String(activeJobs.filter((j) => j.slaBreached).length),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-muted-foreground text-sm">
          All internal repair jobs at {facility.name} — open work, most urgent first, plus recently completed
          history.
        </p>
      </div>

      <StatCards stats={statCards} />

      <Card>
        <CardHeader>
          <CardTitle>Open jobs</CardTitle>
          <CardDescription>All open tickets, most urgent first</CardDescription>
        </CardHeader>
        <CardContent>
          {activeJobs.length > 0 ? (
            <div>
              {activeJobs.map((job) => (
                <ActiveJobRow key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active jobs right now.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently completed</CardTitle>
          <CardDescription>Resolved or closed jobs, most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {closedJobs.length > 0 ? (
            <div>
              {closedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link href={`/equipment/${job.equipmentId}`} className="text-sm font-medium hover:underline">
                      {job.equipmentDisplayName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {job.department} · {formatDate(job.lastUpdated)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm">{job.engineerName ?? "Unassigned"}</p>
                    <Badge
                      variant="outline"
                      className={job.slaBreached ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}
                    >
                      {job.statusLabel}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No completed jobs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
