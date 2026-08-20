import { type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function EmptyState({ icon: IconCmp, message, actionLabel }: { icon: Icon; message: string; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
      <IconCmp size={22} className="text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {actionLabel && (
        <Button variant="outline" size="sm" disabled>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
