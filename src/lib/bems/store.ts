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
  Equipment, Ticket, UsageSession, ActivityEvent, AppNotification, Contract,
  OperationalStatus, GateState, Criticality,
  Facility, Department, Floor, FacilityContact, NotificationPreference, AlertType,
} from './types';
import {
  equipment as seedEquipment,
  tickets as seedTickets,
  usageSessions as seedSessions,
  activityEvents as seedActivity,
  notifications as seedNotifications,
  contracts as seedContracts,
  currentUser,
  equipmentName,
  getRoom,
  getDepartment,
  getUser,
  getCategory,
  getModel,
  facility as seedFacility,
  departments as seedDepartments,
  floors as seedFloors,
  facilityContact as seedFacilityContact,
  notificationPreferences as seedNotificationPreferences,
} from './seed';
import { SEED_TEAM_MEMBERS, generateCredentials, type TeamMember, type TeamRole } from './team';
import {
  emptyEquipmentDraftData,
  type EquipmentDraft, type EquipmentDraftData, type EquipmentDraftUnit,
} from './equipment-draft';

interface DemoState {
  equipment: Equipment[];
  contracts: Contract[];
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

  addEquipmentBulk: (input: {
    equipmentModelId: string;
    units: EquipmentDraftUnit[];
    responsibleUserId: string;
    criticality: Criticality;
    yearOfManufacture: number;
    dateOfPurchase: string;
    dateOfInstallation: string;
    purchaseCost: number;
    dealerVendorId: string;
    warrantyExpiryDate?: string;
    photoDataUrl?: string;
  }) => Equipment[];

  equipmentDrafts: EquipmentDraft[];
  /** Upsert — pass an existing draft's id to update it, or null to create one. Returns the draft id. */
  saveEquipmentDraft: (id: string | null, data: EquipmentDraftData) => string;
  discardEquipmentDraft: (id: string) => void;

  /**
   * The live in-progress /equipment/add form. Lives in the store rather than
   * component state — Next's client-side route cache can reuse an
   * already-mounted /equipment/add instance instead of giving it a fresh
   * mount, which silently discards local component state. A store field
   * survives that regardless of how the page instance is reused.
   */
  addForm: EquipmentDraftData;
  addFormDraftId: string | null;
  addFormSnapshot: string;
  updateAddForm: (patch: Partial<EquipmentDraftData>) => void;
  /** Load a saved draft (or a blank form) as the current in-progress submission. */
  setAddForm: (data: EquipmentDraftData, draftId: string | null) => void;
  resetAddForm: () => void;

  teamMembers: TeamMember[];
  addTeamMember: (input: { role: TeamRole; name: string; phone: string; email?: string }) => {
    staffId: string;
    password: string;
  };
  deactivateTeamMember: (id: string) => void;
  activateTeamMember: (id: string) => void;
  updateTeamMember: (id: string, patch: Partial<Pick<TeamMember, 'name' | 'phone' | 'email' | 'notes'>>) => void;

  facility: Facility;
  updateFacility: (patch: Partial<Pick<Facility, 'name' | 'address' | 'city' | 'state' | 'bedCount' | 'logoUrl'>>) => void;

  facilityContact: FacilityContact;
  updateFacilityContact: (patch: Partial<FacilityContact>) => void;

  floors: Floor[];
  departments: Department[];
  addFloor: (name: string) => void;
  renameFloor: (id: string, name: string) => void;
  removeFloor: (id: string) => void;
  addDepartment: (floorId: string, name: string) => void;
  removeDepartment: (id: string) => void;

  notificationPreferences: NotificationPreference[];
  updateNotificationPreference: (
    alertType: AlertType,
    patch: Partial<Pick<NotificationPreference, 'enabled' | 'channel'>>,
  ) => void;

  account: { name: string; email: string };
  updateAccount: (patch: Partial<{ name: string; email: string }>) => void;

  reset: () => void;
}

const nowIso = () => new Date().toISOString();
const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const useDemo = create<DemoState>((set, get) => ({
  equipment: seedEquipment,
  contracts: seedContracts,
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

  addEquipmentBulk: (input) => {
    const model = getModel(input.equipmentModelId);
    const category = model ? getCategory(model.categoryId) : undefined;
    const createdAt = nowIso();

    const newEquipment: Equipment[] = input.units.map((u) => ({
      id: rid('eq'),
      facilityId: currentUser.facilityId,
      assetId: u.assetId,
      qrToken: rid('qr'),
      equipmentModelId: input.equipmentModelId,
      serialNumber: u.serialNumber,
      yearOfManufacture: input.yearOfManufacture,
      dateOfPurchase: input.dateOfPurchase,
      dateOfInstallation: input.dateOfInstallation,
      dateOfAcceptance: input.dateOfInstallation,
      dealerVendorId: input.dealerVendorId,
      purchaseCost: input.purchaseCost,
      departmentId: u.departmentId,
      roomId: u.roomId,
      responsibleUserId: input.responsibleUserId,
      criticality: input.criticality,
      usageTrackingMode: category?.defaultUsageTrackingMode ?? 'NONE',
      financialStatus: 'ACTIVE_ASSET',
      operationalStatus: 'IN_SERVICE',
      cumulativeUsageHours: 0,
      createdAt,
      photoUrl: input.photoDataUrl || undefined,
    }));

    const newContracts: Contract[] = input.warrantyExpiryDate
      ? newEquipment.map((eq) => ({
          id: rid('con'),
          facilityId: currentUser.facilityId,
          vendorId: input.dealerVendorId,
          type: 'WARRANTY' as const,
          contractNumber: rid('wty').toUpperCase(),
          startDate: input.dateOfInstallation,
          endDate: input.warrantyExpiryDate!,
          annualCost: 0,
          coverageNotes: 'Manufacturer warranty — added at equipment registration.',
          responseSlaHours: 48,
          resolutionSlaHours: 168,
          coveredEquipmentIds: [eq.id],
        }))
      : [];

    set((s) => ({
      equipment: [...newEquipment, ...s.equipment],
      contracts: [...newContracts, ...s.contracts],
    }));
    return newEquipment;
  },

  equipmentDrafts: [],

  saveEquipmentDraft: (id, data) => {
    const existing = id ? get().equipmentDrafts.find((d) => d.id === id) : undefined;
    const draft: EquipmentDraft = {
      ...data,
      id: existing?.id ?? rid('draft'),
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({
      equipmentDrafts: existing
        ? s.equipmentDrafts.map((d) => (d.id === draft.id ? draft : d))
        : [draft, ...s.equipmentDrafts],
    }));
    return draft.id;
  },

  discardEquipmentDraft: (id) =>
    set((s) => ({ equipmentDrafts: s.equipmentDrafts.filter((d) => d.id !== id) })),

  addForm: emptyEquipmentDraftData(),
  addFormDraftId: null,
  addFormSnapshot: JSON.stringify(emptyEquipmentDraftData()),

  updateAddForm: (patch) => set((s) => ({ addForm: { ...s.addForm, ...patch } })),

  setAddForm: (data, draftId) =>
    set({ addForm: data, addFormDraftId: draftId, addFormSnapshot: JSON.stringify(data) }),

  resetAddForm: () => {
    const empty = emptyEquipmentDraftData();
    set({ addForm: empty, addFormDraftId: null, addFormSnapshot: JSON.stringify(empty) });
  },

  teamMembers: SEED_TEAM_MEMBERS,

  addTeamMember: ({ role, name, phone, email }) => {
    const { staffId, password } = generateCredentials(role, get().teamMembers);
    const member: TeamMember = {
      id: rid('usr'),
      facilityId: currentUser.facilityId,
      name,
      role,
      designation: role === 'ENGINEER' ? 'Biomedical Engineer' : 'Staff',
      phone,
      email: email ?? '',
      staffId,
      password,
      joinedAt: nowIso(),
      active: true,
    };
    set((s) => ({ teamMembers: [member, ...s.teamMembers] }));
    return { staffId, password };
  },

  deactivateTeamMember: (id) =>
    set((s) => ({
      teamMembers: s.teamMembers.map((m) => (m.id === id ? { ...m, active: false } : m)),
    })),

  activateTeamMember: (id) =>
    set((s) => ({
      teamMembers: s.teamMembers.map((m) => (m.id === id ? { ...m, active: true } : m)),
    })),

  updateTeamMember: (id, patch) =>
    set((s) => ({
      teamMembers: s.teamMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  facility: seedFacility,
  updateFacility: (patch) => set((s) => ({ facility: { ...s.facility, ...patch } })),

  facilityContact: seedFacilityContact,
  updateFacilityContact: (patch) => set((s) => ({ facilityContact: { ...s.facilityContact, ...patch } })),

  floors: seedFloors,
  departments: seedDepartments,

  addFloor: (name) =>
    set((s) => {
      const buildingId = s.floors[0]?.buildingId ?? 'bld-main';
      const number = s.floors.length > 0 ? Math.max(...s.floors.map((f) => f.number)) + 1 : 0;
      const floor: Floor = { id: rid('floor'), buildingId, number, name };
      return { floors: [...s.floors, floor] };
    }),

  renameFloor: (id, name) =>
    set((s) => ({ floors: s.floors.map((f) => (f.id === id ? { ...f, name } : f)) })),

  removeFloor: (id) =>
    set((s) => {
      const floor = s.floors.find((f) => f.id === id);
      if (!floor) return s;
      return {
        floors: s.floors.filter((f) => f.id !== id),
        departments: s.departments.filter((d) => d.floor !== floor.number),
      };
    }),

  addDepartment: (floorId, name) =>
    set((s) => {
      const floor = s.floors.find((f) => f.id === floorId);
      if (!floor) return s;
      const dept: Department = {
        id: rid('dept'),
        facilityId: currentUser.facilityId,
        name,
        buildingId: floor.buildingId,
        floor: floor.number,
      };
      return { departments: [...s.departments, dept] };
    }),

  removeDepartment: (id) =>
    set((s) => ({ departments: s.departments.filter((d) => d.id !== id) })),

  notificationPreferences: seedNotificationPreferences,
  updateNotificationPreference: (alertType, patch) =>
    set((s) => ({
      notificationPreferences: s.notificationPreferences.map((p) =>
        p.alertType === alertType ? { ...p, ...patch } : p,
      ),
    })),

  account: {
    name: getUser('usr-admin')?.name ?? '',
    email: getUser('usr-admin')?.email ?? '',
  },
  updateAccount: (patch) => set((s) => ({ account: { ...s.account, ...patch } })),

  reset: () =>
    set({
      equipment: seedEquipment,
      contracts: seedContracts,
      tickets: seedTickets,
      sessions: seedSessions,
      activity: seedActivity,
      notifications: seedNotifications,
      activeSession: null,
      equipmentDrafts: [],
      addForm: emptyEquipmentDraftData(),
      addFormDraftId: null,
      addFormSnapshot: JSON.stringify(emptyEquipmentDraftData()),
      teamMembers: SEED_TEAM_MEMBERS,
      facility: seedFacility,
      facilityContact: seedFacilityContact,
      floors: seedFloors,
      departments: seedDepartments,
      notificationPreferences: seedNotificationPreferences,
      account: {
        name: getUser('usr-admin')?.name ?? '',
        email: getUser('usr-admin')?.email ?? '',
      },
    }),
}));

/** Unread count for the bell. */
export const useUnreadCount = () =>
  useDemo((s) => s.notifications.filter((n) => !n.readAt).length);
