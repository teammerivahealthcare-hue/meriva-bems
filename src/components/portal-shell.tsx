import type { ReactNode } from "react";
import { DevRoleBar } from "@/components/dev-role-bar";

/**
 * Phone-frame shell for the staff/engineer mobile portal (Home, Profile,
 * scan flows, repair/PM report flows) — visually distinct from the admin
 * (dashboard) shell since this surface is meant to be used on a phone, not a
 * desktop browser. DevRoleBar is pinned here (outside the scrollable content
 * area) so it's the one, always-visible role switcher across every portal
 * screen, not just Profile.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh justify-center bg-zinc-100 py-0 sm:py-8">
      <div className="flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-background sm:h-[860px] sm:rounded-[2.5rem] sm:border sm:border-zinc-300 sm:shadow-2xl">
        <DevRoleBar />
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
