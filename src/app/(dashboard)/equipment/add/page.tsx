"use client";

import { Suspense, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CloudArrowUp, CheckCircle, Trash, Plus } from "@phosphor-icons/react";
import {
  useDemo,
  emptyDraftUnit,
  draftCompletionPct,
  isDraftComplete,
  itemDraftCompletionPct,
  getModel,
  getCategory,
  getManufacturer,
  getDepartment,
  getRoom,
  formatDate,
  equipmentName,
  categoryName,
  departments,
  models,
  users,
  vendors,
  rooms,
  CRITICALITY_LABEL,
  CATEGORY_LABEL,
  type Criticality,
  type Equipment,
  type EquipmentDraftUnit,
  type ConsumableCategory,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/breadcrumb";
import { EquipmentLabel } from "@/components/equipment-label";

/** Shared confirm step for the "Reset all" action on either tab — clearing a form is destructive and un-doable. */
function ResetConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  description: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="w-full max-w-sm gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Reset all fields?</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <DialogFooter className="rounded-b-none p-8">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Reset all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddedItem {
  name: string;
  category: ConsumableCategory;
  unit: string;
  reorderThreshold: number;
  initialQuantity: number;
  purchaseBillFileName?: string;
}

function AddItemsTab() {
  const addConsumableItem = useDemo((s) => s.addConsumableItem);
  const discardItemDraft = useDemo((s) => s.discardItemDraft);

  // Lives in the store, not local state — same route-cache-reuse reasoning
  // as `addForm` on the Equipment tab (see the comment on it in store.ts).
  const form = useDemo((s) => s.addItemForm);
  const itemDraftId = useDemo((s) => s.addItemFormDraftId);
  const updateAddItemForm = useDemo((s) => s.updateAddItemForm);
  const resetAddItemForm = useDemo((s) => s.resetAddItemForm);

  const [added, setAdded] = useState<AddedItem[]>([]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const billFileInputRef = useRef<HTMLInputElement>(null);

  const valid = form.name.trim().length > 0 && form.unit.trim().length > 0 && form.reorderThreshold !== "";
  const completionPct = itemDraftCompletionPct(form);

  function handleFileChange(file: File | undefined) {
    updateAddItemForm({
      purchaseBillFileName: file?.name ?? "",
      purchaseBillFileSizeKb: file ? Math.max(1, Math.round(file.size / 1024)) : null,
    });
  }

  function handleAddItem() {
    if (!valid) return;
    const item: AddedItem = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim(),
      reorderThreshold: Number(form.reorderThreshold),
      initialQuantity: Number(form.initialQuantity) || 0,
      purchaseBillFileName: form.purchaseBillFileName || undefined,
    };
    addConsumableItem({
      ...item,
      purchaseBillFileSizeKb: form.purchaseBillFileSizeKb ?? undefined,
    });
    setAdded((prev) => [item, ...prev]);
    if (itemDraftId) discardItemDraft(itemDraftId);
    resetAddItemForm();
    if (billFileInputRef.current) billFileInputRef.current.value = "";
  }

  function handleResetConfirmed() {
    resetAddItemForm();
    if (billFileInputRef.current) billFileInputRef.current.value = "";
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Add inventory item</CardTitle>
            <CardDescription>
              Register a consumable or spare — electrodes, filters, tubing, batteries, and other biomedical
              sundries — along with its purchase bill.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Item name</label>
                <Input
                  value={form.name}
                  onChange={(e) => updateAddItemForm({ name: e.target.value })}
                  placeholder="e.g. NIBP Cuff — Pediatric"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={(v) => updateAddItemForm({ category: v as ConsumableCategory })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABEL) as ConsumableCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={form.unit}
                  onChange={(e) => updateAddItemForm({ unit: e.target.value })}
                  placeholder="e.g. box, pcs, set"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reorder level</label>
                <Input
                  type="number"
                  min={1}
                  value={form.reorderThreshold}
                  onChange={(e) => updateAddItemForm({ reorderThreshold: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Initial quantity in stock</label>
                <Input
                  type="number"
                  min={0}
                  value={form.initialQuantity}
                  onChange={(e) => updateAddItemForm({ initialQuantity: e.target.value })}
                  placeholder="e.g. 25"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Purchase bill <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                ref={billFileInputRef}
                type="file"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
              />
              {form.purchaseBillFileName && (
                <p className="text-xs text-muted-foreground">
                  {form.purchaseBillFileName}
                  {form.purchaseBillFileSizeKb != null ? ` · ${form.purchaseBillFileSizeKb} KB` : ""}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-8">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>{completionPct}% complete</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completionPct} className="h-1.5" indicatorClassName="bg-emerald-500" />

            <dl className="space-y-2.5">
              <SummaryRow label="Item name" value={form.name || undefined} />
              <SummaryRow label="Category" value={CATEGORY_LABEL[form.category]} />
              <SummaryRow label="Unit" value={form.unit || undefined} />
              <SummaryRow label="Reorder level" value={form.reorderThreshold || undefined} />
              <SummaryRow label="Initial quantity" value={form.initialQuantity || undefined} />
              <SummaryRow label="Purchase bill" value={form.purchaseBillFileName || undefined} />
            </dl>

            <Separator />

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Items added ({added.length} this session)
              </p>
              {added.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items added yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {added.map((item, i) => (
                    <li key={i} className="space-y-0.5 border-b pb-2.5 last:border-0 last:pb-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABEL[item.category]} · {item.initialQuantity} {item.unit}
                      </p>
                      {item.purchaseBillFileName && (
                        <p className="text-xs text-muted-foreground">Bill: {item.purchaseBillFileName}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setResetConfirmOpen(true)}>
              Reset all
            </Button>
            <Button type="button" disabled={!valid} className="flex-1 gap-1.5" onClick={handleAddItem}>
              <Plus size={16} /> Add item
            </Button>
          </CardFooter>
        </Card>
      </div>

      <ResetConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        onConfirm={handleResetConfirmed}
        description="This clears the item you're currently entering — name, category, unit, and quantities. Items already added this session are kept."
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "None"}</dd>
    </div>
  );
}

function AddEquipmentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const equipment = useDemo((s) => s.equipment);
  const equipmentDrafts = useDemo((s) => s.equipmentDrafts);
  const addEquipmentBulk = useDemo((s) => s.addEquipmentBulk);
  const discardEquipmentDraft = useDemo((s) => s.discardEquipmentDraft);
  const saveEquipmentDraft = useDemo((s) => s.saveEquipmentDraft);

  // Lives in the store, not local state — see the comment on `addForm` in
  // store.ts for why.
  const form = useDemo((s) => s.addForm);
  const draftId = useDemo((s) => s.addFormDraftId);
  const updateAddForm = useDemo((s) => s.updateAddForm);
  const resetAddForm = useDemo((s) => s.resetAddForm);

  const itemDrafts = useDemo((s) => s.itemDrafts);
  const saveItemDraft = useDemo((s) => s.saveItemDraft);
  const itemForm = useDemo((s) => s.addItemForm);
  const itemDraftId = useDemo((s) => s.addItemFormDraftId);

  const [view, setView] = useState<"form" | "success">("form");
  const [activeTab, setActiveTab] = useState<"equipment" | "items">(
    searchParams.get("tab") === "items" ? "items" : "equipment"
  );
  const [createdEquipment, setCreatedEquipment] = useState<Equipment[]>([]);
  const [createdWarrantyExpiry, setCreatedWarrantyExpiry] = useState<string | undefined>(undefined);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedModel = form.equipmentModelId ? getModel(form.equipmentModelId) : undefined;
  const selectedCategory = selectedModel ? getCategory(selectedModel.categoryId) : undefined;
  const selectedManufacturer = selectedModel ? getManufacturer(selectedModel.manufacturerId) : undefined;
  const selectedVendor = form.dealerVendorId ? vendors.find((v) => v.id === form.dealerVendorId) : undefined;
  const selectedOwner = form.responsibleUserId ? users.find((u) => u.id === form.responsibleUserId) : undefined;

  const completionPct = draftCompletionPct(form);
  const draftCount = equipmentDrafts.length;
  const itemDraftCount = itemDrafts.length;

  function handleSaveAsDraft() {
    if (activeTab === "equipment") saveEquipmentDraft(draftId, form);
    else saveItemDraft(itemDraftId, itemForm);
    router.push(activeTab === "items" ? "/equipment/drafts?type=items" : "/equipment/drafts");
  }

  function setUnitField(index: number, key: keyof EquipmentDraftUnit, value: string) {
    updateAddForm({ units: form.units.map((u, i) => (i === index ? { ...u, [key]: value } : u)) });
  }

  function handleModelChange(modelId: string) {
    const model = getModel(modelId);
    const cat = model ? getCategory(model.categoryId) : undefined;
    updateAddForm({ equipmentModelId: modelId, criticality: cat?.defaultCriticality ?? form.criticality });
  }

  function handleUnitCountChange(raw: string) {
    const n = Math.max(1, Math.min(20, Number(raw) || 1));
    const units = [...form.units];
    while (units.length < n) units.push(emptyDraftUnit());
    while (units.length > n) units.pop();
    updateAddForm({ numberOfUnits: n, units });
  }

  function copyUnit1Location(index: number) {
    const base = form.units[0];
    updateAddForm({
      units: form.units.map((u, i) =>
        i === index ? { ...u, departmentId: base.departmentId, roomId: base.roomId } : u
      ),
    });
  }

  function suggestAssetId(index: number) {
    const dept = getDepartment(form.units[index].departmentId);
    const deptCode = (dept?.name ?? selectedCategory?.name ?? "GEN").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
    const seq = String(equipment.length + index + 1).padStart(4, "0");
    setUnitField(index, "assetId", `MH/${deptCode}/${seq}`);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateAddForm({ photoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isDraftComplete(form)) return;
    const created = addEquipmentBulk({
      equipmentModelId: form.equipmentModelId,
      units: form.units,
      responsibleUserId: form.responsibleUserId,
      criticality: form.criticality as Criticality,
      yearOfManufacture: Number(form.yearOfManufacture),
      dateOfPurchase: form.dateOfPurchase,
      dateOfInstallation: form.dateOfInstallation,
      purchaseCost: Number(form.purchaseCost),
      dealerVendorId: form.dealerVendorId,
      warrantyExpiryDate: form.warrantyExpiryDate || undefined,
      photoDataUrl: form.photoDataUrl || undefined,
    });
    if (draftId) discardEquipmentDraft(draftId);
    setCreatedWarrantyExpiry(form.warrantyExpiryDate ? formatDate(form.warrantyExpiryDate) : undefined);
    resetAddForm();
    setCreatedEquipment(created);
    setView("success");
  }

  if (view === "success") {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12">
        <Card>
          <CardContent className="space-y-5 pt-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle size={28} weight="fill" className="text-success" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Equipment successfully added</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {createdEquipment.length} unit{createdEquipment.length === 1 ? "" : "s"} registered and now visible
                on the Equipment list.
              </p>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => router.push("/equipment")}>
                View all equipment
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/equipment/${createdEquipment[0]?.id}`)}
                >
                  Edit submission
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push("/equipment/drafts")}>
                  See drafts ({draftCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Printable label{createdEquipment.length === 1 ? "" : "s"}</CardTitle>
            <CardDescription>
              Scan-ready QR sticker{createdEquipment.length === 1 ? "" : "s"} for the physical unit
              {createdEquipment.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {createdEquipment.map((eq) => (
              <EquipmentLabel
                key={eq.id}
                assetId={eq.assetId}
                name={equipmentName(eq)}
                category={categoryName(eq)}
                serialNumber={eq.serialNumber}
                purchaseDate={formatDate(eq.dateOfPurchase)}
                warrantyExpiry={createdWarrantyExpiry}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Equipment", href: "/equipment" }, { label: "Add equipment" }]} />
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Add new equipment</h1>
            <p className="text-sm text-muted-foreground">
              Register medical equipment and inventory items to track maintenance, warranty and stock across
              departments.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={activeTab === "items" ? "/equipment/drafts?type=items" : "/equipment/drafts"}
              className="text-sm text-muted-foreground hover:underline"
            >
              See drafts ({activeTab === "items" ? itemDraftCount : draftCount})
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={handleSaveAsDraft}>
              Save as draft
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "equipment" | "items")}>
        <TabsList variant="line">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="pt-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Equipment details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-medium">Equipment model</label>
                    <Select value={form.equipmentModelId} onValueChange={handleModelChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model">
                          {selectedModel ? `${selectedModel.modelName} — ${selectedManufacturer?.name}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => {
                          const mfr = getManufacturer(m.manufacturerId);
                          return (
                            <SelectItem key={m.id} value={m.id}>
                              {m.modelName} — {mfr?.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Number of units</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={form.numberOfUnits}
                      onChange={(e) => handleUnitCountChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Criticality</label>
                    <Select value={form.criticality} onValueChange={(v) => updateAddForm({ criticality: v as Criticality })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select criticality">
                          {form.criticality ? CRITICALITY_LABEL[form.criticality] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CRITICALITY_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Responsible owner</label>
                    <Select value={form.responsibleUserId} onValueChange={(v) => updateAddForm({ responsibleUserId: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select owner">{selectedOwner?.name}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Year of manufacture</label>
                    <Input
                      type="number"
                      value={form.yearOfManufacture}
                      onChange={(e) => updateAddForm({ yearOfManufacture: e.target.value })}
                      placeholder="e.g. 2024"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-medium">Dealer / vendor</label>
                    <Select value={form.dealerVendorId} onValueChange={(v) => updateAddForm({ dealerVendorId: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select vendor">{selectedVendor?.name}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Photo</CardTitle>
                <CardDescription>Optional — helps staff identify the unit at a glance.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files[0]);
                  }}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center"
                >
                  {form.photoDataUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.photoDataUrl} alt="Equipment" className="h-24 w-24 rounded-lg object-cover" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateAddForm({ photoDataUrl: "" })}>
                        <Trash size={14} /> Remove photo
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CloudArrowUp size={28} className="text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Choose a file or drag it here</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG — up to 5MB</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Browse files
                      </Button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>Serial number, department and room for each unit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.units.map((unit, index) => {
                  const unitRooms = rooms.filter((r) => r.departmentId === unit.departmentId);
                  return (
                    <div key={index} className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Unit {index + 1}</p>
                        {index > 0 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => copyUnit1Location(index)}>
                            Same as unit 1
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Serial number</label>
                          <Input
                            value={unit.serialNumber}
                            onChange={(e) => setUnitField(index, "serialNumber", e.target.value)}
                            placeholder="Manufacturer serial no."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Asset ID</label>
                          <div className="flex gap-1.5">
                            <Input
                              value={unit.assetId}
                              onChange={(e) => setUnitField(index, "assetId", e.target.value)}
                              placeholder="e.g. MH/RAD/0042"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => suggestAssetId(index)}>
                              Auto
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Department</label>
                          <Select
                            value={unit.departmentId}
                            onValueChange={(v) =>
                              updateAddForm({
                                units: form.units.map((u, i) => (i === index ? { ...u, departmentId: v, roomId: "" } : u)),
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select department">
                                {getDepartment(unit.departmentId)?.name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Room</label>
                          <Select
                            value={unit.roomId}
                            onValueChange={(v) => {
                              if (v) setUnitField(index, "roomId", v);
                            }}
                            disabled={!unit.departmentId}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select room">
                                {(() => {
                                  const r = getRoom(unit.roomId);
                                  return r ? `Floor ${r.floor} · ${r.name}` : undefined;
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {unitRooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  Floor {r.floor} · {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifecycle</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Purchase date</label>
                  <Input
                    type="date"
                    value={form.dateOfPurchase}
                    onChange={(e) => updateAddForm({ dateOfPurchase: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Installation date</label>
                  <Input
                    type="date"
                    value={form.dateOfInstallation}
                    onChange={(e) => updateAddForm({ dateOfInstallation: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Warranty expiry date <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="date"
                    value={form.warrantyExpiryDate}
                    onChange={(e) => updateAddForm({ warrantyExpiryDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Purchase cost (INR)</label>
                  <Input
                    type="number"
                    value={form.purchaseCost}
                    onChange={(e) => updateAddForm({ purchaseCost: e.target.value })}
                    placeholder="e.g. 1450000"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
                <CardDescription>Optional — notes for whoever reviews this submission.</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={form.remarks}
                  onChange={(e) => updateAddForm({ remarks: e.target.value })}
                  rows={3}
                  placeholder="e.g. Installed alongside MX450 monitor"
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>{completionPct}% complete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={completionPct} className="h-1.5" indicatorClassName="bg-emerald-500" />

                <dl className="space-y-2.5">
                  <SummaryRow label="Equipment category" value={selectedCategory?.name} />
                  <SummaryRow label="Number of units" value={String(form.numberOfUnits)} />
                  <SummaryRow label="Manufacturer" value={selectedManufacturer?.name} />
                  <SummaryRow label="Responsible owner" value={selectedOwner?.name} />
                  <SummaryRow label="Purchase date" value={form.dateOfPurchase ? formatDate(form.dateOfPurchase) : undefined} />
                  <SummaryRow
                    label="Installation date"
                    value={form.dateOfInstallation ? formatDate(form.dateOfInstallation) : undefined}
                  />
                  <SummaryRow
                    label="Warranty expiry date"
                    value={form.warrantyExpiryDate ? formatDate(form.warrantyExpiryDate) : undefined}
                  />
                  <SummaryRow label="Dealer / vendor" value={selectedVendor?.name} />
                </dl>

                <Separator />

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Location</p>
                  {form.units.every((u) => !u.departmentId) ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {form.units.map((u, i) => {
                        const dept = getDepartment(u.departmentId);
                        const room = getRoom(u.roomId);
                        return (
                          <li key={i} className="text-muted-foreground">
                            Unit {i + 1}: {dept ? `${dept.name}${room ? ` · ${room.name}` : ""}` : "Not set"}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setResetConfirmOpen(true)}>
                  Reset all
                </Button>
                <Button type="submit" disabled={!isDraftComplete(form)} className="flex-1">
                  Submit
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </TabsContent>

        <TabsContent value="items" className="pt-6">
          <AddItemsTab />
        </TabsContent>
      </Tabs>

      <ResetConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        onConfirm={resetAddForm}
        description="This clears every field you've entered for this equipment, including units and location. This can't be undone."
      />
    </div>
  );
}

export default function AddEquipmentPage() {
  return (
    <Suspense fallback={null}>
      <AddEquipmentPageInner />
    </Suspense>
  );
}
