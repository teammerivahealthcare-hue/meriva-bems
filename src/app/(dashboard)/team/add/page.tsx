"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Copy, Check, ArrowLeft } from "@phosphor-icons/react";
import { useDemo, type TeamRole } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: "ENGINEER", label: "Internal engineer" },
  { value: "STAFF", label: "General staff" },
];

interface GeneratedCredentials {
  name: string;
  staffId: string;
  password: string;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (permissions, non-HTTPS) — fail quietly.
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-base font-semibold">{value}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {copied ? (
          <>
            <Check /> Copied
          </>
        ) : (
          <>
            <Copy /> Copy
          </>
        )}
      </Button>
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

  const canSubmit = name.trim() !== "" && phone.trim() !== "";

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
            <div className="space-y-2 text-left">
              <CopyRow label="Staff ID" value={credentials.staffId} />
              <CopyRow label="Password" value={credentials.password} />
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
        <Link href="/team" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft size={14} /> Team
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Add team member</h1>
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
