"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Widget-style dashboard card: title and a "View all ↗" link in the header,
 * a rule under it, then the body. Dashboards lay these out two per row
 * (`grid gap-6 lg:grid-cols-2`) so every widget gets half the canvas.
 */
export function DashboardWidget({
  title,
  href,
  actionLabel = "View all",
  children,
  className,
}: {
  title: string;
  href?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-0 p-6", className)}>
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <h2 className="text-xl font-medium">{title}</h2>
        {href && (
          <Button asChild variant="secondary" className="gap-2 px-4">
            <Link href={href}>
              {actionLabel} <ArrowUpRight size={16} />
            </Link>
          </Button>
        )}
      </div>
      <div className="flex-1 pt-5">{children}</div>
    </Card>
  );
}
