"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, Wrench, Receipt, WarningOctagon, Package } from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import {
  facility,
  useDemo,
  now,
  formatINR,
  formatDate,
  getEquipmentById,
  getUser,
  buildDepartmentSpend,
  buildBreakdownLeaderboard,
  buildTopSpendEquipment,
  type DepartmentSpend,
} from "@/lib/bems";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SummaryCard } from "@/components/summary-card";

const WINDOW_MS = 365 * 24 * 3600_000;

function DepartmentTable({ items, onSelect }: { items: DepartmentSpend[]; onSelect: (d: DepartmentSpend) => void }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Total spend</TableHead>
            <TableHead>Repair (12m)</TableHead>
            <TableHead>Breakdowns (12m)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((d) => (
            <TableRow key={d.departmentId} className="cursor-pointer" onClick={() => onSelect(d)}>
              <TableCell className="font-medium">{d.departmentName}</TableCell>
              <TableCell className="text-muted-foreground">{d.equipmentCount}</TableCell>
              <TableCell className="font-medium">{formatINR(d.totalSpend)}</TableCell>
              <TableCell className="text-muted-foreground">{formatINR(d.repairCost12m)}</TableCell>
              <TableCell className="text-muted-foreground">{d.breakdownCount12m}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function SpendPage() {
  const equipmentList = useDemo((s) => s.equipment);
  const ticketsList = useDemo((s) => s.tickets);
  const workOrdersList = useDemo((s) => s.workOrders);

  const [selectedDept, setSelectedDept] = useState<DepartmentSpend | null>(null);

  const departmentSpend = useMemo(
    () => buildDepartmentSpend(equipmentList, ticketsList, workOrdersList),
    [equipmentList, ticketsList, workOrdersList]
  );
  const breakdownLeaders = useMemo(
    () => buildBreakdownLeaderboard(equipmentList, ticketsList, workOrdersList),
    [equipmentList, ticketsList, workOrdersList]
  );
  const topSpend = useMemo(() => buildTopSpendEquipment(equipmentList), [equipmentList]);

  const windowStart = useMemo(() => new Date(now().getTime() - WINDOW_MS).toISOString(), []);

  const totalSpend = departmentSpend.reduce((sum, d) => sum + d.totalSpend, 0);
  const repairSpend12m = departmentSpend.reduce((sum, d) => sum + d.repairCost12m, 0);
  const contractSpend = departmentSpend.reduce((sum, d) => sum + d.contractCost, 0);
  const breakdowns12m = departmentSpend.reduce((sum, d) => sum + d.breakdownCount12m, 0);

  const repairOrders12mCount = workOrdersList.filter((w) => w.startedAt >= windowStart).length;
  const equipmentWithBreakdowns12m = new Set(
    ticketsList.filter((t) => t.source === "SCAN_BREAKDOWN" && t.openedAt >= windowStart).map((t) => t.equipmentId)
  ).size;
  const departmentsWithContractCost = departmentSpend.filter((d) => d.contractCost > 0).length;

  const statCards = [
    {
      key: "total",
      title: "Total spend",
      value: formatINR(totalSpend),
      icon: Wallet,
      iconColor: "teal" as const,
      footerLeadText: String(equipmentList.length),
      footerText: "equipment — lifetime purchase, contracts & repairs",
    },
    {
      key: "repair",
      title: "Repair spend",
      value: formatINR(repairSpend12m),
      icon: Wrench,
      iconColor: "indigo" as const,
      footerLeadText: String(repairOrders12mCount),
      footerText: "work orders in the last 12 months",
    },
    {
      key: "contract",
      title: "Contract spend",
      value: formatINR(contractSpend),
      icon: Receipt,
      iconColor: "blue" as const,
      footerLeadText: String(departmentsWithContractCost),
      footerText: "departments carry an AMC/CMC/warranty cost",
    },
    {
      key: "breakdowns",
      title: "Breakdowns",
      value: String(breakdowns12m),
      icon: WarningOctagon,
      iconColor: "fuchsia" as const,
      footerLeadText: String(equipmentWithBreakdowns12m),
      footerText: "equipment flagged down in the last 12 months",
    },
  ];

  const deptBreakdownTickets = selectedDept
    ? ticketsList
        .filter((t) => {
          const eq = getEquipmentById(t.equipmentId);
          return eq?.departmentId === selectedDept.departmentId && t.source === "SCAN_BREAKDOWN";
        })
        .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
        .slice(0, 5)
    : [];

  const deptTopEquipment = selectedDept
    ? buildTopSpendEquipment(
        equipmentList.filter((e) => e.departmentId === selectedDept.departmentId),
        5
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Spend Tracker</h1>
        <p className="text-muted-foreground text-sm">
          Biomedical spend across {facility.name} — what each department costs to keep running, and what&apos;s
          driving it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <SummaryCard
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            footerLeadText={card.footerLeadText}
            footerText={card.footerText}
            showChevron={false}
          />
        ))}
      </div>

      <Card className="overflow-hidden p-0 gap-0">
        <CardHeader className="gap-0 px-4 pt-3 pb-2">
          <CardTitle>Spend by department</CardTitle>
          <CardDescription>Lifetime cost of ownership, grouped by who&apos;s running the equipment — click a row for the breakdown</CardDescription>
        </CardHeader>
        <div className="px-4 pt-2 pb-3">
          <DepartmentTable items={departmentSpend} onSelect={setSelectedDept} />
        </div>
      </Card>

      <Card className="overflow-hidden p-0 gap-0">
        <CardHeader className="gap-0 px-4 pt-3 pb-2">
          <CardTitle>Repeat breakdowns</CardTitle>
          <CardDescription>Equipment flagged down most often in the last 12 months, with who&apos;s responsible for it</CardDescription>
        </CardHeader>
        {breakdownLeaders.length > 0 ? (
          <div className="px-4 pt-2 pb-3">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Breakdowns (12m)</TableHead>
                    <TableHead>Repair spend (12m)</TableHead>
                    <TableHead>Last breakdown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdownLeaders.map((r) => (
                    <TableRow key={r.equipmentId}>
                      <TableCell className="font-medium">
                        <Link href={`/equipment/${r.equipmentId}`} className="hover:underline">
                          {r.equipmentDisplayName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.departmentName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.responsibleName}</TableCell>
                      <TableCell className="font-medium">{r.breakdownCount12m}</TableCell>
                      <TableCell className="text-muted-foreground">{formatINR(r.repairCost12m)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.lastBreakdownAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState icon={Wrench} message="No equipment has been flagged down in the last 12 months." />
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0 gap-0">
        <CardHeader className="gap-0 px-4 pt-3 pb-2">
          <CardTitle>Top spend</CardTitle>
          <CardDescription>Highest lifetime cost of ownership, facility-wide</CardDescription>
        </CardHeader>
        <div className="px-4 pt-2 pb-3">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Total spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSpend.map((r) => (
                  <TableRow key={r.equipmentId}>
                    <TableCell className="font-medium">
                      <Link href={`/equipment/${r.equipmentId}`} className="hover:underline">
                        {r.equipmentDisplayName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.departmentName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.responsibleName}</TableCell>
                    <TableCell className="font-medium">{formatINR(r.totalSpend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <Sheet open={!!selectedDept} onOpenChange={(open) => !open && setSelectedDept(null)}>
        <SheetContent className="w-full sm:max-w-120">
          {selectedDept && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle>{selectedDept.departmentName}</SheetTitle>
                <SheetDescription>
                  {selectedDept.equipmentCount} equipment · {selectedDept.breakdownCount12m} breakdowns in the last 12 months
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Purchase cost</p>
                    <p className="text-sm">{formatINR(selectedDept.purchaseCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contract cost</p>
                    <p className="text-sm">{formatINR(selectedDept.contractCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Repair cost (lifetime)</p>
                    <p className="text-sm">{formatINR(selectedDept.repairCostLifetime)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total spend</p>
                    <p className="text-sm font-medium">{formatINR(selectedDept.totalSpend)}</p>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Top equipment by spend</p>
                  {deptTopEquipment.length > 0 ? (
                    <div className="space-y-1.5">
                      {deptTopEquipment.map((r) => (
                        <div key={r.equipmentId} className="flex items-center justify-between gap-2 text-sm">
                          <Link href={`/equipment/${r.equipmentId}`} className="truncate hover:underline">
                            {r.equipmentDisplayName}
                          </Link>
                          <span className="shrink-0 text-muted-foreground">{formatINR(r.totalSpend)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Package} message="No equipment on record for this department." />
                  )}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Recent breakdowns</p>
                  {deptBreakdownTickets.length > 0 ? (
                    <div className="space-y-2">
                      {deptBreakdownTickets.map((t) => {
                        const eq = getEquipmentById(t.equipmentId);
                        const raisedBy = getUser(t.raisedByUserId);
                        return (
                          <div key={t.id} className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <Link href={`/equipment/${t.equipmentId}`} className="truncate font-medium hover:underline">
                                {eq ? eq.assetId : "Unknown equipment"}
                              </Link>
                              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(t.openedAt)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t.issueType} — reported by {raisedBy?.name ?? "Unknown"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={Wrench} message="No breakdowns reported for this department." />
                  )}
                </div>
              </div>
              <SheetFooter className="border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/equipment">View equipment</Link>
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
