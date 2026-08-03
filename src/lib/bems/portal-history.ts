/**
 * Meriva BEMS — Portal history
 *
 * Builds the unified "History" list for the staff/engineer mobile portal's
 * Profile screen (and Home's short "Recent sessions" preview) by combining
 * the live `sessions`/`tickets` from the demo store (so a scan just done in
 * /qrscanstart shows up immediately) with the static MovementRequest /
 * WorkOrder seed data — the same two neither store.ts nor any other screen
 * in this app mutates — viewed from the logged-in person's angle instead of
 * the equipment's.
 */

import type { User, UsageSession, Ticket } from './types';
import {
  movementRequests, workOrders,
  getEquipmentById, equipmentName, getRoom,
} from './seed';
import { formatDuration } from './derive';

export interface PortalHistoryRow {
  id: string;
  kind: 'SESSION' | 'MOVE' | 'JOB';
  equipmentId: string;
  equipmentDisplayName: string;
  dateIso: string;
  subtext: string;
  tagLabel: string;
  tone: 'default' | 'warning' | 'danger';
}

export interface PortalHistoryData {
  sessions: UsageSession[];
  tickets: Ticket[];
  emergencySessionIds: string[];
}

function breakdownSubtext(durationSeconds: number, reason: string, emergency: boolean): string {
  const base = `${formatDuration(durationSeconds)} · flagged ${reason.toLowerCase()}`;
  return emergency ? `${base} · emergency` : base;
}

/** A person's own usage sessions (clinical use or maintenance work), most recent first. */
function sessionRows(userId: string, data: PortalHistoryData): PortalHistoryRow[] {
  return data.sessions
    .filter((s) => s.userId === userId && s.endedAt)
    .map((s) => {
      const eq = getEquipmentById(s.equipmentId);
      const breakdown = s.endReason === 'BREAKDOWN';
      const emergency = data.emergencySessionIds.includes(s.id);
      const durationSeconds = s.durationSeconds ?? 0;
      const ticket = breakdown
        ? data.tickets.find(
            (t) => t.equipmentId === s.equipmentId && t.source === 'SCAN_BREAKDOWN' && t.openedAt === s.endedAt,
          )
        : undefined;

      let subtext = formatDuration(durationSeconds);
      if (breakdown) subtext = breakdownSubtext(durationSeconds, ticket?.issueType ?? 'breakdown', emergency);
      else if (emergency) subtext = `${subtext} · emergency`;

      return {
        id: s.id,
        kind: 'SESSION' as const,
        equipmentId: s.equipmentId,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        dateIso: s.startedAt,
        subtext,
        tagLabel: breakdown ? 'Breakdown' : emergency ? 'Emergency' : 'Session',
        tone: breakdown ? 'danger' : emergency ? 'warning' : 'default',
      };
    });
}

/** General staff: equipment moves they initiated. */
function staffMoveRows(userId: string): PortalHistoryRow[] {
  return movementRequests
    .filter((m) => m.initiatedByUserId === userId)
    .map((m) => {
      const eq = getEquipmentById(m.equipmentId);
      const fromRoom = getRoom(m.fromRoomId)?.name ?? '—';
      const toRoom = getRoom(m.toRoomId)?.name ?? '—';
      return {
        id: m.id,
        kind: 'MOVE' as const,
        equipmentId: m.equipmentId,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        dateIso: m.initiatedAt,
        subtext: `${fromRoom} → ${toRoom}`,
        tagLabel: 'Moved',
        tone: 'default' as const,
      };
    });
}

/** Internal engineer: completed jobs (work orders), resolution duration + status. */
function engineerJobRows(userId: string, tickets: Ticket[]): PortalHistoryRow[] {
  return workOrders
    .filter((w) => w.performedByUserId === userId && w.completedAt)
    .map((w) => {
      const eq = getEquipmentById(w.equipmentId);
      const ticket = w.ticketId ? tickets.find((t) => t.id === w.ticketId) : undefined;
      const breakdown = ticket?.source === 'SCAN_BREAKDOWN';
      const durationSeconds = (new Date(w.completedAt!).getTime() - new Date(w.startedAt).getTime()) / 1000;
      return {
        id: w.id,
        kind: 'JOB' as const,
        equipmentId: w.equipmentId,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        dateIso: w.completedAt!,
        subtext: breakdown
          ? breakdownSubtext(durationSeconds, ticket!.issueType, false)
          : formatDuration(durationSeconds),
        tagLabel: breakdown ? 'Breakdown' : 'Completed',
        tone: breakdown ? ('danger' as const) : ('default' as const),
      };
    });
}

function sortDesc(rows: PortalHistoryRow[]): PortalHistoryRow[] {
  return [...rows].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
}

/**
 * Full History list on the Profile screen. Everyone sees their own sessions
 * (scans, including emergency-logged ones); General staff additionally see
 * the equipment moves they initiated, Internal engineers additionally see
 * their formally assigned completed work orders.
 */
export function buildProfileHistory(user: User, data: PortalHistoryData): PortalHistoryRow[] {
  const own = sessionRows(user.id, data);
  if (user.role === 'ENGINEER') return sortDesc([...own, ...engineerJobRows(user.id, data.tickets)]);
  return sortDesc([...own, ...staffMoveRows(user.id)]);
}

/** Home screen's short "Recent sessions" preview — sessions/jobs only, no moves. */
export function recentSessionsPreview(user: User, data: PortalHistoryData, limit = 3): PortalHistoryRow[] {
  const own = sessionRows(user.id, data);
  const rows = user.role === 'ENGINEER' ? [...own, ...engineerJobRows(user.id, data.tickets)] : own;
  return sortDesc(rows).slice(0, limit);
}
