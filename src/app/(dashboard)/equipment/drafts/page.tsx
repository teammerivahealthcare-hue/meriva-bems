"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, Plus, FileDashed } from "@phosphor-icons/react";
import {
  useDemo,
  getModel,
  getCategory,
  getManufacturer,
  draftCompletionPct,
  itemDraftCompletionPct,
  formatDate,
  CRITICALITY_LABEL,
  CRITICALITY_BADGE_CLASS,
  CATEGORY_LABEL,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/breadcrumb";

type DraftType = "equipment" | "items";

function EquipmentDraftsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const equipmentDrafts = useDemo((s) => s.equipmentDrafts);
  const discardEquipmentDraft = useDemo((s) => s.discardEquipmentDraft);
  const setAddForm = useDemo((s) => s.setAddForm);
  const resetAddForm = useDemo((s) => s.resetAddForm);

  const itemDrafts = useDemo((s) => s.itemDrafts);
  const discardItemDraft = useDemo((s) => s.discardItemDraft);
  const setAddItemForm = useDemo((s) => s.setAddItemForm);
  const resetAddItemForm = useDemo((s) => s.resetAddItemForm);

  const [type, setType] = useState<DraftType>(searchParams.get("type") === "items" ? "items" : "equipment");
  const [search, setSearch] = useState("");

  const filteredEquipment = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return equipmentDrafts;
    return equipmentDrafts.filter((d) => {
      const model = getModel(d.equipmentModelId);
      const mfr = model ? getManufacturer(model.manufacturerId) : undefined;
      const haystack = [model?.modelName, mfr?.name, ...d.units.map((u) => u.assetId)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [equipmentDrafts, search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemDrafts;
    return itemDrafts.filter((d) => d.name.toLowerCase().includes(q));
  }, [itemDrafts, search]);

  const draftCount = type === "items" ? itemDrafts.length : equipmentDrafts.length;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Equipment", href: "/equipment" }, { label: "Drafts" }]} />
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Drafts</h1>
            <p className="text-sm text-muted-foreground">
              {type === "items"
                ? "Inventory items you started but haven't submitted yet"
                : "Equipment registrations you started but haven't submitted yet"}{" "}
              — {draftCount} draft{draftCount === 1 ? "" : "s"}.
            </p>
          </div>
          <Button asChild className="h-9 gap-1.5">
            <Link
              href={type === "items" ? "/equipment/add?tab=items" : "/equipment/add"}
              onClick={() => (type === "items" ? resetAddItemForm() : resetAddForm())}
            >
              <Plus size={16} /> {type === "items" ? "Add item" : "Add equipment"}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as DraftType)}>
        <TabsList variant="line">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-6 pt-6">
          <div className="relative w-full max-w-xs">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts"
              className="h-9 pl-8"
            />
          </div>

          {filteredEquipment.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <FileDashed size={32} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">No drafts</p>
                  <p className="text-sm text-muted-foreground">
                    {equipmentDrafts.length === 0
                      ? "Drafts you save while adding equipment will show up here."
                      : "No drafts match your search."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredEquipment.map((draft) => {
                const model = getModel(draft.equipmentModelId);
                const category = model ? getCategory(model.categoryId) : undefined;
                const mfr = model ? getManufacturer(model.manufacturerId) : undefined;
                const pct = draftCompletionPct(draft);

                return (
                  <Card key={draft.id}>
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{category?.name ?? "Untitled draft"}</p>
                          <p className="text-sm text-muted-foreground">
                            {model ? `${model.modelName}${mfr ? ` — ${mfr.name}` : ""}` : "No model selected"}
                          </p>
                        </div>
                        {draft.criticality && (
                          <Badge variant="outline" className={CRITICALITY_BADGE_CLASS[draft.criticality]}>
                            {CRITICALITY_LABEL[draft.criticality]}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {draft.numberOfUnits} unit{draft.numberOfUnits === 1 ? "" : "s"} · last edited{" "}
                        {formatDate(draft.updatedAt)}
                      </p>

                      <div>
                        <Progress value={pct} className="h-1.5" indicatorClassName="bg-emerald-500" />
                        <p className="mt-1 text-right text-xs text-muted-foreground">{pct}%</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => discardEquipmentDraft(draft.id)}
                        >
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const { id, createdAt, updatedAt, ...data } = draft;
                            setAddForm(data, id);
                            router.push("/equipment/add");
                          }}
                        >
                          Continue editing
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-6 pt-6">
          <div className="relative w-full max-w-xs">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts"
              className="h-9 pl-8"
            />
          </div>

          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <FileDashed size={32} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">No drafts</p>
                  <p className="text-sm text-muted-foreground">
                    {itemDrafts.length === 0
                      ? "Drafts you save while adding inventory items will show up here."
                      : "No drafts match your search."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredItems.map((draft) => {
                const pct = itemDraftCompletionPct(draft);

                return (
                  <Card key={draft.id}>
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{draft.name || "Untitled draft"}</p>
                          <p className="text-sm text-muted-foreground">{CATEGORY_LABEL[draft.category]}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {draft.unit ? `${draft.unit}` : "No unit set"}
                        {draft.reorderThreshold ? ` · reorder at ${draft.reorderThreshold}` : ""} · last edited{" "}
                        {formatDate(draft.updatedAt)}
                      </p>

                      <div>
                        <Progress value={pct} className="h-1.5" indicatorClassName="bg-emerald-500" />
                        <p className="mt-1 text-right text-xs text-muted-foreground">{pct}%</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => discardItemDraft(draft.id)}
                        >
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const { id, createdAt, updatedAt, ...data } = draft;
                            setAddItemForm(data, id);
                            router.push("/equipment/add?tab=items");
                          }}
                        >
                          Continue editing
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EquipmentDraftsPage() {
  return (
    <Suspense fallback={null}>
      <EquipmentDraftsPageInner />
    </Suspense>
  );
}
