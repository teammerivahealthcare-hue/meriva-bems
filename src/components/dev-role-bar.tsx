"use client";

import { useRouter } from "next/navigation";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { useDemo, usePortalUser } from "@/lib/bems";

/**
 * Dev-only role switcher, pinned above every portal screen via PortalShell --
 * the single stand-in for logging in as either role while there's no auth
 * backend. Switching navigates to the target role's own home page: several
 * /staff/* and /engineer/* pages sync the store's role to match their URL on
 * mount, so a switch that didn't also navigate would just get overwritten by
 * whatever page-level effect runs next.
 */
export function DevRoleBar() {
  const router = useRouter();
  const user = usePortalUser();
  const setPortalRole = useDemo((s) => s.setPortalRole);
  const isEngineer = user.role === "ENGINEER";

  return (
    <button
      type="button"
      onClick={() => {
        const target = isEngineer ? "STAFF" : "ENGINEER";
        setPortalRole(target);
        router.push(target === "ENGINEER" ? "/engineer" : "/staff");
      }}
      className="flex shrink-0 items-center justify-between gap-2 bg-amber-100 px-4 py-1.5 text-left text-[11px] font-medium text-amber-900 transition-colors hover:bg-amber-200"
    >
      <span>DEV · Viewing as {isEngineer ? "Internal engineer" : "General staff"}</span>
      <span className="flex shrink-0 items-center gap-1 underline underline-offset-2">
        <ArrowsLeftRight size={11} /> Switch to {isEngineer ? "Staff" : "Engineer"}
      </span>
    </button>
  );
}
