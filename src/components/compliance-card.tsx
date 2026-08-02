import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ComplianceSubMetric {
  label: string;
  value: string;
  pct: number;
}

export interface ComplianceCardProps {
  headline: string;
  pct: number;
  fraction: string;
  totalLabel: string;
  metrics: ComplianceSubMetric[];
}

export function ComplianceCard({ headline, pct, fraction, totalLabel, metrics }: ComplianceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div>
          <p className="text-sm text-muted-foreground">{headline}</p>
          <p className="text-3xl font-semibold">{pct}%</p>
          <Progress value={pct} className="mt-3 h-2" indicatorClassName="bg-emerald-500" />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fraction}</span>
            <span>{totalLabel}</span>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-1 rounded-lg border border-border bg-neutral-100 p-3">
              <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              <span className="text-sm font-semibold tabular-nums">{m.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
