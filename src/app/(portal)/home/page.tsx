"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortalUser } from "@/lib/bems";

/**
 * /home no longer has content of its own -- it's a role router. Every
 * existing "back to home" link across the portal (StepHeader, the qr-scan
 * result screens, PmReportDoneStep, etc.) still points here, so those all
 * keep working; this just forwards to the role-appropriate dashboard
 * instead of rendering a shared screen.
 */
export default function PortalHomeRedirect() {
  const router = useRouter();
  const user = usePortalUser();

  useEffect(() => {
    router.replace(user.role === "ENGINEER" ? "/engineer" : "/staff");
  }, [router, user.role]);

  return null;
}
