"use client";

import type { Icon } from "@phosphor-icons/react";
import { CaretRight } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChangeDirection = "positive" | "negative";

export interface SummaryCardProps {
  title: string;
  value: string;
  changeDirection?: ChangeDirection;
  icon: Icon;
  footerLeadText: string;
  footerText: string;
  showChevron?: boolean;
  className?: string;
}

const CHANGE_BADGE_CLASS: Record<ChangeDirection, string> = {
  positive: "bg-success/10 text-success border-success/30",
  negative: "bg-danger/10 text-danger border-danger/30",
};

const CHANGE_BADGE_TEXT: Record<ChangeDirection, string> = {
  positive: "22% increase",
  negative: "22% decrease",
};

/**
 * The one stat-card shape for the whole app — outer tinted well, inner white
 * card, footer row below. Change the look here and every dashboard/list
 * metric picks it up. See /design-system for the full component reference.
 */
export function SummaryCard({
  title,
  value,
  changeDirection,
  icon: IconCmp,
  footerLeadText,
  footerText,
  showChevron = true,
  className,
}: SummaryCardProps) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-card bg-neutral-100 p-3", className)}>
      <div className="rounded-xl bg-surface p-4">
        <p className="text-sm text-text-secondary">{title}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-medium leading-none">{value}</p>
            {changeDirection && (
              <Badge variant="outline" className={CHANGE_BADGE_CLASS[changeDirection]}>
                {CHANGE_BADGE_TEXT[changeDirection]}
              </Badge>
            )}
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border">
            <IconCmp size={16} />
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-sm">
          <span className="font-semibold">{footerLeadText}</span>{" "}
          <span className="text-text-secondary">{footerText}</span>
        </p>
        {showChevron && <CaretRight size={20} className="shrink-0 text-text-secondary" />}
      </div>
    </div>
  );
}
