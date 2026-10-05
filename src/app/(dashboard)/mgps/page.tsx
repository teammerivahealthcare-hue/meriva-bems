"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  ArrowsLeftRight,
  BellSimple,
  CaretDown,
  CheckCircle,
  ClipboardText,
  ClockCounterClockwise,
  Buildings,
  Cylinder,
  Factory,
  SquaresFour,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  NO_CYLINDER_FILTER,
  getUser,
  inService,
  reasonOf,
  mgpsToday,
  type CylinderFilter,
  type PipedGasId,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdatedAgoLabel } from "@/hooks/use-updated-ago";
import { cn } from "@/lib/utils";
import { Pill, useMgps, type MgpsData } from "@/components/mgps/mgps-shared";
import { OverviewTab, type MgpsTab } from "@/components/mgps/overview-tab";
import { SourcesTab } from "@/components/mgps/sources-tab";
import { ZonesTab } from "@/components/mgps/zones-tab";
import { CylindersTab } from "@/components/mgps/cylinders-tab";
import { DepartmentsTab } from "@/components/mgps/departments-tab";
import { MovementsTab } from "@/components/mgps/movements-tab";
import { TestsTab } from "@/components/mgps/tests-tab";
import { HistoryTab } from "@/components/mgps/history-tab";
import {
  CylinderActionDialog,
  type CylinderActionRequest,
} from "@/components/mgps/cylinder-action-dialog";
import { CylinderDrawer } from "@/components/mgps/cylinder-drawer";
import { LogReadingDialog } from "@/components/mgps/log-reading-dialog";

const TABS: { value: MgpsTab; label: string; icon: Icon }[] = [
  { value: "overview", label: "Overview", icon: SquaresFour },
  { value: "sources", label: "Sources", icon: Factory },
  { value: "zones", label: "Zones & alarms", icon: BellSimple },
  { value: "cylinders", label: "Cylinders", icon: Cylinder },
  { value: "departments", label: "Departments", icon: Buildings },
  { value: "movements", label: "Movements", icon: ArrowsLeftRight },
  { value: "tests", label: "Tests", icon: ClipboardText },
  { value: "history", label: "History", icon: ClockCounterClockwise },
];

// ─────────────────────────────────────────────────────────────
// Export — CSV downloads, built in the browser.
// ─────────────────────────────────────────────────────────────

function downloadCsv(
  name: string,
  header: string[],
  rows: (string | number)[][],
) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${name}-${mgpsToday()}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORTS: { label: string; run: (data: MgpsData) => void }[] = [
  {
    label: "Cylinder register",
    run: (d) =>
      downloadCsv(
        "mgps-cylinders",
        [
          "Cylinder no.",
          "Gas",
          "Size",
          "Serial number",
          "Location",
          "Group",
          "Why it is there",
          "Status",
          "Fill",
          "Hydro test due",
          "Expected return",
        ],
        d.cylinders.map((c) => [
          c.id,
          c.gas,
          c.size,
          c.serialNumber,
          d.label(c.location),
          inService(c) ? "In service" : "Not in service",
          reasonOf(c),
          c.status,
          c.fill,
          c.hydroTestDue,
          c.away?.expectedReturn ?? "",
        ]),
      ),
  },
  {
    label: "Zone readings",
    run: (d) =>
      downloadCsv(
        "mgps-zone-readings",
        ["Zone", "Gas", "Value", "Unit", "Logged at", "Logged by"],
        d.zones.flatMap((z) =>
          Object.values(z.readings).map((r) => [
            z.zone.name,
            r!.gasId,
            r!.value,
            r!.gasId === "vac" ? "mmHg" : "bar",
            r!.loggedAt,
            getUser(r!.loggedByUserId)?.name ?? "",
          ]),
        ),
      ),
  },
  {
    label: "Movement log",
    run: (d) =>
      downloadCsv(
        "mgps-cylinder-movements",
        ["When", "Cylinder no.", "Type", "From", "To", "Done by", "Remarks"],
        d.movements.map((m) => [
          m.at,
          m.cylinderId,
          m.kind,
          d.label(m.from),
          d.label(m.to),
          getUser(m.byUserId)?.name ?? "",
          m.note ?? "",
        ]),
      ),
  },
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function isTab(value: string | null): value is MgpsTab {
  return TABS.some((t) => t.value === value);
}

function MgpsContent() {
  const searchParams = useSearchParams();
  const data = useMgps();
  const updatedAgo = useUpdatedAgoLabel();

  const [tab, setTab] = useState<MgpsTab>(() => {
    const t = searchParams.get("tab");
    return isTab(t) ? t : "overview";
  });
  const [gasId, setGasId] = useState<PipedGasId>("o2");
  // Register filters live up here so other tabs can open the register already filtered.
  const [cylinderFilter, setCylinderFilter] =
    useState<CylinderFilter>(NO_CYLINDER_FILTER);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ id: string | null; open: boolean }>({
    id: null,
    open: false,
  });
  const [action, setAction] = useState<{
    request: CylinderActionRequest | null;
    key: number;
  }>({ request: null, key: 0 });
  const [logging, setLogging] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function notify(message: string) {
    setToast((t) => ({ id: (t?.id ?? 0) + 1, message }));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const openCylinder = (id: string) => setDrawer({ id, open: true });
  const ask = (request: CylinderActionRequest) =>
    setAction((a) => ({ request, key: a.key + 1 }));
  const filterCylinders = (patch: Partial<CylinderFilter>) => {
    setCylinderFilter({ ...NO_CYLINDER_FILTER, ...patch });
    setTab("cylinders");
  };

  const badge = (t: MgpsTab) =>
    t === "zones"
      ? data.activeAlarms
      : t === "movements"
        ? data.overdueReturns
        : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">MGPS</h1>
            <Pill
              tone={data.status.attention ? "warn" : "good"}
              className="h-6 px-3"
            >
              {data.status.attention ? "Attention required" : "Normal"}
            </Pill>
            {data.status.attention && (
              <span className="text-sm text-muted-foreground">
                {data.status.reasons.join(" · ")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Medical gas pipeline system · {updatedAgo}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="px-4" onClick={() => setLogging(true)}>
            Log reading
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-surface px-4">
                Export data <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {EXPORTS.map((e) => (
                <DropdownMenuItem
                  key={e.label}
                  onSelect={() => {
                    e.run(data);
                    notify(`${e.label} exported`);
                  }}
                >
                  {e.label} (CSV)
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Gas switcher: one card per piped service; it drives the Overview tab. */}
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        role="group"
        aria-label="Gas service"
      >
        {data.gases.map((g) => {
          const on = g.gasId === gasId;
          return (
            <button
              key={g.gasId}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setGasId(g.gasId);
                setTab("overview");
              }}
              className={cn(
                "min-w-0 rounded-xl border bg-surface p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                on
                  ? "border-primary ring-1 ring-primary"
                  : "hover:border-foreground/30",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{g.name}</span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {g.short}
                </span>
              </span>
              <span className="mt-2 block text-2xl font-semibold tabular-nums">
                {g.unit === "bar" ? g.supplyValue.toFixed(1) : g.supplyValue}{" "}
                <span className="text-base font-medium text-muted-foreground">
                  {g.unit}
                </span>
              </span>
              <span
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  g.ok ? "text-emerald-700" : "text-red-600",
                )}
              >
                {g.ok ? <CheckCircle size={14} /> : <WarningCircle size={14} />}
                <span className="truncate">
                  {g.stateLabel} · {g.zonesPiped} zone
                  {g.zonesPiped === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as MgpsTab)}>
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList
            variant="line"
            className="min-w-max gap-2 group-data-horizontal/tabs:h-11"
          >
            {TABS.map((t) => {
              const n = badge(t.value);
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="gap-2 px-3"
                >
                  <t.icon size={16} /> {t.label}
                  {n > 0 && (
                    <span
                      className="rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white tabular-nums"
                      aria-label={`${n} need attention`}
                    >
                      {n}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="pt-4">
          <OverviewTab
            data={data}
            gasId={gasId}
            onGoTo={setTab}
            onPickDepartment={(id) => {
              setDepartmentId(id);
              setTab("departments");
            }}
            onFilterCylinders={filterCylinders}
          />
        </TabsContent>
        <TabsContent value="sources" className="pt-4">
          <SourcesTab data={data} onOpenCylinder={openCylinder} />
        </TabsContent>
        <TabsContent value="zones" className="pt-4">
          <ZonesTab data={data} />
        </TabsContent>
        <TabsContent value="cylinders" className="pt-4">
          <CylindersTab
            data={data}
            filter={cylinderFilter}
            onFilterChange={setCylinderFilter}
            onOpenCylinder={openCylinder}
            onRegister={() => ask({ kind: "register" })}
          />
        </TabsContent>
        <TabsContent value="departments" className="pt-4">
          <DepartmentsTab
            data={data}
            selectedId={departmentId}
            onSelect={setDepartmentId}
            onOpenCylinder={openCylinder}
            onAction={ask}
            onToast={notify}
          />
        </TabsContent>
        <TabsContent value="movements" className="pt-4">
          <MovementsTab
            data={data}
            onOpenCylinder={openCylinder}
            onAction={ask}
          />
        </TabsContent>
        <TabsContent value="tests" className="pt-4">
          <TestsTab data={data} onToast={notify} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab data={data} />
        </TabsContent>
      </Tabs>

      <CylinderDrawer
        cylinderId={drawer.id}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        onAction={ask}
        onToast={notify}
      />
      <CylinderActionDialog
        request={action.request}
        requestKey={action.key}
        onClose={() => setAction((a) => ({ ...a, request: null }))}
        onDone={(message) => {
          setAction((a) => ({ ...a, request: null }));
          notify(message);
        }}
      />
      <LogReadingDialog
        open={logging}
        initialGas={gasId}
        onOpenChange={setLogging}
        onSaved={notify}
      />

      {/* Portalled so it isn't hidden from screen readers while a dialog or drawer is open. */}
      {toast &&
        createPortal(
          <div
            key={toast.id}
            role="status"
            className="fixed right-4 bottom-4 z-[60] flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-lg animate-in fade-in-0 slide-in-from-bottom-2"
          >
            <CheckCircle size={16} /> {toast.message}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function MgpsPage() {
  return (
    <Suspense fallback={null}>
      <MgpsContent />
    </Suspense>
  );
}
