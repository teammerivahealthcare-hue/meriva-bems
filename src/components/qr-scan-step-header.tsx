import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";

export function StepHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-4">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <CaretLeft size={18} />
        </button>
      ) : (
        <Link href="/home" aria-label="Back to home" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <CaretLeft size={18} />
        </Link>
      )}
      <h1 className="text-base font-semibold">{title}</h1>
    </header>
  );
}
