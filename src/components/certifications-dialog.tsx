"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, DownloadSimple } from "@phosphor-icons/react";
import { expiryStatus, formatDate, type EquipmentDocument } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_BADGE_CLASS: Record<"ACTIVE" | "EXPIRING" | "EXPIRED", string> = {
  ACTIVE: "bg-success/10 text-success border-success/30",
  EXPIRING: "bg-warning/10 text-warning border-warning/30",
  EXPIRED: "bg-danger/10 text-danger border-danger/30",
};

const STATUS_LABEL: Record<"ACTIVE" | "EXPIRING" | "EXPIRED", string> = {
  ACTIVE: "Active",
  EXPIRING: "Expiring soon",
  EXPIRED: "Expired",
};

interface CertificationsDialogProps {
  documents: (EquipmentDocument & { expiryDate: string })[];
  /** Opens automatically — set when arriving via the Equipment list's Certifications link. */
  autoOpen?: boolean;
}

/** Overlay listing every certification/insurance document, with view/download actions and status. */
export function CertificationsDialog({ documents, autoOpen = false }: CertificationsDialogProps) {
  const [open, setOpen] = useState(autoOpen);
  const router = useRouter();
  const pathname = usePathname();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && autoOpen) {
      // Drop ?certModal=open so a refresh doesn't reopen it.
      router.replace(`${pathname}?tab=contracts`, { scroll: false });
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        View certification details
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton className="w-full max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Certifications &amp; insurance</DialogTitle>
            <DialogDescription>
              {documents.length} document{documents.length === 1 ? "" : "s"} on file for this unit
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
            {documents.length > 0 ? (
              documents.map((doc) => {
                const { status, offsetDays } = expiryStatus(doc.expiryDate);
                return (
                  <div key={doc.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{doc.label ?? doc.fileName}</p>
                      <Badge variant="outline" className={STATUS_BADGE_CLASS[status]}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(doc.expiryDate)} ·{" "}
                      {status === "EXPIRED" ? `Expired ${Math.abs(offsetDays)} days ago` : `${offsetDays} days left`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`#doc-${doc.id}`}>
                          <Eye size={14} /> View
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`#doc-${doc.id}`} download>
                          <DownloadSimple size={14} /> Download
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No certification or insurance documents on file.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
