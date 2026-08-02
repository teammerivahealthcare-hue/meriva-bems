import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Full-path breadcrumb — every screen renders its whole ancestry (not just
 * a "back" link), with a single hairline rule underneath shared across all
 * usages via the border-border token.
 */
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 border-b border-border pb-3 text-sm", className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {item.href && !isLast ? (
              <Link href={item.href} className="truncate text-muted-foreground hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={cn("truncate", isLast ? "font-medium text-foreground" : "text-muted-foreground")}>
                {item.label}
              </span>
            )}
            {!isLast && <CaretRight size={12} className="shrink-0 text-muted-foreground" />}
          </span>
        );
      })}
    </nav>
  );
}
