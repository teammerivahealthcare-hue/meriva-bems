import Link from "next/link";
import { ArrowsLeftRight } from "@phosphor-icons/react";

/**
 * DEV-ONLY — lets us jump between the nurse and engineer scan flows while both
 * are being built out in parallel. Renders nothing in production, so it never
 * reaches real users; delete this file (and its two call sites) once the two
 * flows are done and real navigation/role-routing decides which one to show.
 */
export function QrScanDevSwitch({ current }: { current: "nurse" | "engineer" }) {
  if (process.env.NODE_ENV === "production") return null;

  const other = current === "nurse" ? "engineer" : "nurse";

  return (
    <Link
      href={`/qrscanstart${other}`}
      className="flex items-center justify-between gap-2 border-b bg-amber-50 px-4 py-1.5 text-[11px] text-amber-800"
    >
      <span>Dev: viewing {current} flow</span>
      <span className="flex items-center gap-1 font-medium">
        <ArrowsLeftRight size={11} /> Switch to {other}
      </span>
    </Link>
  );
}
