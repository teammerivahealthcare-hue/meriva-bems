/** Matches signup/page.tsx's inline segmented step bar visually — built fresh here since that one isn't an extracted component, and signup itself stays untouched. */
export function PmSectionProgress({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="space-y-1.5 px-5 pt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Section {current + 1} of {total} — {label}
      </p>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= current ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}
