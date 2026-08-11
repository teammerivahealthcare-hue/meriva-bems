"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Copy, Check } from "@phosphor-icons/react";
import { useDemo, type TeamRole } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/breadcrumb";

const ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: "ENGINEER", label: "Internal engineer" },
  { value: "STAFF", label: "General staff" },
];

interface GeneratedCredentials {
  name: string;
  staffId: string;
  password: string;
}

function CredentialRow({ label, value, withBorder }: { label: string; value: string; withBorder?: boolean }) {
  return (
    <div className={cn("p-3", withBorder && "border-b")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

export default function AddTeamMemberPage() {
  const router = useRouter();
  const addTeamMember = useDemo((s) => s.addTeamMember);

  const [role, setRole] = useState<TeamRole>("ENGINEER");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = name.trim() !== "" && phone.trim() !== "";

  async function handleCopyCredentials() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Staff ID: ${credentials.staffId}\nPassword: ${credentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (permissions, non-HTTPS) — fail quietly.
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const { staffId, password } = addTeamMember({
      role,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
    });
    setCredentials({ name: name.trim(), staffId, password });
  }

  if (credentials) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardContent className="space-y-5 pt-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle size={28} weight="fill" className="text-success" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{credentials.name} added</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the only time the password is shown in full — make sure to share it with them now.
              </p>
            </div>
            <div className="space-y-3 text-left">
              <div className="rounded-lg border">
                <CredentialRow label="Staff ID" value={credentials.staffId} withBorder />
                <CredentialRow label="Password" value={credentials.password} />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={handleCopyCredentials}>
                {copied ? (
                  <>
                    <Check /> Copied
                  </>
                ) : (
                  <>
                    <Copy /> Copy staff ID &amp; password
                  </>
                )}
              </Button>
            </div>
            <Button className="w-full" onClick={() => router.push("/team")}>
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Team", href: "/team" }, { label: "Add team member" }]} />
        <h1 className="mt-3 text-2xl font-semibold">Add team member</h1>
        <p className="text-sm text-muted-foreground">
          Generates a staff ID and password they&apos;ll use to log in.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Role determines what this person can see and do.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Role</span>
              <div className="inline-flex w-full rounded-lg border p-1">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      role === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="team-name">
                Full name
              </label>
              <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Suresh Patil" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="team-phone">
                Phone number
              </label>
              <Input
                id="team-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98230 00000"
              />
              <p className="text-xs text-muted-foreground">Required — this becomes their login identifier.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="team-email">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id="team-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.example"
              />
              <p className="text-xs text-muted-foreground">Contact info only — not used for login.</p>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              Generate credentials
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
