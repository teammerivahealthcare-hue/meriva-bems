/**
 * Meriva BEMS — Portal history
 *
 * Builds the unified "History" list for the staff/engineer mobile portal's
 * Profile screen (and Home's short "Recent sessions" preview) by combining
 * the live `sessions`/`tickets`/`movementRequests` from the demo store (so a
 * scan or a movement just logged in /qrscanstart shows up immediately) with
 * the static WorkOrder seed data — the one screen in this app that still
 * doesn't mutate it — viewed from the logged-in person's angle instead of
 * the equipment's.
 */

import type { User, UsageSession, Ticket, MovementRequest } from './types';
import {
  workOrders,
  getEquipmentById, equipmentName, getRoom,
} from './seed';
import { formatDuration } from './derive';

export interface PortalHistoryRow {
  id: string;
  kind: 'SESSION' | 'MOVE' | 'TICKET';
  equipmentId: string;
  equipmentDisplayName: string;
  dateIso: string;
  subtext: string;
  tagLabel: string;
  tone: 'default' | 'warning' | 'danger';
  /** MOVE rows only: set when this is a still-open temporary loan, so the UI can offer to close it out. */
  movementId?: string;
  awaitingReturn?: boolean;
}

export interface PortalHistoryData {
  sessions: UsageSession[];
  tickets: Ticket[];
  emergencySessionIds: string[];
  /** Only needed by buildProfileHistory (General staff's move history) — recentSessionsPreview ignores it. */
  movementRequests?: MovementRequest[];
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
function staffMoveRows(userId: string, movementRequests: MovementRequest[]): PortalHistoryRow[] {
  return movementRequests
    .filter((m) => m.initiatedByUserId === userId)
    .map((m) => {
      const eq = getEquipmentById(m.equipmentId);
      const fromRoom = getRoom(m.fromRoomId)?.name ?? '—';
      const toRoom = getRoom(m.toRoomId)?.name ?? '—';
      const awaitingReturn = m.approvalStatus === 'APPROVED' && m.movementKind === 'TEMPORARY' && !m.returnedAt;
      return {
        id: m.id,
        kind: 'MOVE' as const,
        equipmentId: m.equipmentId,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        dateIso: m.initiatedAt,
        subtext: `${fromRoom} → ${toRoom}`,
        tagLabel: 'Moved',
        tone: 'default' as const,
        movementId: m.id,
        awaitingReturn,
      };
    });
}

/** Internal engineer: completed tickets (work orders), resolution duration + status. */
function engineerTicketRows(userId: string, tickets: Ticket[]): PortalHistoryRow[] {
  return workOrders
    .filter((w) => w.performedByUserId === userId && w.completedAt)
    .map((w) => {
      const eq = getEquipmentById(w.equipmentId);
      const ticket = w.ticketId ? tickets.find((t) => t.id === w.ticketId) : undefined;
      const breakdown = ticket?.source === 'SCAN_BREAKDOWN';
      const durationSeconds = (new Date(w.completedAt!).getTime() - new Date(w.startedAt).getTime()) / 1000;
      return {
        id: w.id,
        kind: 'TICKET' as const,
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
  if (user.role === 'ENGINEER') return sortDesc([...own, ...engineerTicketRows(user.id, data.tickets)]);
  return sortDesc([...own, ...staffMoveRows(user.id, data.movementRequests ?? [])]);
}

/** Home screen's short "Recent sessions" preview — sessions/tickets only, no moves. */
export function recentSessionsPreview(user: User, data: PortalHistoryData, limit = 3): PortalHistoryRow[] {
  const own = sessionRows(user.id, data);
  const rows = user.role === 'ENGINEER' ? [...own, ...engineerTicketRows(user.id, data.tickets)] : own;
  return sortDesc(rows).slice(0, limit);
}
