"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  Buildings,
  User,
  EnvelopeSimple,
  Lock,
  MapPin,
  Phone,
  Plus,
  X,
  Check,
  CheckCircle,
  CaretRight,
  CaretLeft,
  Tag,
  Eye,
  EyeSlash,
  Hash,
  Stack,
  FileText,
  PencilSimple,
  UserGear,
  type Icon,
} from "@phosphor-icons/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 4 steps: Account -> Hospital -> Equipment -> Done.
// Staff/engineer accounts are deliberately NOT part of this flow —
// that happens later from Settings > Team & Access.

const STEPS = ["Account", "Hospital", "Equipment", "Done"];

const STEP_COPY = [
  { title: "Create your account", desc: "This is your own login as the hospital admin." },
  {
    title: "Tell us about your hospital",
    desc: "Basic details first, then map out your floors and departments, and who we should contact.",
  },
  {
    title: "Add your equipment",
    desc: "Add what you have, place each unit, and attach documents — all in one card per equipment type.",
  },
  { title: "You're all set", desc: "" },
];

const MANUFACTURERS = [
  "Philips Healthcare",
  "GE Healthcare",
  "Siemens Healthineers",
  "Mindray",
  "Dräger",
  "BPL Medical Technologies",
  "Skanray Technologies",
  "Nihon Kohden",
];

const EQUIPMENT_TYPES = [
  "Ventilator",
  "Patient Monitor",
  "Infusion Pump",
  "Defibrillator",
  "ECG Machine",
  "Ultrasound System",
  "Anesthesia Workstation",
  "Dialysis Machine",
  "X-Ray System",
  "OT Light",
];

const DEPT_SUGGESTIONS = [
  "ICU",
  "Emergency",
  "OT",
  "Radiology",
  "Cardiology",
  "Dialysis",
  "General Ward",
  "Maternity Ward",
  "NICU",
  "Laboratory",
];

const DOC_TYPES = ["User Manual", "Purchase Bill", "Warranty Card", "AMC Contract", "Service Report", "Other"];

const CONTACT_ROLES = ["Hospital Administrator", "Facility Manager", "Biomedical Engineer", "Owner / Director", "Other"];

type Floor = { id: string; name: string; departments: string[] };
type UnitPlacement = { id: string; floor: string; ward: string; room: string; serial: string };
type DraftDoc = { id: string; type: string; fileName: string; appliesTo: string };
type EquipmentBatch = {
  key: string;
  manufacturer: string;
  type: string;
  series: string;
  year: string;
  purchaseDate: string;
  installDate: string;
  warrantyExpiry: string;
  units: UnitPlacement[];
  documents: DraftDoc[];
};
type Account = { name: string; email: string; password: string };
type Hospital = { name: string; address: string; city: string; beds: string };
type Contact = { sameAsAdmin: boolean; role: string; name: string; email: string; phone: string };
type EquipmentDraft = {
  manufacturer: string;
  type: string;
  series: string;
  year: string;
  units: string;
  purchaseDate: string;
  installDate: string;
  warrantyExpiry: string;
};
type DocDraft = { type: string; file: File | null; appliesTo: string };

function genHospitalId() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MRV-${new Date().getFullYear()}-${n}`;
}

let idCounter = 1;
function genEquipmentId() {
  const id = `EQ-${String(idCounter).padStart(4, "0")}`;
  idCounter += 1;
  return id;
}

let floorCounter = 1;
function genFloorId() {
  return `floor-${floorCounter++}`;
}

function Field({ label, icon: IconCmp, children }: { label: string; icon?: Icon; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
        {IconCmp ? <IconCmp size={16} className="text-text-secondary" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-input bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";

const selectTriggerClass =
  "w-full rounded-lg border-input bg-surface px-4 py-2.5 text-sm text-text-primary data-[size=default]:h-11 data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/20";

const selectItemClass = "py-2 pr-8 pl-3 text-sm rounded-md";

const boxClass = "rounded-2xl border border-border bg-surface p-6";

const btnPrimary =
  "flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40";

const btnGhost =
  "flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

const btnLink = "text-sm font-medium text-black underline-offset-4 hover:underline";

export default function HospitalSignupFlow() {
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [dashboardClicked, setDashboardClicked] = useState(false);
  const [hospitalId] = useState(genHospitalId);

  const [account, setAccount] = useState<Account>({ name: "", email: "", password: "" });
  const [hospital, setHospital] = useState<Hospital>({ name: "", address: "", city: "", beds: "" });
  const [contact, setContact] = useState<Contact>({ sameAsAdmin: true, role: "", name: "", email: "", phone: "" });

  const [floorCountInput, setFloorCountInput] = useState("");
  const [floors, setFloors] = useState<Floor[]>([]);
  const [deptDraft, setDeptDraft] = useState<Record<string, string>>({});
  const [floorsSaved, setFloorsSaved] = useState(false);
  const [savedFloorDepts, setSavedFloorDepts] = useState<Record<string, boolean>>({});

  const [batches, setBatches] = useState<EquipmentBatch[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<EquipmentDraft>({
    manufacturer: "",
    type: "",
    series: "",
    year: "",
    units: "",
    purchaseDate: "",
    installDate: "",
    warrantyExpiry: "",
  });
  const [unitPlacements, setUnitPlacements] = useState<UnitPlacement[]>([]);
  const [draftDocs, setDraftDocs] = useState<DraftDoc[]>([]);
  const [docDraft, setDocDraft] = useState<DocDraft>({ type: "", file: null, appliesTo: "all" });

  const totalEquipment = useMemo(() => batches.reduce((sum, b) => sum + b.units.length, 0), [batches]);
  const totalDepartments = useMemo(() => floors.reduce((sum, f) => sum + f.departments.length, 0), [floors]);
  const totalDocuments = useMemo(() => batches.reduce((sum, b) => sum + b.documents.length, 0), [batches]);

  const contactName = contact.sameAsAdmin ? account.name : contact.name;

  // Resize the floor list the instant the count changes — no separate "set" step.
  function setFloorCount(value: string) {
    setFloorCountInput(value);
    const n = Math.max(0, parseInt(value, 10) || 0);
    setFloors((prev) => {
      const next: Floor[] = [];
      for (let i = 0; i < n; i++) {
        next.push(prev[i] || { id: genFloorId(), name: `Floor ${i + 1}`, departments: [] });
      }
      return next;
    });
    setFloorsSaved(false);
  }

  function renameFloor(id: string, name: string) {
    setFloors((fs) => fs.map((f) => (f.id === id ? { ...f, name } : f)));
  }

  function removeFloor(id: string) {
    setFloors((fs) => fs.filter((f) => f.id !== id));
    setFloorsSaved(false);
  }

  function addDeptToFloor(floorId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFloors((fs) =>
      fs.map((f) => {
        if (f.id !== floorId) return f;
        if (f.departments.includes(trimmed)) return f;
        return { ...f, departments: [...f.departments, trimmed] };
      })
    );
    setDeptDraft((d) => ({ ...d, [floorId]: "" }));
    setSavedFloorDepts((s) => ({ ...s, [floorId]: false }));
    setFloorsSaved(false);
  }

  function removeDeptFromFloor(floorId: string, name: string) {
    setFloors((fs) =>
      fs.map((f) => (f.id === floorId ? { ...f, departments: f.departments.filter((d) => d !== name) } : f))
    );
    setSavedFloorDepts((s) => ({ ...s, [floorId]: false }));
    setFloorsSaved(false);
  }

  function clearFloorDepts(floorId: string) {
    setFloors((fs) => fs.map((f) => (f.id === floorId ? { ...f, departments: [] } : f)));
    setSavedFloorDepts((s) => ({ ...s, [floorId]: false }));
    setFloorsSaved(false);
  }

  function saveFloorDepts(floorId: string) {
    setSavedFloorDepts((s) => ({ ...s, [floorId]: true }));
  }

  function saveFloors() {
    setFloorsSaved(true);
  }

  // Resize the unit-placement list whenever the units count changes.
  // New rows get a real equipment ID the moment they appear.
  function setUnitsCount(value: string) {
    setDraft((d) => ({ ...d, units: value }));
    const n = Math.max(0, parseInt(value, 10) || 0);
    setUnitPlacements((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) {
        next.push({ id: genEquipmentId(), floor: "", ward: "", room: "", serial: "" });
      }
      return next;
    });
  }

  function updateUnitPlacement(idx: number, patch: Partial<UnitPlacement>) {
    setUnitPlacements((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  }

  function resetDraft() {
    setDraft({
      manufacturer: "",
      type: "",
      series: "",
      year: "",
      units: "",
      purchaseDate: "",
      installDate: "",
      warrantyExpiry: "",
    });
    setUnitPlacements([]);
    setDraftDocs([]);
    setDocDraft({ type: "", file: null, appliesTo: "all" });
  }

  function startEdit(key: string) {
    const b = batches.find((x) => x.key === key);
    if (!b) return;
    setEditingKey(key);
    setDraft({
      manufacturer: b.manufacturer,
      type: b.type,
      series: b.series || "",
      year: b.year || "",
      units: String(b.units.length),
      purchaseDate: b.purchaseDate || "",
      installDate: b.installDate || "",
      warrantyExpiry: b.warrantyExpiry || "",
    });
    setUnitPlacements(b.units.map((u) => ({ ...u })));
    setDraftDocs(b.documents.map((d) => ({ ...d })));
  }

  function cancelEdit() {
    setEditingKey(null);
    resetDraft();
  }

  function saveEquipment() {
    const units = Math.max(1, parseInt(draft.units, 10) || 1);
    const finalUnits = Array.from(
      { length: units },
      (_, i) => unitPlacements[i] || { id: genEquipmentId(), floor: "", ward: "", room: "", serial: "" }
    );
    const entry: EquipmentBatch = {
      key: editingKey || `${Date.now()}-${Math.random()}`,
      manufacturer: draft.manufacturer || "Unspecified",
      type: draft.type || "Unspecified",
      series: draft.series,
      year: draft.year,
      purchaseDate: draft.purchaseDate,
      installDate: draft.installDate,
      warrantyExpiry: draft.warrantyExpiry,
      units: finalUnits,
      documents: draftDocs,
    };
    if (editingKey) {
      setBatches((bs) => bs.map((b) => (b.key === editingKey ? entry : b)));
    } else {
      setBatches((bs) => [...bs, entry]);
    }
    setEditingKey(null);
    resetDraft();
  }

  function removeBatch(key: string) {
    setBatches((bs) => bs.filter((b) => b.key !== key));
    if (editingKey === key) cancelEdit();
  }

  function addDraftDoc() {
    if (!docDraft.type) return;
    const fileName = docDraft.file ? docDraft.file.name : "No file attached";
    setDraftDocs((d) => [
      ...d,
      { id: `${Date.now()}-${Math.random()}`, type: docDraft.type, fileName, appliesTo: docDraft.appliesTo || "all" },
    ]);
    setDocDraft({ type: "", file: null, appliesTo: "all" });
  }

  function removeDraftDoc(id: string) {
    setDraftDocs((d) => d.filter((x) => x.id !== id));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function mockGoogle() {
    setAccount({ name: "Priyanka Mehta", email: "priyanka@cityhospital.in", password: "google-oauth-set" });
  }

  // Shared card for both the "new equipment" box and an "edit" box —
  // manufacturer/type/series/year, per-unit placement, and this entry's documents.
  function renderEquipmentForm(isEditing: boolean) {
    const showUnitPlacements = draft.manufacturer && draft.type && (parseInt(draft.units, 10) || 0) > 0;
    return (
      <div className={boxClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            {isEditing ? "Edit equipment" : batches.length === 0 ? "Add equipment" : "Add another equipment"}
          </h2>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className={btnLink}>
              Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Manufacturer">
            <Select value={draft.manufacturer} onValueChange={(v) => setDraft((d) => ({ ...d, manufacturer: v }))}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Select manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {MANUFACTURERS.map((m) => (
                  <SelectItem key={m} value={m} className={selectItemClass}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Equipment type">
            <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className={selectItemClass}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Units">
            <input
              type="number"
              min="1"
              className={inputBase}
              placeholder="4"
              value={draft.units}
              onChange={(e) => setUnitsCount(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Model / series">
            <input
              className={inputBase}
              placeholder="e.g. IntelliVue MX450"
              value={draft.series}
              onChange={(e) => setDraft((d) => ({ ...d, series: e.target.value }))}
            />
          </Field>
          <Field label="Year of manufacture">
            <input
              type="number"
              className={inputBase}
              placeholder="e.g. 2023"
              value={draft.year}
              onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text-primary">Lifecycle details</h3>
          <p className="mb-4 mt-1 text-sm text-text-secondary">
            Purchase, installation, and warranty — add now or edit later
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Purchase date">
              <input
                type="date"
                className={inputBase}
                value={draft.purchaseDate}
                onChange={(e) => setDraft((d) => ({ ...d, purchaseDate: e.target.value }))}
              />
            </Field>
            <Field label="Install date">
              <input
                type="date"
                className={inputBase}
                value={draft.installDate}
                onChange={(e) => setDraft((d) => ({ ...d, installDate: e.target.value }))}
              />
            </Field>
            <Field label="Warranty expiry">
              <input
                type="date"
                className={inputBase}
                value={draft.warrantyExpiry}
                onChange={(e) => setDraft((d) => ({ ...d, warrantyExpiry: e.target.value }))}
              />
            </Field>
          </div>
        </div>

        {showUnitPlacements && (
          <div className="mt-4 border-t border-border pt-4">
            <span className="text-sm font-medium text-text-primary">
              Place each unit <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <div className="mt-2 hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[80px_1fr_1fr_1fr_1fr] sm:gap-2 sm:px-4">
              <span>ID</span>
              <span>Floor</span>
              <span>Department / ward</span>
              <span>Room / bay</span>
              <span>Serial no.</span>
            </div>
            <div className="mt-2 space-y-2">
              {unitPlacements.map((u, idx) => {
                const wardOptions = floors.find((f) => f.name === u.floor)?.departments || [];
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-1 gap-2 rounded-lg bg-muted p-4 sm:grid-cols-[80px_1fr_1fr_1fr_1fr] sm:items-center"
                  >
                    <span className="font-mono text-xs font-semibold text-brand">{u.id}</span>
                    <Select
                      value={u.floor}
                      onValueChange={(v) => updateUnitPlacement(idx, { floor: v, ward: "" })}
                      disabled={floors.length === 0}
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder={floors.length === 0 ? "No floors yet" : "Floor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {floors.map((f) => (
                          <SelectItem key={f.id} value={f.name} className={selectItemClass}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={u.ward} onValueChange={(v) => updateUnitPlacement(idx, { ward: v })} disabled={!u.floor}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder={u.floor ? "Department / ward" : "Select a floor first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {wardOptions.map((w) => (
                          <SelectItem key={w} value={w} className={selectItemClass}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      className={inputBase}
                      placeholder="e.g. Bay 3"
                      value={u.room}
                      onChange={(e) => updateUnitPlacement(idx, { room: e.target.value })}
                    />
                    <input
                      className={inputBase}
                      placeholder="Serial no."
                      value={u.serial}
                      onChange={(e) => updateUnitPlacement(idx, { serial: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text-primary">Documents for this equipment</h3>
          <p className="mb-4 mt-1 text-sm text-text-secondary">
            Manuals, purchase bills, warranty cards — attach whatever you already have.
          </p>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select value={docDraft.type} onValueChange={(v) => setDocDraft((d) => ({ ...d, type: v }))}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className={selectItemClass}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={docDraft.appliesTo} onValueChange={(v) => setDocDraft((d) => ({ ...d, appliesTo: v }))}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Applies to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className={selectItemClass}>
                    All units
                  </SelectItem>
                  {unitPlacements.map((u) => (
                    <SelectItem key={u.id} value={u.id} className={selectItemClass}>
                      {u.id}
                      {u.ward ? ` · ${u.ward}` : u.room ? ` · ${u.room}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="file"
                onChange={(e) => setDocDraft((d) => ({ ...d, file: e.target.files?.[0] || null }))}
                className="w-full rounded-lg border border-input bg-surface px-4 py-2 text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-4 file:py-2 file:text-xs file:font-medium file:text-text-primary"
              />
              <button type="button" onClick={addDraftDoc} className={btnPrimary}>
                Save
              </button>
            </div>
          </div>

          {draftDocs.length > 0 && (
            <div className="mt-4 space-y-2">
              {draftDocs.map((d) => (
                <div
                  key={d.id}
                  className="meriva-row-in flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-text-primary">
                    <FileText size={16} className="text-text-secondary" />
                    {d.type} — {d.fileName}
                    <span className="text-muted-foreground">· {d.appliesTo === "all" ? "All units" : d.appliesTo}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDraftDoc(d.id)}
                    className="text-muted-foreground hover:text-text-secondary"
                    aria-label="Remove document"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={saveEquipment} className={btnPrimary + " mt-6"}>
          <Check size={16} /> Save equipment
        </button>
      </div>
    );
  }

  function renderEquipmentSummary(b: EquipmentBatch) {
    const placedCount = b.units.filter((u) => u.floor || u.ward || u.room).length;
    return (
      <div key={b.key} className={boxClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-text-primary">
              {b.type} · {b.manufacturer}
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              {[b.series, b.year].filter(Boolean).join(" · ") || "No model/year on file"}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => startEdit(b.key)} className={btnLink}>
              <span className="inline-flex items-center gap-1">
                <PencilSimple size={14} /> Edit
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeBatch(b.key)}
              className="text-muted-foreground hover:text-text-secondary"
              aria-label="Remove"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm text-text-secondary">
          <span className="font-mono">
            {b.units.slice(0, 3).map((u) => u.id).join(", ")}
            {b.units.length > 3 ? ` +${b.units.length - 3} more` : ""}
          </span>
          <span>
            {placedCount} of {b.units.length} placed
          </span>
          <span>
            {b.documents.length} document{b.documents.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    );
  }

  const canAdvance =
    step === 0
      ? Boolean(account.name.trim() && account.email.trim() && account.password.trim().length >= 8)
      : step === 1
      ? Boolean(
          hospital.name.trim() &&
            hospital.address.trim() &&
            hospital.city.trim() &&
            (contact.sameAsAdmin || (contact.name.trim() && contact.email.trim()))
        )
      : true;

  return (
    <div className="min-h-screen w-full bg-background px-4 py-10 md:py-16">
      <style>{`
        @keyframes merivaFadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes merivaRowIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .meriva-step-enter { animation: merivaFadeSlide 0.32s ease both; }
        .meriva-row-in { animation: merivaRowIn 0.28s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .meriva-step-enter, .meriva-row-in { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl">
        {/* Wordmark */}
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand">
            <Tag size={16} weight="bold" className="text-white" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-[0.18em] text-text-primary">MERIVA</span>
          <span className="text-sm text-text-secondary">Hospital Equipment Management</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <span className="text-sm font-medium text-text-secondary">
            Step {step + 1} of {STEPS.length}
          </span>
          <div className="mt-2 flex gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={"h-2 flex-1 rounded-full transition " + (i <= step ? "bg-brand" : "bg-muted")} />
            ))}
          </div>
        </div>

        <div key={step} className="meriva-step-enter">
          {step < 3 && (
            <div className="mb-6">
              <h1 className="text-2xl font-semibold leading-tight text-text-primary">{STEP_COPY[step].title}</h1>
              <p className="mt-2 text-base text-text-secondary">{STEP_COPY[step].desc}</p>
            </div>
          )}

          {step === 0 && (
            <div className={boxClass + " space-y-6"}>
              <button
                type="button"
                onClick={mockGoogle}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-text-primary transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.4 0 10.3-1.8 14-4.9l-6.5-5.5C29.5 35.4 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.9 39.8 16.4 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.5C40.9 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>

              <Field label="Your name" icon={User}>
                <input
                  className={inputBase}
                  placeholder="Full name"
                  value={account.name}
                  onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))}
                />
              </Field>

              <Field label="Email" icon={EnvelopeSimple}>
                <input
                  type="email"
                  className={inputBase}
                  placeholder="you@hospital.in"
                  value={account.email}
                  onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                />
              </Field>

              <Field label="Password" icon={Lock}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={inputBase + " pr-10"}
                    placeholder="8 characters or more"
                    value={account.password}
                    onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-secondary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className={boxClass + " space-y-6"}>
                <h2 className="text-base font-semibold text-text-primary">Hospital details</h2>

                <Field label="Hospital name" icon={Buildings}>
                  <input
                    className={inputBase}
                    placeholder="e.g. City Care Hospital"
                    value={hospital.name}
                    onChange={(e) => setHospital((h) => ({ ...h, name: e.target.value }))}
                  />
                </Field>

                <Field label="Address" icon={MapPin}>
                  <textarea
                    className={inputBase + " min-h-[72px] resize-none"}
                    placeholder="Full address"
                    value={hospital.address}
                    onChange={(e) => setHospital((h) => ({ ...h, address: e.target.value }))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" icon={MapPin}>
                    <input
                      className={inputBase}
                      placeholder="City"
                      value={hospital.city}
                      onChange={(e) => setHospital((h) => ({ ...h, city: e.target.value }))}
                    />
                  </Field>
                  <Field label="Number of beds" icon={Hash}>
                    <input
                      type="number"
                      min="0"
                      className={inputBase}
                      placeholder="e.g. 60"
                      value={hospital.beds}
                      onChange={(e) => setHospital((h) => ({ ...h, beds: e.target.value }))}
                    />
                  </Field>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                      <UserGear size={16} className="text-text-secondary" /> Point of contact
                    </span>
                    <label className="flex items-center gap-2 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={contact.sameAsAdmin}
                        onChange={(e) => setContact((c) => ({ ...c, sameAsAdmin: e.target.checked }))}
                        className="h-4 w-4 accent-primary"
                      />
                      Same as account admin
                    </label>
                  </div>

                  <Field label="Role">
                    <Select value={contact.role} onValueChange={(v) => setContact((c) => ({ ...c, role: v }))}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className={selectItemClass}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {contact.sameAsAdmin ? (
                    <div className="mt-4 rounded-lg bg-muted px-4 py-2.5 text-sm text-text-secondary">
                      {account.name || "Your name"} · {account.email || "your@email"}
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Name">
                        <input
                          className={inputBase}
                          placeholder="Contact's full name"
                          value={contact.name}
                          onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                        />
                      </Field>
                      <Field label="Email">
                        <input
                          type="email"
                          className={inputBase}
                          placeholder="contact@hospital.in"
                          value={contact.email}
                          onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                        />
                      </Field>
                    </div>
                  )}

                  <div className="mt-4">
                    <Field label="Phone number" icon={Phone}>
                      <input
                        type="tel"
                        className={inputBase}
                        placeholder="e.g. 98765 43210"
                        value={contact.phone}
                        onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className={boxClass + " space-y-6"}>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Hospital mapping</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Tell us how many floors you have, then add the departments and wards on each one.
                  </p>
                </div>

                <Field label="Number of floors" icon={Stack}>
                  <input
                    type="number"
                    min="0"
                    className={inputBase}
                    placeholder="e.g. 4"
                    value={floorCountInput}
                    onChange={(e) => setFloorCount(e.target.value)}
                  />
                </Field>

                {floors.length > 0 && (
                  <div className="space-y-4 border-t border-border pt-4">
                    {floors.map((f) => (
                      <div key={f.id} className="rounded-xl border border-border bg-muted p-4">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            className="w-full rounded-md border-none bg-transparent px-0 text-sm font-semibold text-text-primary outline-none focus:ring-0"
                            value={f.name}
                            onChange={(e) => renameFloor(f.id, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeFloor(f.id)}
                            className="text-muted-foreground hover:text-text-secondary"
                            aria-label={`Remove ${f.name}`}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {f.departments.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                            {f.departments.map((d) => (
                              <span
                                key={d}
                                className="flex items-center gap-2 rounded-full bg-[#EFDFC4]/60 px-3 py-1 text-xs font-medium text-[#7A5A22]"
                              >
                                {d}
                                <button type="button" onClick={() => removeDeptFromFloor(f.id, d)} aria-label={`Remove ${d} from ${f.name}`}>
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <input
                            className={inputBase}
                            placeholder="Add a department or ward on this floor"
                            value={deptDraft[f.id] || ""}
                            onChange={(e) => setDeptDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addDeptToFloor(f.id, deptDraft[f.id] || "");
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => addDeptToFloor(f.id, deptDraft[f.id] || "")}
                            className="flex items-center gap-1 rounded-lg bg-black px-4 text-sm font-medium text-white transition hover:bg-black/80"
                          >
                            <Plus size={16} /> Add
                          </button>
                        </div>

                        {DEPT_SUGGESTIONS.filter((d) => !f.departments.includes(d)).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {DEPT_SUGGESTIONS.filter((d) => !f.departments.includes(d))
                              .slice(0, 6)
                              .map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => addDeptToFloor(f.id, d)}
                                  className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-text-secondary transition hover:border-primary hover:text-primary"
                                >
                                  + {d}
                                </button>
                              ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
                          <button
                            type="button"
                            onClick={() => clearFloorDepts(f.id)}
                            disabled={f.departments.length === 0}
                            className={btnGhost}
                          >
                            Clear
                          </button>
                          <button type="button" onClick={() => saveFloorDepts(f.id)} className={btnPrimary}>
                            {savedFloorDepts[f.id] ? (
                              <>
                                <Check size={16} /> Saved
                              </>
                            ) : (
                              "Save"
                            )}
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-col items-end gap-2 border-t border-border pt-4">
                      <button type="button" onClick={saveFloors} className={btnPrimary}>
                        <Check size={16} /> Save floors
                      </button>
                      {floorsSaved && <p className="text-xs text-text-secondary">Floor layout saved.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {batches.map((b) => (editingKey === b.key ? renderEquipmentForm(true) : renderEquipmentSummary(b)))}
              {editingKey === null && renderEquipmentForm(false)}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-4 text-center">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <CheckCircle size={32} />
                </div>
                <h1 className="text-2xl font-semibold text-text-primary">You&apos;re in — {hospital.name || "your hospital"} is ready.</h1>
                <p className="mt-2 max-w-md text-base text-text-secondary">
                  No waiting on approval — you can start using Meriva right away. Nothing below is final: every detail here can be changed
                  later from Settings.
                </p>
              </div>

              <div className={boxClass}>
                <h2 className="mb-4 text-base font-semibold text-text-primary">Signup summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Hospital</span>
                    <span className="text-right font-medium text-text-primary">{hospital.name || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-right font-medium text-text-primary">{hospital.city || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Beds</span>
                    <span className="text-right font-medium text-text-primary">{hospital.beds || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Floors</span>
                    <span className="text-right font-medium text-text-primary">{floors.length}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Departments &amp; wards</span>
                    <span className="text-right font-medium text-text-primary">{totalDepartments}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Point of contact</span>
                    <span className="text-right font-medium text-text-primary">
                      {contactName || "—"}
                      {contact.role ? ` · ${contact.role}` : ""}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Equipment added</span>
                    <span className="text-right font-medium text-text-primary">{totalEquipment} units</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Documents attached</span>
                    <span className="text-right font-medium text-text-primary">{totalDocuments}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2 border-t border-border pt-3">
                    <span className="text-muted-foreground">Hospital ID</span>
                    <span className="font-mono text-right font-medium text-text-primary">{hospitalId}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <button type="button" onClick={() => setDashboardClicked(true)} className={btnPrimary}>
                  Go to dashboard
                </button>
                {dashboardClicked && <p className="mt-3 text-xs text-text-secondary">Opening your dashboard…</p>}
              </div>
            </div>
          )}

          {step < 3 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="flex items-center gap-1 text-sm font-medium text-text-secondary disabled:opacity-0"
              >
                <CaretLeft size={16} /> Back
              </button>

              {step === 2 ? (
                <div className="flex items-center gap-4">
                  <button type="button" onClick={next} className={btnGhost}>
                    Skip for now
                  </button>
                  <button type="button" onClick={next} className={btnPrimary}>
                    Next <CaretRight size={16} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={next} disabled={!canAdvance} className={btnPrimary}>
                  Continue <CaretRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
