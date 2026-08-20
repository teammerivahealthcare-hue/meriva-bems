"use client";

import { useState, type FormEvent } from "react";
import {
  Buildings,
  MapPin,
  ImageSquare,
  UploadSimple,
  Stack,
  Plus,
  X,
  Check,
  Key,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import {
  useDemo,
  equipmentCountForDepartment,
  equipmentCountForFloor,
  ALERT_TYPE_LABEL,
  ALERT_TYPE_DESCRIPTION,
  NOTIFICATION_CHANNEL_LABEL,
  type AlertType,
  type NotificationChannel,
  type NotificationPreference,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const CONTACT_ROLES = [
  "Hospital Administrator",
  "Facility Manager",
  "Biomedical Engineer",
  "Owner / Director",
  "Other",
];

const CHANNEL_OPTIONS: NotificationChannel[] = ["IN_APP", "WHATSAPP", "EMAIL"];
const ALERT_TYPES: AlertType[] = [
  "BREAKDOWN_FLAGGED",
  "PM_DUE",
  "WARRANTY_EXPIRING",
  "APPROVAL_REQUESTS",
  "UNAPPROVED_USE",
];

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SavedNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Check size={14} /> Saved
    </span>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Hospital details, floor layout, notifications, and your account.
        </p>
      </div>

      <Tabs defaultValue="hospital">
        <TabsList variant="line">
          <TabsTrigger value="hospital">Hospital</TabsTrigger>
          <TabsTrigger value="floors">Floor setup</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="hospital" className="pt-4">
          <HospitalTab />
        </TabsContent>
        <TabsContent value="floors" className="pt-4">
          <FloorSetupTab />
        </TabsContent>
        <TabsContent value="notifications" className="pt-4">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="account" className="pt-4">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hospital — name, address, logo, and point of contact. The
// contact block reuses the exact "same as admin" shape and default
// from the signup flow's Hospital step, just wired to the real admin.
// ─────────────────────────────────────────────────────────────

function HospitalTab() {
  const facility = useDemo((s) => s.facility);
  const updateFacility = useDemo((s) => s.updateFacility);
  const contact = useDemo((s) => s.facilityContact);
  const updateFacilityContact = useDemo((s) => s.updateFacilityContact);
  const account = useDemo((s) => s.account);

  const [name, setName] = useState(facility.name);
  const [address, setAddress] = useState(facility.address ?? "");
  const [logoUrl, setLogoUrl] = useState(facility.logoUrl);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);

  const [sameAsAdmin, setSameAsAdmin] = useState(contact.sameAsAdmin);
  const [role, setRole] = useState(contact.role);
  const [contactName, setContactName] = useState(contact.name ?? "");
  const [contactEmail, setContactEmail] = useState(contact.email ?? "");
  const [contactPhone, setContactPhone] = useState(contact.phone ?? "");

  const [saved, setSaved] = useState(false);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFileName(file.name);
    setLogoUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateFacility({ name: name.trim(), address: address.trim(), logoUrl });
    updateFacilityContact({
      sameAsAdmin,
      role,
      name: sameAsAdmin ? undefined : contactName.trim(),
      email: sameAsAdmin ? undefined : contactEmail.trim(),
      phone: contactPhone.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Hospital details</CardTitle>
          <CardDescription>Shown across the app, and to whoever we hand the point-of-contact info to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Hospital name" htmlFor="hospital-name">
              <div className="relative">
                <Buildings size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="hospital-name" className="pl-8" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </Field>

            <Field label="Logo">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageSquare size={16} className="text-muted-foreground" />
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium hover:bg-muted">
                  <UploadSimple size={14} />
                  {logoFileName ?? "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>
            </Field>
          </div>

          <Field label="Address" htmlFor="hospital-address">
            <div className="relative">
              <MapPin size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="hospital-address" className="pl-8" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </Field>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Point of contact</p>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={sameAsAdmin} onCheckedChange={(v) => setSameAsAdmin(v === true)} />
                Same as account admin
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Role">
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Phone">
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98230 00000" />
              </Field>
            </div>

            {sameAsAdmin ? (
              <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                {account.name} · {account.email}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <SavedNote show={saved} />
          <Button type="submit">Save changes</Button>
        </CardFooter>
      </Card>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Floor setup — the floor → department hierarchy, editable. Add/remove
// take effect immediately (same as the signup flow's floor mapping
// step); removing something with equipment on it asks for confirmation
// first instead of silently orphaning that equipment.
// ─────────────────────────────────────────────────────────────

type RemoveTarget =
  | { kind: "floor"; id: string; name: string; equipmentCount: number }
  | { kind: "department"; id: string; name: string; equipmentCount: number };

function FloorSetupTab() {
  const floors = useDemo((s) => s.floors);
  const departments = useDemo((s) => s.departments);
  const addFloor = useDemo((s) => s.addFloor);
  const renameFloor = useDemo((s) => s.renameFloor);
  const removeFloor = useDemo((s) => s.removeFloor);
  const addDepartment = useDemo((s) => s.addDepartment);
  const removeDepartment = useDemo((s) => s.removeDepartment);

  const [newFloorName, setNewFloorName] = useState("");
  const [deptDraft, setDeptDraft] = useState<Record<string, string>>({});
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  function handleAddFloor() {
    const trimmed = newFloorName.trim();
    if (!trimmed) return;
    addFloor(trimmed);
    setNewFloorName("");
  }

  function handleAddDepartment(floorId: string) {
    const trimmed = (deptDraft[floorId] ?? "").trim();
    if (!trimmed) return;
    addDepartment(floorId, trimmed);
    setDeptDraft((d) => ({ ...d, [floorId]: "" }));
  }

  function requestRemoveFloor(floorId: string) {
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return;
    const equipmentCount = equipmentCountForFloor(departments, floor.number);
    if (equipmentCount === 0) {
      removeFloor(floorId);
      return;
    }
    setRemoveTarget({ kind: "floor", id: floorId, name: floor.name, equipmentCount });
  }

  function requestRemoveDepartment(deptId: string, deptName: string) {
    const equipmentCount = equipmentCountForDepartment(deptId);
    if (equipmentCount === 0) {
      removeDepartment(deptId);
      return;
    }
    setRemoveTarget({ kind: "department", id: deptId, name: deptName, equipmentCount });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    if (removeTarget.kind === "floor") removeFloor(removeTarget.id);
    else removeDepartment(removeTarget.id);
    setRemoveTarget(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Floor setup</CardTitle>
          <CardDescription>Map out your floors and the departments or wards on each one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {floors.map((floor) => {
            const floorDepartments = departments.filter((d) => d.floor === floor.number);
            return (
              <div key={floor.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={floor.name}
                    onChange={(e) => renameFloor(floor.id, e.target.value)}
                    className="h-auto border-none bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => requestRemoveFloor(floor.id)}
                    aria-label={`Remove ${floor.name}`}
                  >
                    <X size={16} />
                  </Button>
                </div>

                {floorDepartments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    {floorDepartments.map((d) => {
                      const count = equipmentCountForDepartment(d.id);
                      return (
                        <span
                          key={d.id}
                          className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium"
                        >
                          {d.name}
                          {count > 0 && <span className="text-muted-foreground">({count})</span>}
                          <button
                            type="button"
                            onClick={() => requestRemoveDepartment(d.id, d.name)}
                            aria-label={`Remove ${d.name}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Input
                    placeholder="Add a department or ward on this floor"
                    value={deptDraft[floor.id] ?? ""}
                    onChange={(e) => setDeptDraft((d) => ({ ...d, [floor.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDepartment(floor.id);
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => handleAddDepartment(floor.id)}>
                    <Plus size={14} /> Add
                  </Button>
                </div>
              </div>
            );
          })}

          {floors.length === 0 && (
            <EmptyState icon={Buildings} message="No floors mapped yet — add one below." />
          )}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <div className="flex flex-1 gap-2">
            <Input
              placeholder="e.g. 4th Floor"
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddFloor();
                }
              }}
              className="max-w-64 bg-background"
            />
            <Button type="button" variant="outline" onClick={handleAddFloor}>
              <Stack size={14} /> Add floor
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.name}?</DialogTitle>
            <DialogDescription>
              {removeTarget?.equipmentCount} piece{removeTarget?.equipmentCount === 1 ? "" : "s"} of equipment{" "}
              {removeTarget?.kind === "floor" ? "on this floor are" : "assigned here is"} still on file. Removing{" "}
              {removeTarget?.kind === "floor" ? "this floor" : "this department"} won&apos;t delete that equipment,
              but it will need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmRemove}>
              Remove anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Notifications — one row per alert type, each with its own on/off
// state and delivery channel. Edits stage locally until Save.
// ─────────────────────────────────────────────────────────────

function NotificationsTab() {
  const stored = useDemo((s) => s.notificationPreferences);
  const updateNotificationPreference = useDemo((s) => s.updateNotificationPreference);

  const [draft, setDraft] = useState<NotificationPreference[]>(stored);
  const [saved, setSaved] = useState(false);

  function patchRow(alertType: AlertType, patch: Partial<NotificationPreference>) {
    setDraft((rows) => rows.map((r) => (r.alertType === alertType ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    for (const row of draft) {
      updateNotificationPreference(row.alertType, { enabled: row.enabled, channel: row.channel });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what raises an alert, and where it should show up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {ALERT_TYPES.map((alertType, i) => {
            const row = draft.find((r) => r.alertType === alertType);
            if (!row) return null;
            return (
              <div key={alertType}>
                {i > 0 && <Separator className="my-3" />}
                <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(v) => patchRow(alertType, { enabled: v })}
                    />
                    <div>
                      <p className="text-sm font-medium">{ALERT_TYPE_LABEL[alertType]}</p>
                      <p className="text-xs text-muted-foreground">{ALERT_TYPE_DESCRIPTION[alertType]}</p>
                    </div>
                  </div>
                  <Select
                    value={row.channel}
                    onValueChange={(v) => patchRow(alertType, { channel: v as NotificationChannel })}
                    disabled={!row.enabled}
                  >
                    <SelectTrigger className="w-36" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNEL_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {NOTIFICATION_CHANNEL_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <SavedNote show={saved} />
          <Button type="submit">Save changes</Button>
        </CardFooter>
      </Card>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Account — the logged-in admin's own name/email, plus a change
// password action. No real auth backend here, so "change password"
// is a self-contained confirmation, same spirit as Team's demo credentials.
// ─────────────────────────────────────────────────────────────

function AccountTab() {
  const account = useDemo((s) => s.account);
  const updateAccount = useDemo((s) => s.updateAccount);

  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [saved, setSaved] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateAccount({ name: name.trim(), email: email.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your own login details for this hospital&apos;s admin account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="account-name">
              <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="account-email">
              <Input id="account-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Last changed — not tracked in this demo.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setPasswordOpen(true)}>
              <Key size={14} /> Change password
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <SavedNote show={saved} />
          <Button type="submit">Save changes</Button>
        </CardFooter>
      </Card>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </form>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit = current !== "" && next !== "" && next === confirm;

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setDone(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>Password updated</DialogTitle>
              <DialogDescription>Use your new password next time you sign in.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>Choose a new password for your admin login.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Field label="Current password" htmlFor="pwd-current">
                <Input id="pwd-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </Field>
              <Field label="New password" htmlFor="pwd-new">
                <Input id="pwd-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
              </Field>
              <Field label="Confirm new password" htmlFor="pwd-confirm">
                <Input id="pwd-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
              {next !== "" && confirm !== "" && next !== confirm && (
                <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!canSubmit}>
                Update password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
