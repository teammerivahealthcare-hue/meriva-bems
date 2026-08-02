"use client";

import type { Icon } from "@phosphor-icons/react";
import { CaretRight } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChangeDirection = "positive" | "negative";

export interface SummaryCardProps {
  title: string;
  value: string;
  changeValue?: string;
  changeDirection?: ChangeDirection;
  icon: Icon;
  footerLeadText: string;
  footerText: string;
  onClick?: () => void;
  className?: string;
}

const CHANGE_BADGE_CLASS: Record<ChangeDirection, string> = {
  positive: "bg-success/10 text-success border-success/30",
  negative: "bg-danger/10 text-danger border-danger/30",
};

/**
 * The one stat-card shape for the whole app — outer tinted well, inner white
 * card, footer row below. Change the look here and every dashboard/list
 * metric picks it up. See /design-system for the full component reference.
 */
export function SummaryCard({
  title,
  value,
  changeValue,
  changeDirection = "positive",
  icon: IconCmp,
  footerLeadText,
  footerText,
  onClick,
  className,
}: SummaryCardProps) {
  const interactive = !!onClick;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-card bg-neutral-100 p-3",
        interactive && "cursor-pointer transition-shadow hover:shadow-sm",
        className
      )}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="rounded-xl bg-surface p-4">
        <p className="text-sm text-text-secondary">{title}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-medium leading-none">{value}</p>
            {changeValue && (
              <Badge variant="outline" className={CHANGE_BADGE_CLASS[changeDirection]}>
                {changeValue}
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
        <CaretRight size={20} className="shrink-0 text-text-secondary" />
      </div>
    </div>
  );
}
