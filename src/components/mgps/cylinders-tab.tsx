"use client";

import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import {
  CYLINDER_GASES,
  CYLINDER_STATUSES,
  NO_CYLINDER_FILTER,
  AT_VENDOR,
  matchesCylinder,
  inService,
  reasonOf,
  isReturnOverdue,
  isHydroOverdue,
  isFiltered,
  type CylinderFilter,
  type CylinderGroup,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterChips } from "@/components/filter-chips";
import { cn } from "@/lib/utils";
import { MinimumStockChips, PlacementSplit } from "./cylinder-placement";
import { CYLINDER_STATUS_TONE, PART_COLOR, Pill, SectionCard, formatDay, type MgpsData } from "./mgps-shared";

const ALL = "all";

export function CylindersTab({
  data,
  filter,
  onFilterChange,
  onOpenCylinder,
  onRegister,
}: {
  data: MgpsData;
  filter: CylinderFilter;
  onFilterChange: (filter: CylinderFilter) => void;
  onOpenCylinder: (id: string) => void;
  onRegister: () => void;
}) {
  const { cylinders, departments } = data;
  const set = (patch: Partial<CylinderFilter>) => onFilterChange({ ...filter, ...patch });
  /** Lines in the split and the minimum chips start a fresh view rather than stacking on the current one. */
  const pick = (patch: Partial<CylinderFilter>) => onFilterChange({ ...NO_CYLINDER_FILTER, ...patch });
  const rows = cylinders.filter((c) => matchesCylinder(c, filter, departments));
  const groupCount = (g: CylinderGroup) => cylinders.filter((c) => (g === "In service") === inService(c)).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Where the cylinders are"
        action={<span className="text-xs text-muted-foreground">{cylinders.length} cylinders · select a line to filter the register</span>}
      >
        <PlacementSplit cylinders={cylinders} filter={filter} onPick={pick} />
        <div className="border-t pt-4">
          <MinimumStockChips cylinders={cylinders} onPick={pick} />
        </div>
      </SectionCard>

      <SectionCard
        title="Cylinder register"
        action={
          <Button onClick={onRegister} className="gap-2 px-4">
            <Plus size={16} /> Register cylinder
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
            <MagnifyingGlass size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Scan or type cylinder number, serial number or location"
              aria-label="Find cylinder"
              className="bg-surface pl-9"
            />
          </div>
          <Select value={filter.gas || ALL} onValueChange={(v) => set({ gas: v === ALL ? "" : (v as CylinderFilter["gas"]) })}>
            <SelectTrigger aria-label="Gas" className="bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={ALL}>All gases</SelectItem>
              {CYLINDER_GASES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter.location || ALL} onValueChange={(v) => set({ location: v === ALL ? "" : v })}>
            <SelectTrigger aria-label="Location" className="bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={ALL}>Anywhere</SelectItem>
              <SelectItem value="STOCK">Central stock</SelectItem>
              <SelectItem value={AT_VENDOR}>At a vendor</SelectItem>
              <SelectSeparator />
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter.status || ALL} onValueChange={(v) => set({ status: v === ALL ? "" : (v as CylinderFilter["status"]) })}>
            <SelectTrigger aria-label="Status" className="bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={ALL}>All statuses</SelectItem>
              {CYLINDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChips<"" | CylinderGroup>
            label="In service or not"
            options={[
              { value: "", label: "All", count: cylinders.length },
              { value: "In service", label: "In service", count: groupCount("In service") },
              { value: "Not in service", label: "Not in service", count: groupCount("Not in service") },
            ]}
            value={filter.group}
            onChange={(group) => set({ group, reason: "" })}
          />
          {filter.reason && (
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-primary py-1 pr-1.5 pl-3 text-xs font-medium text-primary-foreground">
              {filter.reason}
              <button type="button" aria-label="Remove reason filter" onClick={() => set({ reason: "" })} className="rounded-full p-0.5 hover:bg-white/20">
                <X size={12} weight="bold" />
              </button>
            </span>
          )}
          {isFiltered(filter) && (
            <button type="button" onClick={() => onFilterChange(NO_CYLINDER_FILTER)} className="text-sm font-medium text-primary hover:underline">
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {rows.length} of {cylinders.length} cylinders
          </span>
        </div>

        <div className="max-h-[28rem] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-surface">
              <TableRow>
                <TableHead className="pl-4">Cylinder no.</TableHead>
                <TableHead>Gas</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Why it is there</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hydro test due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => onOpenCylinder(c.id)}>
                  <TableCell className="pl-4">
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCylinder(c.id);
                      }}
                    >
                      {c.id}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.gas}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{c.size}</TableCell>
                  <TableCell>{data.label(c.location)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: inService(c) ? PART_COLOR.inUse : PART_COLOR.idle }} />
                      {reasonOf(c)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Pill tone={CYLINDER_STATUS_TONE[c.status]}>{c.status}</Pill>
                      {isReturnOverdue(c) && <Pill tone="bad">Overdue</Pill>}
                    </span>
                  </TableCell>
                  <TableCell className={cn("whitespace-nowrap", isHydroOverdue(c) ? "font-medium text-red-600" : "text-muted-foreground")}>
                    {formatDay(c.hydroTestDue)}
                    {isHydroOverdue(c) && " (overdue)"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No cylinders match these filters. Clear a filter to see more.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
