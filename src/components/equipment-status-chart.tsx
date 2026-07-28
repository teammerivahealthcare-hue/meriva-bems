"use client";

import { Label, Pie, PieChart } from "recharts";
import { ChartContainer, type ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_DOT_CLASS,
  type EquipmentStatusKey,
} from "@/lib/bems";

export type { EquipmentStatusKey };

export interface EquipmentStatusDatum {
  key: EquipmentStatusKey;
  value: number;
}

// Raw hex values for Recharts fills — same hues as EQUIPMENT_STATUS_DOT_CLASS's
// Tailwind classes (emerald/amber/sky/red/zinc-500), kept in sync by hand since
// chart fills need actual color values, not utility classes.
const chartConfig: ChartConfig = {
  operational: { label: EQUIPMENT_STATUS_LABEL.operational, color: "#10b981" },
  attention: { label: EQUIPMENT_STATUS_LABEL.attention, color: "#f59e0b" },
  maintenance: { label: EQUIPMENT_STATUS_LABEL.maintenance, color: "#0ea5e9" },
  down: { label: EQUIPMENT_STATUS_LABEL.down, color: "#ef4444" },
  condemned: { label: EQUIPMENT_STATUS_LABEL.condemned, color: "#71717a" },
};

export function EquipmentStatusChart({ data }: { data: EquipmentStatusDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const chartData = data
    .filter((d) => d.value > 0)
    .map((d) => ({ ...d, fill: `var(--color-${d.key})` }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <ChartContainer config={chartConfig} className="aspect-square h-56 w-56 shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
          <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={55} outerRadius={80} strokeWidth={4}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                        {total}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                        Equipment
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="flex w-full flex-col gap-2 sm:w-auto">
        {data.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={`size-2 shrink-0 rounded-full ${EQUIPMENT_STATUS_DOT_CLASS[d.key]}`} />
              {EQUIPMENT_STATUS_LABEL[d.key]}
            </span>
            <span className="font-medium tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
