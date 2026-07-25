/**
 * Meriva BEMS — Demo state
 *
 * Seed data is the starting position. This store holds everything that
 * CHANGES during a demo: the running session, tickets raised on the spot,
 * status flips, notifications that fire.
 *
 * Deliberately in-memory only. A refresh resets to a known good state —
 * which is what you want thirty seconds before a pitch.
 */

'use client';

import { create } from 'zustand';
import type {
  Equipment, Ticket, UsageSession, ActivityEvent, AppNotification,
  OperationalStatus, GateState,
} from './types';
import {
  equipment as seedEquipment,
  tickets as seedTickets,
  usageSessions as seedSessions,
  activityEvents as seedActivity,
  notifications as seedNotifications,
  currentUser,
  equipmentName,
  getRoom,
  getDepartment,
} from './seed';

interface DemoState {
  equipment: Equipment[];
  tickets: Ticket[];
  sessions: UsageSession[];
  activity: ActivityEvent[];
  notifications: AppNotification[];

  /** The session running right now, if any. Drives the timer UI. */
  activeSession: UsageSession | null;

  startSession: (args: {
    equipmentId: string;
    expectedDurationMinutes?: number;
    gateState: GateState;
    gateAcknowledged: boolean;
  }) => void;

  stopSession: () => void;

  /** Mid-session breakdown: freezes runtime, downs the unit, opens a ticket, alerts. */
  flagBreakdown: (issueType: string, description: string) => void;

  setStatus: (equipmentId: string, status: OperationalStatus) => void;
  markNotificationRead: (id: string) => void;
  reset: () => void;
}

const nowIso = () => new Date().toISOString();
const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const useDemo = create<DemoState>((set, get) => ({
  equipment: seedEquipment,
  tickets: seedTickets,
  sessions: seedSessions,
  activity: seedActivity,
  notifications: seedNotifications,
  activeSession: null,

  startSession: ({ equipmentId, expectedDurationMinutes, gateState, gateAcknowledged }) => {
    const session: UsageSession = {
      id: rid('ses'),
      equipmentId,
      userId: currentUser.id,
      sessionType: currentUser.role === 'ENGINEER' ? 'MAINTENANCE_WORK' : 'CLINICAL_USE',
      startedAt: nowIso(),
      expectedDurationMinutes,
      dataQuality: 'CONFIRMED',
      gateStateAtStart: gateState,
      gateAcknowledged,
    };

    const events: ActivityEvent[] = [
      {
        id: rid('act'),
        equipmentId,
        eventType: 'SESSION_STARTED',
        actorUserId: currentUser.id,
        actorSystem: false,
        occurredAt: session.startedAt,
        summary: expectedDurationMinutes
          ? `Session started by ${currentUser.name} — expected ${expectedDurationMinutes} min`
          : `Session started by ${currentUser.name}`,
      },
    ];

    if (gateAcknowledged) {
      events.unshift({
        id: rid('act'),
        equipmentId,
        eventType: 'GATE_ACKNOWLEDGED',
        actorUserId: currentUser.id,
        actorSystem: false,
        occurredAt: session.startedAt,
        summary: `${currentUser.name} acknowledged the ${gateState.toLowerCase()} advisory and proceeded`,
      });
    }

    set((s) => ({
      activeSession: session,
      sessions: [session, ...s.sessions],
      activity: [...events, ...s.activity],
    }));
  },

  stopSession: () => {
    const active = get().activeSession;
    if (!active) return;

    const endedAt = nowIso();
    const durationSeconds = Math.round(
      (new Date(endedAt).getTime() - new Date(active.startedAt).getTime()) / 1000,
    );

    const completed: UsageSession = {
      ...active,
      endedAt,
      durationSeconds,
      endReason: 'NORMAL',
      dataQuality: 'CONFIRMED',
    };

    const hours = durationSeconds / 3600;

    set((s) => ({
      activeSession: null,
      sessions: s.sessions.map((x) => (x.id === active.id ? completed : x)),
      equipment: s.equipment.map((e) =>
        e.id === active.equipmentId
          ? { ...e, cumulativeUsageHours: e.cumulativeUsageHours + hours }
          : e,
      ),
      activity: [
        {
          id: rid('act'),
          equipmentId: active.equipmentId,
          eventType: 'SESSION_ENDED',
          actorUserId: currentUser.id,
          actorSystem: false,
          occurredAt: endedAt,
          summary: `Session ended after ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s — confirmed`,
        },
        ...s.activity,
      ],
    }));
  },

  /**
   * The chain that sells the product. One tap produces five things:
   * frozen runtime, a downed unit, a downtime clock, a prefilled ticket,
   * and an immediate alert on the admin's screen.
   */
  flagBreakdown: (issueType, description) => {
    const active = get().activeSession;
    if (!active) return;

    const at = nowIso();
    const elapsed = Math.round(
      (new Date(at).getTime() - new Date(active.startedAt).getTime()) / 1000,
    );

    const eq = get().equipment.find((e) => e.id === active.equipmentId);
    const room = eq ? getRoom(eq.roomId) : undefined;
    const dept = eq ? getDepartment(eq.departmentId) : undefined;

    const endedSession: UsageSession = {
      ...active,
      endedAt: at,
      durationSeconds: elapsed,
      endReason: 'BREAKDOWN',
      dataQuality: 'CONFIRMED',
      breakdownAtSeconds: elapsed,
    };

    const ticket: Ticket = {
      id: rid('tkt'),
      ticketNumber: `TKT-2026-${String(200 + get().tickets.length).padStart(4, '0')}`,
      equipmentId: active.equipmentId,
      raisedByUserId: currentUser.id,
      source: 'SCAN_BREAKDOWN',
      issueType,
      description,
      priority: eq?.criticality === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      status: 'OPEN',
      runtimeHoursAtFailure: eq?.cumulativeUsageHours,
      openedAt: at,
      slaDueAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      slaBreached: false,
    };

    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    const notification: AppNotification = {
      id: rid('ntf'),
      tier: 'IMMEDIATE',
      equipmentId: active.equipmentId,
      title: `${eq ? equipmentName(eq) : 'Equipment'} down — ${room?.name ?? dept?.name ?? ''}`,
      body: `Flagged by ${currentUser.name} ${mins}m ${secs}s into a session. ${issueType}.`,
      createdAt: at,
      actionLabel: 'View ticket',
      actionHref: `/tickets/${ticket.id}`,
    };

    const events: ActivityEvent[] = [
      {
        id: rid('act'), equipmentId: active.equipmentId, eventType: 'TICKET_OPENED',
        actorSystem: true, occurredAt: at,
        summary: `${ticket.ticketNumber} created automatically from breakdown flag`,
      },
      {
        id: rid('act'), equipmentId: active.equipmentId, eventType: 'STATUS_CHANGED',
        actorSystem: true, occurredAt: at,
        summary: 'Status changed to Down, downtime clock started',
        before: { operationalStatus: eq?.operationalStatus }, after: { operationalStatus: 'DOWN' },
      },
      {
        id: rid('act'), equipmentId: active.equipmentId, eventType: 'BREAKDOWN_FLAGGED',
        actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
        summary: `Breakdown flagged ${mins}m ${secs}s into session — ${issueType}`,
      },
    ];

    set((s) => ({
      activeSession: null,
      sessions: s.sessions.map((x) => (x.id === active.id ? endedSession : x)),
      tickets: [ticket, ...s.tickets],
      notifications: [notification, ...s.notifications],
      equipment: s.equipment.map((e) =>
        e.id === active.equipmentId ? { ...e, operationalStatus: 'DOWN' as const } : e,
      ),
      activity: [...events, ...s.activity],
    }));
  },

  setStatus: (equipmentId, status) =>
    set((s) => ({
      equipment: s.equipment.map((e) =>
        e.id === equipmentId ? { ...e, operationalStatus: status } : e,
      ),
      activity: [
        {
          id: rid('act'), equipmentId, eventType: 'STATUS_CHANGED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: nowIso(),
          summary: `Status changed to ${status.replace(/_/g, ' ').toLowerCase()}`,
        },
        ...s.activity,
      ],
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, readAt: nowIso() } : n,
      ),
    })),

  reset: () =>
    set({
      equipment: seedEquipment,
      tickets: seedTickets,
      sessions: seedSessions,
      activity: seedActivity,
      notifications: seedNotifications,
      activeSession: null,
    }),
}));

/** Unread count for the bell. */
export const useUnreadCount = () =>
  useDemo((s) => s.notifications.filter((n) => !n.readAt).length);
