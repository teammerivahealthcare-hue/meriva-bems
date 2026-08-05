"use client";

import type { Icon } from "@phosphor-icons/react";
import { CaretRight } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChangeDirection = "positive" | "negative";

/**
 * Non-status accents for the icon well — deliberately distinct from the
 * status palette (success/warning/accent-sky/danger/neutral) used for
 * equipment state elsewhere, so a stat tile's icon never reads as a status.
 */
export type IconAccent = "blue" | "violet" | "indigo" | "cyan" | "fuchsia" | "purple" | "pink" | "teal";

export interface SummaryCardProps {
  title: string;
  value: string;
  changeDirection?: ChangeDirection;
  icon: Icon;
  iconColor?: IconAccent;
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

const ICON_ACCENT_CLASS: Record<IconAccent, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  violet: { bg: "bg-violet-100", text: "text-violet-700" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-700" },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-700" },
  fuchsia: { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  pink: { bg: "bg-pink-100", text: "text-pink-700" },
  teal: { bg: "bg-teal-100", text: "text-teal-700" },
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
  iconColor = "violet",
  footerLeadText,
  footerText,
  showChevron = true,
  className,
}: SummaryCardProps) {
  const accent = ICON_ACCENT_CLASS[iconColor];
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
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", accent.bg)}>
            <IconCmp size={16} weight="fill" className={accent.text} />
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
