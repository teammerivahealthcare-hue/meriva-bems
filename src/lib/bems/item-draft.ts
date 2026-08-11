/**
 * Meriva BEMS — Add-item draft shape
 *
 * Mirrors equipment-draft.ts: the in-progress state of the Items tab on
 * /equipment/add before it's submitted via "Add item". Purchase bill is
 * kept as filename/size metadata only — there's no file storage backend,
 * same simplification the equipment photo would need if it weren't small
 * enough to inline as a data URL.
 */

import type { ConsumableCategory } from './types';

export interface ItemDraftData {
  name: string;
  category: ConsumableCategory;
  unit: string;
  reorderThreshold: string;
  initialQuantity: string;
  purchaseBillFileName: string;
  purchaseBillFileSizeKb: number | null;
}

export interface ItemDraft extends ItemDraftData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function emptyItemDraftData(): ItemDraftData {
  return {
    name: '',
    category: 'GENERAL',
    unit: '',
    reorderThreshold: '',
    initialQuantity: '',
    purchaseBillFileName: '',
    purchaseBillFileSizeKb: null,
  };
}

/** Progress toward a complete submission — drives the % shown on draft cards. */
export function itemDraftCompletionPct(d: ItemDraftData): number {
  const checks: boolean[] = [d.name.trim() !== '', d.unit.trim() !== '', d.reorderThreshold !== ''];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function isItemDraftComplete(d: ItemDraftData): boolean {
  return itemDraftCompletionPct(d) === 100;
}
