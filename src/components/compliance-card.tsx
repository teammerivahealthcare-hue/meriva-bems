import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ComplianceSubMetric {
  label: string;
  fraction: string;
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
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{headline}</p>
            <p className="text-3xl font-semibold">{pct}%</p>
            <Progress value={pct} className="mt-3 h-2" indicatorClassName="bg-emerald-500" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{fraction}</span>
              <span>{totalLabel}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:w-56 sm:shrink-0">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-medium tabular-nums">{m.fraction}</span>
                </div>
                <Progress value={m.pct} className="mt-2 h-1.5" indicatorClassName="bg-emerald-500" />
                <p className="mt-1 text-right text-xs text-muted-foreground">{m.pct}%</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
