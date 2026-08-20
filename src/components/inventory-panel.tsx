"use client";

import { useState } from "react";
import {
  Package, WarningCircle, ArrowsClockwise, MagnifyingGlass,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import {
  useDemo,
  consumableStock,
  consumableLogFor,
  formatDate,
  getUser,
  getEquipmentById,
  equipmentName,
  CATEGORY_LABEL,
  type ConsumableItem,
  type ConsumableCategory,
} from "@/lib/bems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SummaryCard, type ChangeDirection, type IconAccent } from "@/components/summary-card";
import { StockMovementDialog, type StockMovementKind } from "@/components/stock-movement-dialog";

const ALL = "ALL";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  neutral: "bg-neutral/10 text-neutral border-neutral/30",
};

function StatusChip({ tone, label }: { tone: Tone; label: string }) {
  return (
    <Badge variant="outline" className={TONE_CLASS[tone]}>
      {label}
    </Badge>
  );
}

function stockStatus(stock: number, threshold: number): { tone: Tone; label: string } {
  if (stock <= 0) return { tone: "danger", label: "Out of stock" };
  if (stock <= threshold) return { tone: "warning", label: "Low stock" };
  return { tone: "success", label: "OK" };
}

interface SummaryCardSpec {
  key: string;
  title: string;
  value: string;
  icon: Icon;
  iconColor: IconAccent;
  changeDirection?: ChangeDirection;
  footerLeadText: string;
  footerText: string;
}

/** Consumables/spares — its own tab next to MGPS System, not the cylinder stock that tab covers. */
export function InventoryPanel() {
  const items = useDemo((s) => s.consumableItems);
  const log = useDemo((s) => s.consumableLog);
  const logConsumableEvent = useDemo((s) => s.logConsumableEvent);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [selectedItem, setSelectedItem] = useState<ConsumableItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState<StockMovementKind>("RESTOCK");

  const rows = items
    .map((item) => ({ item, stock: consumableStock(item.id, log) }))
    .filter(({ item }) => category === ALL || item.category === category)
    .filter(({ item }) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.item.name.localeCompare(b.item.name));

  const lowStockCount = items.filter((item) => {
    const stock = consumableStock(item.id, log);
    return stock > 0 && stock <= item.reorderThreshold;
  }).length;
  const outOfStockCount = items.filter((item) => consumableStock(item.id, log) <= 0).length;

  const summaryCards: SummaryCardSpec[] = [
    {
      key: "items", title: "Items tracked", value: String(items.length), icon: Package, iconColor: "blue",
      footerLeadText: String(items.length), footerText: "consumable SKUs",
    },
    {
      key: "low", title: "Low stock", value: String(lowStockCount), icon: WarningCircle, iconColor: "purple",
      changeDirection: lowStockCount > 0 ? "negative" : "positive",
      footerLeadText: String(lowStockCount), footerText: "at or below reorder level",
    },
    {
      key: "out", title: "Out of stock", value: String(outOfStockCount), icon: WarningCircle, iconColor: "fuchsia",
      changeDirection: outOfStockCount > 0 ? "negative" : "positive",
      footerLeadText: String(outOfStockCount), footerText: "need immediate restock",
    },
    {
      key: "moves", title: "Movements logged", value: String(log.length), icon: ArrowsClockwise, iconColor: "indigo",
      footerLeadText: String(log.length), footerText: "restock/consume events",
    },
  ];

  const selectedStock = selectedItem ? consumableStock(selectedItem.id, log) : 0;
  const selectedLog = selectedItem ? consumableLogFor(selectedItem.id, log) : [];

  function openLogDialog(kind: StockMovementKind) {
    setDialogKind(kind);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Consumables and spares — electrodes, filters, tubing, batteries, and other biomedical sundries.
            Oxygen cylinder stock lives under the MGPS System tab. New items are added from the Items tab
            on the Add equipment page.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            changeDirection={card.changeDirection}
            footerLeadText={card.footerLeadText}
            footerText={card.footerText}
            showChevron={false}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory"
            className="h-9 bg-white pl-8"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 px-3">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {(Object.keys(CATEGORY_LABEL) as ConsumableCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0 gap-0">
        <CardHeader className="gap-0 px-4 pt-3 pb-2">
          <CardTitle className="text-lg">Stock levels</CardTitle>
          <CardDescription>Select an item to view its movement history and log a restock or consumption.</CardDescription>
        </CardHeader>
        {rows.length > 0 ? (
          <div className="px-4 pt-2 pb-3">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Reorder level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ item, stock }) => {
                    const status = stockStatus(stock, item.reorderThreshold);
                    return (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => setSelectedItem(item)}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{CATEGORY_LABEL[item.category]}</TableCell>
                        <TableCell>{stock}</TableCell>
                        <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                        <TableCell className="text-muted-foreground">{item.reorderThreshold}</TableCell>
                        <TableCell>
                          <StatusChip tone={status.tone} label={status.label} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState icon={MagnifyingGlass} message="No items match your search/filter." />
          </div>
        )}
      </Card>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="w-full data-[side=right]:sm:max-w-120">
          {selectedItem && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle>{selectedItem.name}</SheetTitle>
                <SheetDescription>{CATEGORY_LABEL[selectedItem.category]}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Current stock</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-3xl font-semibold">{selectedStock}</p>
                      <StatusChip
                        tone={stockStatus(selectedStock, selectedItem.reorderThreshold).tone}
                        label={stockStatus(selectedStock, selectedItem.reorderThreshold).label}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reorder at {selectedItem.reorderThreshold} {selectedItem.unit}
                    </p>
                    {selectedItem.purchaseBillFileName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Purchase bill: {selectedItem.purchaseBillFileName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openLogDialog("RESTOCK")}>
                      Log restock
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openLogDialog("CONSUMED")}>
                      Log consumption
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Movement history</p>
                  {selectedLog.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <Table className="min-w-105">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>By</TableHead>
                            <TableHead>Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLog.map((e) => {
                            const usedOnEq = e.equipmentId ? getEquipmentById(e.equipmentId) : undefined;
                            return (
                              <TableRow key={e.id}>
                                <TableCell className="text-muted-foreground">{formatDate(e.loggedAt)}</TableCell>
                                <TableCell>
                                  <StatusChip tone={e.kind === "RESTOCK" ? "success" : "neutral"} label={e.kind === "RESTOCK" ? "Restock" : "Consumed"} />
                                </TableCell>
                                <TableCell>{e.quantity}</TableCell>
                                <TableCell className="text-muted-foreground">{getUser(e.performedByUserId)?.name ?? "Unknown"}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {usedOnEq && (
                                    <Link
                                      href={`/equipment/${usedOnEq.id}`}
                                      className="block truncate font-medium text-foreground hover:underline"
                                    >
                                      {equipmentName(usedOnEq)}
                                    </Link>
                                  )}
                                  <span className="truncate">{e.note ?? (usedOnEq ? "" : "—")}</span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <EmptyState icon={ArrowsClockwise} message="No movements logged yet." />
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {selectedItem && (
        <StockMovementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialKind={dialogKind}
          title="Log stock movement"
          description={`Record ${selectedItem.name} coming in or going out of stock.`}
          restockLabel="Restock — items received"
          consumedLabel="Consumed — items used"
          onSubmit={({ kind, quantity, note }) => logConsumableEvent({ itemId: selectedItem.id, kind, quantity, note })}
        />
      )}
    </div>
  );
}
