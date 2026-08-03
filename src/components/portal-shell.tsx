import type { ReactNode } from "react";

/**
 * Phone-frame shell for the staff/engineer mobile portal (Home, Profile,
 * /qrscanstart) — visually distinct from the admin (dashboard) shell since
 * this surface is meant to be used on a phone, not a desktop browser.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh justify-center bg-zinc-100 py-0 sm:py-8">
      <div className="flex h-svh w-full max-w-[430px] flex-col overflow-y-auto bg-background sm:h-[860px] sm:rounded-[2.5rem] sm:border sm:border-zinc-300 sm:shadow-2xl">
        {children}
      </div>
    </div>
  );
}
