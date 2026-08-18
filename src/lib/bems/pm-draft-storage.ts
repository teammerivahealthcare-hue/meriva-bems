"use client";

/**
 * Meriva BEMS — PM report draft persistence
 *
 * The only durable storage anywhere in this app. Every other "draft" here
 * (equipment-add, item-add) lives in the in-memory Zustand store and is
 * lost on refresh — that's fine for a form you fill in one sitting, but a
 * PM report can span a ward round with the phone locked/backgrounded in
 * between, so it needs to survive a refresh or app close.
 *
 * There is no server in this app, so this only ever solves "survived a
 * refresh," not "survived a lost connection" — see use-online-status.ts
 * and the flow hook for how submission itself is held while offline.
 */

import type { PmReport } from './types';

export type PmDraftEnvelope = PmReport & { version: 1; updatedAt: string };

const KEY_PREFIX = 'meriva-bems:pm-draft:';

function keyFor(equipmentId: string): string {
  return `${KEY_PREFIX}${equipmentId}`;
}

export function saveDraft(draft: PmReport): void {
  if (typeof window === 'undefined') return;
  const envelope: PmDraftEnvelope = { ...draft, version: 1, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(keyFor(draft.equipmentId), JSON.stringify(envelope));
  } catch {
    // Storage full/unavailable — the draft still lives in the in-memory
    // store for the rest of this session, so nothing is lost until the tab closes.
  }
}

export function loadDraft(equipmentId: string): PmDraftEnvelope | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(equipmentId));
    return raw ? (JSON.parse(raw) as PmDraftEnvelope) : null;
  } catch {
    return null;
  }
}

export function clearDraft(equipmentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(equipmentId));
  } catch {
    // ignore
  }
}

/** Every equipment with a saved draft — prefix-scanned at read time rather than kept in a separate index, so there's nothing to drift out of sync. */
export function listDraftEquipmentIds(): string[] {
  if (typeof window === 'undefined') return [];
  const ids: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) ids.push(key.slice(KEY_PREFIX.length));
  }
  return ids;
}
