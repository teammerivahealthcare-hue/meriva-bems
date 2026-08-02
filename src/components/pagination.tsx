"use client";

import { useState } from "react";
import { CaretDoubleLeft, CaretDoubleRight, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

type PageToken = number | "ellipsis";

function getPageTokens(current: number, total: number): PageToken[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const keep = new Set<number>([1, 2, 3, total, current, current - 1, current + 1]);
  const pages = Array.from(keep)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const tokens: PageToken[] = [];
  let prev = 0;
  for (const p of pages) {
    if (prev && p - prev > 1) tokens.push("ellipsis");
    tokens.push(p);
    prev = p;
  }
  return tokens;
}

/** Shared list-page pagination footer — page-size select, page numbers, and a "go to" jump. */
export function Pagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [goTo, setGoTo] = useState("");

  function submitGoTo() {
    const target = Number(goTo);
    if (Number.isFinite(target) && target >= 1 && target <= totalPages) {
      onPageChange(Math.trunc(target));
    }
    setGoTo("");
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 bg-surface px-4 py-3", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Showing per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger size="sm" className="w-[76px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <CaretDoubleLeft size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <CaretLeft size={14} />
        </Button>

        {getPageTokens(page, totalPages).map((token, i) =>
          token === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="flex size-9 items-center justify-center text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={token}
              variant={token === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(token)}
              aria-current={token === page ? "page" : undefined}
            >
              {token}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <CaretRight size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <CaretDoubleRight size={14} />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Go to</span>
        <Input
          type="number"
          min={1}
          max={totalPages}
          value={goTo}
          onChange={(e) => setGoTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitGoTo();
          }}
          placeholder={String(page)}
          className="h-8 w-16"
        />
        <Button variant="link" size="sm" className="h-8 px-0" onClick={submitGoTo}>
          Go
        </Button>
      </div>
    </div>
  );
}
