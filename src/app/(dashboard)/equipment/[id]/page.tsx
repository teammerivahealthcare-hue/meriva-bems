"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Wrench, TrashSimple } from "@phosphor-icons/react";
import {
  equipmentName,
  categoryName,
  getDepartment,
  getRoom,
  getUser,
  getVendor,
  getManufacturer,
  modelFor,
  computeFlags,
  evaluateGate,
  derive,
  operatingHoursSummary,
  FLAG_LABEL,
  FLAG_TAG_CLASS,
  formatDate,
  formatDuration,
  formatINR,
  daysUntil,
  contractsFor,
  pmScheduleFor,
  calibrationsFor,
  ticketsFor,
  workOrdersFor,
  sessionsFor,
  accessoriesFor,
  authorisationFor,
  certificationDocuments,
  expiryStatus,
  useDemo,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CertificationsDialog } from "@/components/certifications-dialog";
import { EquipmentLabelDialog } from "@/components/equipment-label-dialog";
import { Breadcrumb } from "@/components/breadcrumb";

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

function EquipmentProfileContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "contracts" ? "contracts" : "overview";
  const certModalOpen = searchParams.get("certModal") === "open";

  const eq = useDemo((s) => s.equipment.find((e) => e.id === id));
  const liveCondemnationRecords = useDemo((s) => s.condemnationRecords);
  const liveActivity = useDemo((s) => s.activity);
  const condemnationRecords = liveCondemnationRecords.filter((c) => c.equipmentId === id);
  const activity = liveActivity
    .filter((a) => a.equipmentId === id)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const resolveCondemnation = useDemo((s) => s.resolveCondemnation);
  const rejectCondemnation = useDemo((s) => s.rejectCondemnation);
  const requestCondemnation = useDemo((s) => s.requestCondemnation);

  const [condemnationNotes, setCondemnationNotes] = useState("");
  const [requestingCondemnation, setRequestingCondemnation] = useState(false);
  const [condemnationJustification, setCondemnationJustification] = useState("");

  if (!eq) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: "Equipment", href: "/equipment" }, { label: "Not found" }]} />
        <p className="text-sm text-muted-foreground">Equipment not found.</p>
      </div>
    );
  }

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
  const auth = authorisationFor(eq.id);
  const pendingCondemnation = condemnationRecords.find((c) => !c.approvedAt && !c.rejectedAt);
  const settledCondemnation = condemnationRecords
    .filter((c) => c.approvedAt || c.rejectedAt)
    .sort((a, b) => (b.approvedAt ?? b.rejectedAt ?? "").localeCompare(a.approvedAt ?? a.rejectedAt ?? ""))[0];
  const certifications = certificationDocuments(eq.id);
  const hoursOp = operatingHoursSummary(eq);

  const manufacturer = getManufacturer(modelFor(eq)?.manufacturerId ?? "");
  const warrantyContract = contracts.find((c) => c.type === "WARRANTY");
  const warrantyDaysLeft = warrantyContract ? daysUntil(warrantyContract.endDate) : null;
  const totalServiceCalls = workOrdersFor(eq.id).length;
  const totalDowntimeHours = ticketHistory.reduce((sum, t) => sum + (t.downtimeHours ?? 0), 0);
  const hasOpenTicket = ticketHistory.some((t) => t.status !== "CLOSED" && t.status !== "RESOLVED");
  const serviceRequired = hasOpenTicket || eq.operationalStatus === "DOWN" || flags.includes("PM_OVERDUE");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Equipment", href: "/equipment" },
          { label: categoryName(eq) },
          { label: equipmentName(eq) },
        ]}
      />

      {/* Overview header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{equipmentName(eq)}</h1>
          <p className="text-muted-foreground text-sm">
            {categoryName(eq)} · {eq.assetId} · S/N {eq.serialNumber}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[eq.operationalStatus] ?? "bg-muted"}`}>
            {eq.operationalStatus.replace(/_/g, " ")}
          </span>
          {eq.financialStatus === "CONDEMNED" && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-zinc-800 text-zinc-50">
              Condemned
            </span>
          )}
          <EquipmentLabelDialog
            assetId={eq.assetId}
            name={equipmentName(eq)}
            category={categoryName(eq)}
            serialNumber={eq.serialNumber}
            purchaseDate={formatDate(eq.dateOfPurchase)}
            warrantyExpiry={warrantyContract ? formatDate(warrantyContract.endDate) : undefined}
          />
          {serviceRequired && (
            <Button size="sm" className="h-9 gap-1.5">
              <Wrench size={14} /> Assign service
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr] xl:items-start">
        {/* Left rail — identity: the constant, reference facts about this unit */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Asset ID" value={eq.assetId} />
              <Field label="Department" value={dept?.name ?? "—"} />
              <Field label="Manufacturer" value={manufacturer?.name ?? "—"} />
              <Field label="Serial number" value={eq.serialNumber} />
              <Field label="Purchase date" value={formatDate(eq.dateOfPurchase)} />
              <Field label="Installation date" value={formatDate(eq.dateOfInstallation)} />
              <Field
                label="Warranty expiry"
                value={warrantyContract ? formatDate(warrantyContract.endDate) : "No warranty on file"}
              />
              <Field label="Floor / Section" value={room ? `Floor ${room.floor} · ${room.name}` : "—"} />
            </CardContent>
          </Card>

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
        </div>

        {/* Right — the detailed, tabbed record */}
        <Tabs defaultValue={initialTab}>
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
              <Stat label="Operational status" value={eq.operationalStatus.replace(/_/g, " ")} />
              <Stat
                label="Warranty"
                value={warrantyContract ? (warrantyDaysLeft! < 0 ? "Expired" : `${warrantyDaysLeft} days`) : "—"}
              />
              <Stat label="Total service calls" value={String(totalServiceCalls)} />
              <Stat label="Total downtime" value={`${totalDowntimeHours} hrs`} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Cumulative hours" value={eq.cumulativeUsageHours.toLocaleString("en-IN")} />
              <Stat label="Usage confidence" value={`${d.usageConfidencePct}%`} />
              <Stat label="Purchase cost" value={formatINR(eq.purchaseCost)} />
              <Stat label="Total cost of ownership" value={formatINR(d.totalCostOfOwnership)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Field label="Year of manufacture" value={String(eq.yearOfManufacture)} />
              <Field label="Shelf age at purchase" value={`${d.shelfAgeMonths} months`} />
              <Field label="Dealer" value={getVendor(eq.dealerVendorId)?.name ?? "—"} />
              <Field label="Criticality" value={eq.criticality.replace(/_/g, " ")} />
              <Field label="Usage tracking" value={eq.usageTrackingMode.replace(/_/g, " ")} />
              <Field label="Responsible" value={responsible?.name ?? "Unassigned"} />
            </div>

            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Condemnation</p>

              {pendingCondemnation ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{pendingCondemnation.justification}</p>
                  <p className="text-sm text-muted-foreground">
                    {pendingCondemnation.breakdownCountLast12m} breakdowns ·{" "}
                    {formatINR(pendingCondemnation.repairCostLast12m)} repair cost in the last 12 months
                  </p>
                  <Textarea
                    placeholder="Notes (optional)"
                    value={condemnationNotes}
                    onChange={(e) => setCondemnationNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        resolveCondemnation(pendingCondemnation.id, "REFURBISH", condemnationNotes || undefined);
                        setCondemnationNotes("");
                      }}
                    >
                      <Wrench size={14} /> Refurbish — reuse with parts
                    </Button>
                    <Button
                      variant="decline"
                      size="sm"
                      onClick={() => {
                        resolveCondemnation(pendingCondemnation.id, "CONDEMN", condemnationNotes || undefined);
                        setCondemnationNotes("");
                      }}
                    >
                      <TrashSimple size={14} /> Condemn unit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        rejectCondemnation(pendingCondemnation.id);
                        setCondemnationNotes("");
                      }}
                    >
                      Reject request
                    </Button>
                  </div>
                </div>
              ) : settledCondemnation ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{settledCondemnation.justification}</p>
                  <p className="text-sm text-muted-foreground">
                    {settledCondemnation.breakdownCountLast12m} breakdowns ·{" "}
                    {formatINR(settledCondemnation.repairCostLast12m)} repair cost in the last 12 months
                  </p>
                  {settledCondemnation.resolution && (
                    <p className="text-sm text-muted-foreground">
                      {settledCondemnation.resolution === "CONDEMNED"
                        ? "Condemned"
                        : "Refurbished — reused with parts replacement"}{" "}
                      {formatDate(settledCondemnation.approvedAt!)} by{" "}
                      {getUser(settledCondemnation.approvedByUserId)?.name}
                    </p>
                  )}
                  {settledCondemnation.rejectedAt && (
                    <p className="text-sm text-muted-foreground">
                      Request rejected {formatDate(settledCondemnation.rejectedAt)} by{" "}
                      {getUser(settledCondemnation.rejectedByUserId)?.name}
                    </p>
                  )}
                  {settledCondemnation.resolutionNotes && (
                    <p className="text-sm text-muted-foreground">{settledCondemnation.resolutionNotes}</p>
                  )}
                </div>
              ) : eq.financialStatus === "CONDEMNED" ? (
                <p className="text-sm text-muted-foreground">This unit is condemned.</p>
              ) : requestingCondemnation ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Why should this unit be reviewed for condemnation?"
                    value={condemnationJustification}
                    onChange={(e) => setCondemnationJustification(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!condemnationJustification.trim()}
                      onClick={() => {
                        requestCondemnation(eq.id, condemnationJustification.trim());
                        setCondemnationJustification("");
                        setRequestingCondemnation(false);
                      }}
                    >
                      Submit request
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRequestingCondemnation(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setRequestingCondemnation(true)}>
                  Request condemnation review
                </Button>
              )}
            </div>

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
          <TabsContent value="maintenance" className="pt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Preventive maintenance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pm ? (
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Trigger: {pm.triggerType.replace(/_/g, " ").toLowerCase()}</p>
                        {pm.lastPerformedAt && <p>Last performed: {formatDate(pm.lastPerformedAt)}</p>}
                        {pm.nextDueDate && <p>Next due: {formatDate(pm.nextDueDate)}</p>}
                        {pm.nextDueHours != null && <p>Next due (usage hours): {pm.nextDueHours.toLocaleString("en-IN")}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No PM schedule on file.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Calibration history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {calibrations.length > 0 ? (
                      <div className="space-y-2">
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
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Operating hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Cumulative hours</p>
                    <p className="text-2xl font-semibold">{hoursOp.cumulativeHours.toLocaleString("en-IN")}</p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs text-muted-foreground">Hours run since last PM</p>
                    <p className="text-2xl font-semibold">
                      {hoursOp.hoursSinceLastPm != null
                        ? `${Math.round(hoursOp.hoursSinceLastPm).toLocaleString("en-IN")} hrs`
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {hoursOp.lastPmDate
                        ? `Since last PM on ${formatDate(hoursOp.lastPmDate)} · ${hoursOp.sessionsSinceLastPm} session${hoursOp.sessionsSinceLastPm === 1 ? "" : "s"}`
                        : "No PM on file yet"}
                    </p>

                    {hoursOp.hoursTriggerPct != null && (
                      <div className="mt-3">
                        <Progress value={hoursOp.hoursTriggerPct} className="h-1.5" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {hoursOp.hoursTriggerPct}% toward next PM at {pm?.nextDueHours?.toLocaleString("en-IN")} hrs
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs text-muted-foreground">Average session length</p>
                    <p className="text-2xl font-semibold">
                      {hoursOp.avgSessionSeconds != null ? formatDuration(hoursOp.avgSessionSeconds) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Over the same window</p>
                  </div>
                </CardContent>
              </Card>
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

            <Separator className="my-1" />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Certifications & insurance</p>
                <CertificationsDialog documents={certifications} autoOpen={certModalOpen} />
              </div>
              {certifications.length > 0 ? (
                certifications.map((doc) => {
                  const { status, offsetDays } = expiryStatus(doc.expiryDate);
                  return (
                    <Card key={doc.id}>
                      <CardContent className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{doc.label ?? doc.fileName}</p>
                          <Badge variant="outline">{doc.type === "CERTIFICATION" ? "Certification" : "Insurance"}</Badge>
                        </div>
                        <p
                          className={
                            status === "EXPIRED"
                              ? "text-sm text-red-600"
                              : status === "EXPIRING"
                                ? "text-sm text-amber-700"
                                : "text-sm text-muted-foreground"
                          }
                        >
                          Expires {formatDate(doc.expiryDate)} ·{" "}
                          {status === "EXPIRED" ? `Expired ${Math.abs(offsetDays)} days ago` : `expires in ${offsetDays} days`}
                        </p>
                        <a href={`#doc-${doc.id}`} className="text-xs text-primary hover:underline">
                          {doc.fileName}
                        </a>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No certifications or insurance documents on file.</p>
              )}
            </div>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="space-y-3 pt-4">
            {activity.length > 0 ? (
              activity.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between gap-4">
                    <p className="text-sm">{a.summary}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.occurredAt)}</span>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function EquipmentProfilePage() {
  return (
    <Suspense fallback={null}>
      <EquipmentProfileContent />
    </Suspense>
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
