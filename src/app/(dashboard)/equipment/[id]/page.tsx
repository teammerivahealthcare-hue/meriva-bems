import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEquipmentById,
  equipmentName,
  categoryName,
  getDepartment,
  getRoom,
  getUser,
  getVendor,
  computeFlags,
  evaluateGate,
  derive,
  FLAG_LABEL,
  FLAG_TAG_CLASS,
  formatDate,
  formatDuration,
  formatINR,
  contractsFor,
  pmScheduleFor,
  calibrationsFor,
  ticketsFor,
  sessionsFor,
  accessoriesFor,
  activityFor,
  authorisationFor,
  condemnationFor,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const GATE_BADGE: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-800",
  AMBER: "bg-amber-100 text-amber-800",
  RED: "bg-red-100 text-red-800",
};

const STATUS_BADGE: Record<string, string> = {
  IN_SERVICE: "bg-emerald-100 text-emerald-800",
  DOWN: "bg-red-100 text-red-800",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-800",
  IN_TRANSIT: "bg-sky-100 text-sky-800",
  DRAFT: "bg-muted text-muted-foreground",
  RETIRED: "bg-muted text-muted-foreground",
  DISPOSED: "bg-muted text-muted-foreground",
};

export default async function EquipmentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eq = getEquipmentById(id);

  if (!eq) notFound();

  const dept = getDepartment(eq.departmentId);
  const room = getRoom(eq.roomId);
  const responsible = getUser(eq.responsibleUserId);
  const flags = computeFlags(eq);
  const gate = evaluateGate(eq);
  const d = derive(eq);

  const contracts = contractsFor(eq.id);
  const pm = pmScheduleFor(eq.id);
  const calibrations = calibrationsFor(eq.id);
  const ticketHistory = ticketsFor(eq.id);
  const sessions = sessionsFor(eq.id);
  const accessoryLineage = accessoriesFor(eq.id);
  const activity = activityFor(eq.id);
  const auth = authorisationFor(eq.id);
  const condemnation = condemnationFor(eq.id);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/equipment" className="text-sm text-muted-foreground hover:underline">
          ← Equipment
        </Link>
      </div>

      {/* Overview header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{equipmentName(eq)}</h1>
          <p className="text-muted-foreground text-sm">
            {categoryName(eq)} · {eq.assetId} · S/N {eq.serialNumber}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {dept?.name} · {room?.name} · Responsible: {responsible?.name ?? "Unassigned"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[eq.operationalStatus] ?? "bg-muted"}`}>
            {eq.operationalStatus.replace(/_/g, " ")}
          </span>
          {eq.financialStatus === "CONDEMNED" && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-zinc-800 text-zinc-50">
              Condemned
            </span>
          )}
        </div>
      </div>

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <Badge key={f} variant="outline" className={FLAG_TAG_CLASS[f]}>
              {FLAG_LABEL[f]}
            </Badge>
          ))}
        </div>
      )}

      {/* Scan gate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${GATE_BADGE[gate.state]}`}>
              {gate.state}
            </span>
            {gate.headline}
          </CardTitle>
        </CardHeader>
        {gate.detail && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{gate.detail}</p>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
          <TabsTrigger value="accessories">Accessories</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Cumulative hours" value={eq.cumulativeUsageHours.toLocaleString("en-IN")} />
            <Stat label="Usage confidence" value={`${d.usageConfidencePct}%`} />
            <Stat label="Purchase cost" value={formatINR(eq.purchaseCost)} />
            <Stat label="Total cost of ownership" value={formatINR(d.totalCostOfOwnership)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Field label="Year of manufacture" value={String(eq.yearOfManufacture)} />
            <Field label="Date of purchase" value={formatDate(eq.dateOfPurchase)} />
            <Field label="Date of installation" value={formatDate(eq.dateOfInstallation)} />
            <Field label="Shelf age at purchase" value={`${d.shelfAgeMonths} months`} />
            <Field label="Dealer" value={getVendor(eq.dealerVendorId)?.name ?? "—"} />
            <Field label="Criticality" value={eq.criticality.replace(/_/g, " ")} />
            <Field label="Usage tracking" value={eq.usageTrackingMode.replace(/_/g, " ")} />
          </div>

          {condemnation && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium">Condemnation</p>
                <p className="text-sm text-muted-foreground">{condemnation.justification}</p>
                <p className="text-sm text-muted-foreground">
                  {condemnation.breakdownCountLast12m} breakdowns · {formatINR(condemnation.repairCostLast12m)} repair cost in the last 12 months
                </p>
                {condemnation.approvedAt && (
                  <p className="text-sm text-muted-foreground">
                    Approved {formatDate(condemnation.approvedAt)} by {getUser(condemnation.approvedByUserId)?.name}
                  </p>
                )}
              </div>
            </>
          )}

          {auth && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Continued-use authorisation</p>
              <p className="text-sm text-muted-foreground">{auth.reason}</p>
              <p className="text-sm text-muted-foreground">
                Authorised by {getUser(auth.authorisedByUserId)?.name} · valid until {formatDate(auth.validUntil)} · reviewed every {auth.reviewIntervalMonths} months
              </p>
            </div>
          )}

          {sessions.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Recent sessions</p>
                <div className="space-y-1.5">
                  {sessions.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatDate(s.startedAt)} · {getUser(s.userId)?.name}
                      </span>
                      <span>
                        {s.durationSeconds ? formatDuration(s.durationSeconds) : "in progress"}
                        {s.endReason === "BREAKDOWN" && (
                          <span className="ml-2 text-red-700">breakdown</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-4 pt-4">
          <div>
            <p className="text-sm font-medium mb-2">Preventive maintenance</p>
            {pm ? (
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>Trigger: {pm.triggerType.replace(/_/g, " ").toLowerCase()}</p>
                {pm.lastPerformedAt && <p>Last performed: {formatDate(pm.lastPerformedAt)}</p>}
                {pm.nextDueDate && <p>Next due: {formatDate(pm.nextDueDate)}</p>}
                {pm.nextDueHours != null && <p>Next due (usage hours): {pm.nextDueHours.toLocaleString("en-IN")}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No PM schedule on file.</p>
            )}
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Calibration history</p>
            {calibrations.length > 0 ? (
              <div className="space-y-1.5">
                {calibrations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(c.performedAt)} · {c.certificateNumber}</span>
                    <span>
                      {c.passed ? "Passed" : "Failed"} · valid until {formatDate(c.validUntil)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No calibration records.</p>
            )}
          </div>
        </TabsContent>

        {/* Breakdowns */}
        <TabsContent value="breakdowns" className="space-y-3 pt-4">
          {ticketHistory.length > 0 ? (
            ticketHistory.map((t) => (
              <Card key={t.id}>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{t.ticketNumber} · {t.issueType}</p>
                    <Badge variant={t.status === "CLOSED" || t.status === "RESOLVED" ? "outline" : "destructive"}>
                      {t.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Opened {formatDate(t.openedAt)}
                    {t.runtimeHoursAtFailure != null && ` · ${t.runtimeHoursAtFailure.toLocaleString("en-IN")} hrs at failure`}
                    {t.downtimeHours != null && ` · ${t.downtimeHours}h downtime`}
                    {t.slaBreached && " · SLA breached"}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No breakdown history.</p>
          )}
        </TabsContent>

        {/* Accessories */}
        <TabsContent value="accessories" className="pt-4">
          {accessoryLineage.length > 0 ? (
            <div className="space-y-2">
              {accessoryLineage.map((a, i) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{i === 0 ? "Original" : `Replacement #${i}`}</span>
                  <span className="font-medium">{a.name}</span>
                  <Badge variant="outline">{a.source}</Badge>
                  <span className="text-muted-foreground">
                    {formatDate(a.installedAt)}–{a.removedAt ? formatDate(a.removedAt) : "present"}
                  </span>
                  {a.status === "REPLACED" && a.removalReason && (
                    <span className="text-muted-foreground">({a.removalReason.toLowerCase()})</span>
                  )}
                  {i < accessoryLineage.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No accessories tracked for this unit.</p>
          )}
        </TabsContent>

        {/* Contracts */}
        <TabsContent value="contracts" className="space-y-3 pt-4">
          {contracts.length > 0 ? (
            contracts.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{c.type} · {c.contractNumber}</p>
                    <span className="text-sm text-muted-foreground">{getVendor(c.vendorId)?.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)} · {formatINR(c.annualCost)}/yr
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Response SLA {c.responseSlaHours}h · Resolution SLA {c.resolutionSlaHours}h
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {eq.financialStatus === "CONDEMNED"
                ? "No active contracts — condemned assets carry no warranty or AMC."
                : "No contracts on file."}
            </p>
          )}
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="pt-4">
          {activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.id} className="text-sm border-l-2 pl-3 border-muted">
                  <p>{a.summary}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.occurredAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
