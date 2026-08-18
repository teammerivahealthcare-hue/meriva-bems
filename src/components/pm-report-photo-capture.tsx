"use client";

import { useRef } from "react";
import { Camera, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * The one shared photo-capture piece for this feature — used by PHOTO-type
 * checklist items and the Findings screen's free-floating photos. Same
 * hidden-file-input + FileReader-to-data-URL mechanism already used
 * elsewhere in the app (no camera API anywhere here), just not duplicated a
 * further time within this feature. Doesn't touch the existing duplicates
 * in use-qr-scan-flow.ts / qr-scan-breakdown-form-step.tsx / equipment/add —
 * those stay as they are.
 */
export function PmPhotoCapture({
  photos,
  onAdd,
  onRemove,
  label = "Attach photo",
}: {
  photos: string[];
  onAdd: (dataUrl: string) => void;
  onRemove: (index: number) => void;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onAdd(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-16 rounded-md border object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border bg-background shadow-sm"
              >
                <Trash size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
        <Camera size={14} /> {label}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
