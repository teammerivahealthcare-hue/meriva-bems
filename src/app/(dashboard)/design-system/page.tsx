"use client";

import { useEffect, useRef, useState } from "react";
import { Stack, Bell, ShieldCheck } from "@phosphor-icons/react";
import {
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_BADGE_CLASS,
  CRITICALITY_LABEL,
  CRITICALITY_BADGE_CLASS,
  FLAG_LABEL,
  FLAG_TAG_CLASS,
  type EquipmentStatusKey,
  type EquipmentFlag,
  type Criticality,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCard } from "@/components/summary-card";
import { ComplianceCard } from "@/components/compliance-card";

// ─────────────────────────────────────────────────────────────
// Small reference-only building blocks for this page. Everything
// below reads its values from the real tokens/components — change
// tokens.css, ui/*, or derive.ts and this page updates with it.
// ─────────────────────────────────────────────────────────────

function ColorSwatch({ name, cssVar, usage }: { name: string; cssVar: string; usage: string }) {
  const resolvedRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    if (resolvedRef.current) resolvedRef.current.textContent = resolved ? ` · ${resolved}` : "";
  }, [cssVar]);

  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 shrink-0 rounded-lg border border-border"
        style={{ background: `var(${cssVar})` }}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{usage}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {cssVar}
          <span ref={resolvedRef} />
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

const TYPE_SCALE = [
  { name: "Page title", varName: "--text-page-title", weightVar: "--font-weight-page-title", sample: "Equipment" },
  { name: "Section header", varName: "--text-section-header", weightVar: "--font-weight-section-header", sample: "Fleet status" },
  { name: "Body", varName: "--text-body", weightVar: "--font-weight-body", sample: "9 of 16 equipment records" },
  { name: "Label", varName: "--text-label", weightVar: "--font-weight-label", sample: "TOTAL EQUIPMENT" },
  { name: "Caption", varName: "--text-caption", weightVar: "--font-weight-caption", sample: "Expires in 34 days" },
];

const SPACING_SCALE = [
  { name: "space-1", varName: "--space-1", px: "4px" },
  { name: "space-2", varName: "--space-2", px: "8px" },
  { name: "space-3", varName: "--space-3", px: "12px" },
  { name: "space-4", varName: "--space-4", px: "16px" },
  { name: "space-6", varName: "--space-6", px: "24px" },
];

const RADIUS_SCALE = [
  { name: "rounded-sm", className: "rounded-sm" },
  { name: "rounded-md", className: "rounded-md" },
  { name: "rounded-lg", className: "rounded-lg" },
  { name: "rounded-xl", className: "rounded-xl" },
  { name: "rounded-2xl", className: "rounded-2xl" },
  { name: "rounded-card", className: "rounded-card" },
];

const BUTTON_VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;

export default function DesignSystemPage() {
  const [checkboxOn, setCheckboxOn] = useState(true);
  const [switchOn, setSwitchOn] = useState(true);
  const [radioValue, setRadioValue] = useState("b");

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Design system</h1>
        <p className="text-sm text-muted-foreground">
          The single reference for color, type, spacing, and shared components. Change{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">src/styles/tokens.css</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">src/lib/bems/derive.ts</code>, or a
          component under <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">src/components/ui</code>{" "}
          and every screen that uses it — including this page — picks it up automatically.
        </p>
      </div>

      <Tabs defaultValue="colors">
        <TabsList variant="line">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="type">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing &amp; radius</TabsTrigger>
          <TabsTrigger value="buttons">Buttons</TabsTrigger>
          <TabsTrigger value="badges">Badges &amp; status</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        {/* Colors */}
        <TabsContent value="colors" className="space-y-4 pt-4">
          <SectionCard title="Surfaces & borders" description="src/styles/tokens.css">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorSwatch name="Canvas" cssVar="--color-bg-canvas" usage="Page background — bg-bg-canvas" />
              <ColorSwatch name="Surface" cssVar="--color-surface" usage="Cards, tables, sidebar — bg-surface" />
              <ColorSwatch name="Border" cssVar="--border" usage="Every border in the app — border-border" />
            </div>
          </SectionCard>

          <SectionCard title="Text" description="src/styles/tokens.css">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorSwatch name="Primary text" cssVar="--color-text-primary" usage="text-text-primary" />
              <ColorSwatch name="Secondary text" cssVar="--color-text-secondary" usage="text-text-secondary" />
              <ColorSwatch name="Muted text" cssVar="--color-text-muted" usage="text-text-muted" />
            </div>
          </SectionCard>

          <SectionCard title="Brand & primary" description="Brand teal is logo-only; primary blue drives actions">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorSwatch name="Brand" cssVar="--color-brand" usage="Logo mark, sidebar icon only — bg-brand" />
              <ColorSwatch name="Primary" cssVar="--primary" usage="Buttons, links, active state — bg-primary" />
            </div>
          </SectionCard>

          <SectionCard title="Status" description="Reused everywhere: Dashboard, Equipment list, Equipment profile">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorSwatch name="Success" cssVar="--color-success" usage="Operational — bg-success / text-success" />
              <ColorSwatch name="Warning" cssVar="--color-warning" usage="Attention required — bg-warning / text-warning" />
              <ColorSwatch name="Accent" cssVar="--color-accent" usage="Under maintenance — bg-status-accent" />
              <ColorSwatch name="Danger" cssVar="--color-danger" usage="Out of service — bg-danger / text-danger" />
              <ColorSwatch name="Neutral" cssVar="--color-neutral" usage="Condemned — bg-neutral / text-neutral" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* Typography */}
        <TabsContent value="type" className="pt-4">
          <SectionCard title="Type scale" description="Inter, loaded project-wide — src/styles/tokens.css">
            <div className="divide-y">
              {TYPE_SCALE.map((t) => (
                <div key={t.name} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0">
                  <p style={{ fontSize: `var(${t.varName})`, fontWeight: `var(${t.weightVar})` as unknown as number }}>
                    {t.sample}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {t.varName} · {t.weightVar}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Spacing & radius */}
        <TabsContent value="spacing" className="space-y-4 pt-4">
          <SectionCard title="Spacing scale" description="Matches Tailwind's p-1…p-6 steps — src/styles/tokens.css">
            <div className="space-y-3">
              {SPACING_SCALE.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="h-4 rounded bg-primary/70" style={{ width: `var(${s.varName})` }} />
                  <p className="font-mono text-xs text-muted-foreground">
                    {s.varName} · {s.px}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Radius scale" description="globals.css @theme block + --radius-card">
            <div className="flex flex-wrap gap-4">
              {RADIUS_SCALE.map((r) => (
                <div key={r.name} className="flex flex-col items-center gap-1.5">
                  <div className={`size-14 border border-border bg-muted ${r.className}`} />
                  <p className="font-mono text-[11px] text-muted-foreground">{r.name}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Buttons */}
        <TabsContent value="buttons" className="space-y-4 pt-4">
          <SectionCard title="Variants" description="src/components/ui/button.tsx">
            <div className="flex flex-wrap gap-3">
              {BUTTON_VARIANTS.map((v) => (
                <Button key={v} variant={v}>
                  {v}
                </Button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Sizes" description="Text buttons and icon-only buttons">
            <div className="flex flex-wrap items-center gap-3">
              {BUTTON_SIZES.map((s) => (
                <Button key={s} size={s}>
                  Button
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="icon-xs" variant="outline">
                <Bell />
              </Button>
              <Button size="icon-sm" variant="outline">
                <Bell />
              </Button>
              <Button size="icon" variant="outline">
                <Bell />
              </Button>
              <Button size="icon-lg" variant="outline">
                <Bell />
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Badges & status */}
        <TabsContent value="badges" className="space-y-4 pt-4">
          <SectionCard title="Badge variants" description="src/components/ui/badge.tsx">
            <div className="flex flex-wrap gap-2">
              <Badge>default</Badge>
              <Badge variant="secondary">secondary</Badge>
              <Badge variant="destructive">destructive</Badge>
              <Badge variant="outline">outline</Badge>
              <Badge variant="ghost">ghost</Badge>
            </div>
          </SectionCard>

          <SectionCard title="Equipment status" description="EQUIPMENT_STATUS_BADGE_CLASS — src/lib/bems/derive.ts">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EQUIPMENT_STATUS_LABEL) as EquipmentStatusKey[]).map((key) => (
                <Badge key={key} variant="outline" className={EQUIPMENT_STATUS_BADGE_CLASS[key]}>
                  {EQUIPMENT_STATUS_LABEL[key]}
                </Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Criticality" description="CRITICALITY_BADGE_CLASS — src/lib/bems/derive.ts">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((key) => (
                <Badge key={key} variant="outline" className={CRITICALITY_BADGE_CLASS[key]}>
                  {CRITICALITY_LABEL[key]}
                </Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Equipment flags" description="FLAG_TAG_CLASS — src/lib/bems/derive.ts">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FLAG_LABEL) as EquipmentFlag[]).map((key) => (
                <Badge key={key} variant="outline" className={FLAG_TAG_CLASS[key]}>
                  {FLAG_LABEL[key]}
                </Badge>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Forms */}
        <TabsContent value="forms" className="space-y-4 pt-4">
          <SectionCard title="Text input" description="src/components/ui/input.tsx">
            <Input placeholder="Search equipment" className="max-w-xs" />
          </SectionCard>

          <SectionCard title="Select" description="src/components/ui/select.tsx">
            <Select defaultValue="rad">
              <SelectTrigger size="sm" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rad">Radiology</SelectItem>
                <SelectItem value="icu">ICU</SelectItem>
                <SelectItem value="er">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard title="Checkbox, switch & radio" description="Interactive — try them">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checkboxOn} onCheckedChange={(v) => setCheckboxOn(Boolean(v))} />
                Excel (.xlsx)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                In-app notifications
              </label>
              <RadioGroup value={radioValue} onValueChange={setRadioValue} className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="a" /> Export all
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="b" /> Export filtered
                </label>
              </RadioGroup>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Cards */}
        <TabsContent value="cards" className="space-y-4 pt-4">
          <SectionCard title="SummaryCard" description="src/components/summary-card.tsx — used on Dashboard and Equipment list">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard
                title="Total equipment"
                value="16"
                icon={Stack}
                changeValue="8/16"
                changeDirection="positive"
                footerLeadText="8"
                footerText="operational right now"
              />
              <SummaryCard
                title="Down now"
                value="1"
                icon={ShieldCheck}
                changeValue="1"
                changeDirection="negative"
                footerLeadText="1"
                footerText="unit needs repair"
              />
            </div>
          </SectionCard>

          <SectionCard title="Base Card" description="src/components/ui/card.tsx">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>Card description text</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card body content goes here.</p>
              </CardContent>
            </Card>
          </SectionCard>

          <SectionCard title="ComplianceCard" description="src/components/compliance-card.tsx">
            <ComplianceCard
              headline="PM on schedule"
              pct={81}
              fraction="13 on schedule"
              totalLabel="16 total"
              metrics={[
                { label: "Documentation completeness", value: "35/48 · 73%", pct: 73 },
                { label: "Warranty active", value: "5/16 · 31%", pct: 31 },
                { label: "Equipment age", value: "4.6 yrs avg · 88%", pct: 88 },
              ]}
            />
          </SectionCard>
        </TabsContent>

        {/* Table */}
        <TabsContent value="table" className="pt-4">
          <SectionCard title="Table" description="12px cell padding — src/components/ui/table.tsx">
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Voluson E10</TableCell>
                    <TableCell>Radiology</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CRITICALITY_BADGE_CLASS.SEMI_CRITICAL}>
                        {CRITICALITY_LABEL.SEMI_CRITICAL}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback>RK</AvatarFallback>
                        </Avatar>
                        Ramesh Kulkarni
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={EQUIPMENT_STATUS_BADGE_CLASS.condemned}>
                        {EQUIPMENT_STATUS_LABEL.condemned}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Evita V500</TableCell>
                    <TableCell>ICU</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CRITICALITY_BADGE_CLASS.CRITICAL}>
                        {CRITICALITY_LABEL.CRITICAL}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback>AR</AvatarFallback>
                        </Avatar>
                        Ananya Rao
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={EQUIPMENT_STATUS_BADGE_CLASS.operational}>
                        {EQUIPMENT_STATUS_LABEL.operational}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
