"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, CheckCircle } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";
import {
  pipedGas,
  readingState,
  formatReading,
  formatRange,
  gaugePct,
  gaugeTicks,
  supplyTrend,
  manifoldBanks,
  inDepartment,
  EQUIPMENT_STATUS_BADGE_CLASS,
  EQUIPMENT_STATUS_LABEL,
  type CylinderFilter,
  type MgpsZoneView,
  type PipedGasId,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { PlacementSplit } from "./cylinder-placement";
import { ZoneRoomsDialog } from "./zones-tab";
import {
  Pill,
  SectionCard,
  TextButton,
  HISTORY_TONE,
  PART_COLOR,
  TEST_STATE_TONE,
  formatDateTime,
  formatDay,
  type MgpsData,
} from "./mgps-shared";

export type MgpsTab = "overview" | "sources" | "zones" | "cylinders" | "departments" | "movements" | "tests" | "history";

const RECENT_LIMIT = 4;

function StatCard({ label, value, chip, action }: { label: string; value: string; chip?: string; action?: React.ReactNode }) {
  return (
    <Card className="gap-1.5 px-5 py-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {chip && (
          <Badge variant="outline" className="h-5 border-transparent bg-blue-50 px-2 text-blue-900">
            {chip}
          </Badge>
        )}
        {action}
      </div>
    </Card>
  );
}

function signed(n: number, unit: string): string {
  if (n === 0) return "No change in last 24 hours";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)} ${unit} in last 24 hours`;
}

function ZoneTile({ view, gasId, onOpen }: { view: MgpsZoneView; gasId: PipedGasId; onOpen: () => void }) {
  const gas = pipedGas(gasId);
  const reading = view.readings[gasId];
  const state = view.status === "Fault reported" ? "Fault reported" : reading ? readingState(reading.value, gas.range) : "No reading";
  const ok = state === "Normal";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${view.zone.name}: ${state}${reading ? `, ${formatReading(reading.value, gas)}` : ""}. View rooms`}
      className="flex flex-col gap-3 rounded-lg bg-muted p-5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <p className="flex flex-wrap items-center gap-2.5 text-sm font-medium">
        {view.zone.name}
        <span className={ok ? "text-emerald-700" : "text-red-600"}>{state}</span>
      </p>
      <p className="text-2xl font-semibold tabular-nums">{reading ? formatReading(reading.value, gas) : "—"}</p>
      <Progress
        value={reading ? gaugePct(reading.value, gas.range) : 0}
        className="h-2 bg-border"
        indicatorClassName={cn("rounded-full", ok ? "bg-emerald-600" : "bg-red-500")}
      />
    </button>
  );
}

const trendConfig: ChartConfig = { value: { label: "Supply", color: PART_COLOR.inUse } };
const distributionConfig: ChartConfig = {
  active: { label: "In use or standing by", color: PART_COLOR.inUse },
  empty: { label: "Empty, awaiting pickup", color: PART_COLOR.empty },
};

export function OverviewTab({
  data,
  gasId,
  onGoTo,
  onPickDepartment,
  onFilterCylinders,
}: {
  data: MgpsData;
  gasId: PipedGasId;
  onGoTo: (tab: MgpsTab) => void;
  onPickDepartment: (departmentId: string) => void;
  onFilterCylinders: (filter: Partial<CylinderFilter>) => void;
}) {
  const [openZone, setOpenZone] = useState<MgpsZoneView | null>(null);
  const { cylinders } = data;
  const gas = pipedGas(gasId);
  const src = data.sources.find((s) => s.source.gasId === gasId)!;
  const { source } = src;
  const banks = src.equipment ? manifoldBanks(source, src.equipment.departmentId, cylinders) : null;
  const axis = gaugeTicks(gas);
  const trend = supplyTrend(gasId);

  const attention = [
    ...data.testRows
      .filter((t) => t.state !== "Up to date")
      .map((t) => ({ key: t.test.id, title: t.test.name, detail: `Due ${formatDay(t.due)} · ${t.test.scope}`, level: t.state, onClick: () => onGoTo("tests") })),
    ...data.alerts.map((a) => ({
      key: a.key, title: a.title, detail: a.detail, level: a.level,
      onClick: () => (a.filter ? onFilterCylinders(a.filter) : onGoTo("cylinders")),
    })),
  ];

  const distribution = data.departments
    .map((d) => {
      const list = cylinders.filter((c) => inDepartment(c, d.id) && c.status !== "Damaged");
      const empty = list.filter((c) => c.fill === "Empty").length;
      return { id: d.id, name: d.name, active: list.length - empty, empty, total: list.length };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{src.name}</h2>
            {src.statusKey && (
              <Badge variant="outline" className={cn("h-6 px-3", EQUIPMENT_STATUS_BADGE_CLASS[src.statusKey])}>
                {EQUIPMENT_STATUS_LABEL[src.statusKey]}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {src.location} · {source.type}
          </p>
        </div>
        {src.equipment && (
          <Link href={`/equipment/${src.equipment.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            View equipment record <ArrowSquareOut size={14} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={gasId === "vac" ? "Plant vacuum" : "Supply pressure"}
          value={formatReading(source.supplyValue, gas)}
          chip={signed(source.supplyChange24h, gas.unit)}
        />
        <StatCard
          label={banks ? `Duty bank: ${banks.duty.length} cylinder${banks.duty.length === 1 ? "" : "s"} in use` : `Duty: ${source.dutyUnit}`}
          value={`${source.dutyLevelPct}%`}
          chip={banks ? `Reserve ${banks.reserve.length} full · ${source.changeover.toLowerCase()} changeover` : `Reserve ${source.reserveLevelPct}% · ${source.changeover.toLowerCase()} changeover`}
        />
        <StatCard
          label="Active alarms"
          value={String(data.activeAlarms)}
          action={data.activeAlarms > 0 ? <TextButton onClick={() => onGoTo("zones")}>Review</TextButton> : undefined}
        />
      </div>

      <SectionCard title="Department pressure" action={<TextButton onClick={() => onGoTo("zones")}>All zones</TextButton>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.zones
            .filter((z) => z.zone.gases.includes(gasId))
            .map((z) => (
              <ZoneTile key={z.zone.id} view={z} gasId={gasId} onOpen={() => setOpenZone(z)} />
            ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title={`${gas.name} supply: last 24 hours`}
          className="lg:col-span-2"
          action={
            <span className="text-xs text-muted-foreground">
              Shaded band = normal range {formatRange(gas)}
            </span>
          }
        >
          <ChartContainer config={trendConfig} className="aspect-auto h-52 w-full">
            <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} interval={1} tickMargin={8} />
              <YAxis
                domain={axis.domain}
                ticks={axis.ticks}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => (gas.unit === "bar" ? v.toFixed(1) : String(Math.round(v)))}
              />
              <ReferenceArea y1={gas.range[0]} y2={gas.range[1]} fill="#059669" fillOpacity={0.08} ifOverflow="extendDomain" />
              <ChartTooltip
                cursor={{ strokeWidth: 1 }}
                content={<ChartTooltipContent indicator="line" formatter={(v) => formatReading(Number(v), gas)} />}
              />
              <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title="Needs attention" action={<span className="text-xs text-muted-foreground">{attention.length} items</span>}>
          {attention.length > 0 ? (
            <ul className="-mx-2 max-h-56 space-y-1 overflow-y-auto">
              {attention.map((a) => (
                <li key={a.key}>
                  <button
                    type="button"
                    onClick={a.onClick}
                    className="flex w-full items-start justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{a.title}</span>
                      <span className="block text-xs text-muted-foreground">{a.detail}</span>
                    </span>
                    <Pill tone={TEST_STATE_TONE[a.level]}>{a.level}</Pill>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle size={16} className="text-emerald-600" /> Tests and cylinder stock are on track.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <SectionCard
          title="Department-wise distribution"
          className="xl:col-span-3"
          action={<span className="text-xs text-muted-foreground">Cylinders placed in each department. Select a bar to open it.</span>}
        >
          <ChartContainer
            config={distributionConfig}
            className="aspect-auto w-full [&_.recharts-bar-rectangle]:cursor-pointer"
            style={{ height: distribution.length * 40 + 64 }}
          >
            <BarChart
              data={distribution}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              onClick={(e) => {
                const i = Number(e?.activeTooltipIndex);
                if (Number.isInteger(i) && distribution[i]) onPickDepartment(distribution[i].id);
              }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={136}
                tickLine={false}
                axisLine={false}
                tickFormatter={(name: string) => `${name}  ${distribution.find((d) => d.name === name)?.total ?? ""}`}
              />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="active" stackId="dept" fill="var(--color-active)" maxBarSize={22} stroke="var(--card)" strokeWidth={2} />
              <Bar dataKey="empty" stackId="dept" fill="var(--color-empty)" maxBarSize={22} radius={[0, 4, 4, 0]} stroke="var(--card)" strokeWidth={2} />
            </BarChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title="Where the cylinders are" className="xl:col-span-2" action={<TextButton onClick={() => onGoTo("cylinders")}>Open register</TextButton>}>
          <PlacementSplit cylinders={cylinders} onPick={onFilterCylinders} />
        </SectionCard>
      </div>

      <SectionCard title="Recent activity" action={<TextButton onClick={() => onGoTo("history")}>View all</TextButton>}>
        <ul className="divide-y">
          {data.history.slice(0, RECENT_LIMIT).map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Pill tone={HISTORY_TONE[h.kind]} className="w-24 justify-center">
                {h.kind}
              </Pill>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{h.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(h.at)} · {h.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <ZoneRoomsDialog zone={openZone} onOpenChange={(open) => !open && setOpenZone(null)} />
    </div>
  );
}
