"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Plus, FileDashed } from "@phosphor-icons/react";
import {
  useDemo,
  getModel,
  getCategory,
  getManufacturer,
  draftCompletionPct,
  formatDate,
  CRITICALITY_LABEL,
  CRITICALITY_BADGE_CLASS,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Breadcrumb } from "@/components/breadcrumb";

export default function EquipmentDraftsPage() {
  const router = useRouter();
  const equipmentDrafts = useDemo((s) => s.equipmentDrafts);
  const discardEquipmentDraft = useDemo((s) => s.discardEquipmentDraft);
  const setAddForm = useDemo((s) => s.setAddForm);
  const resetAddForm = useDemo((s) => s.resetAddForm);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
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

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Equipment", href: "/equipment" }, { label: "Drafts" }]} />
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Drafts</h1>
            <p className="text-sm text-muted-foreground">
              Equipment registrations you started but haven&apos;t submitted yet — {equipmentDrafts.length} draft
              {equipmentDrafts.length === 1 ? "" : "s"}.
            </p>
          </div>
          <Button asChild className="h-9 gap-1.5">
            <Link href="/equipment/add" onClick={() => resetAddForm()}>
              <Plus size={16} /> Add equipment
            </Link>
          </Button>
        </div>
      </div>

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

      {filtered.length === 0 ? (
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
          {filtered.map((draft) => {
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
    </div>
  );
}
