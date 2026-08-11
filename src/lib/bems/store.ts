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
  OperationalStatus, GateState, Criticality, MovementRequest, MovementKind, CondemnationRecord,
  Facility, Department, Floor, FacilityContact, NotificationPreference, AlertType,
  WorkOrder, WarrantyOverrideRequest, EquipmentDocument, DocumentType, CylinderLogEntry, CylinderLogKind,
  ConsumableItem, ConsumableLogEntry, ConsumableLogKind, ConsumableCategory,
} from './types';
import {
  equipment as seedEquipment,
  tickets as seedTickets,
  usageSessions as seedSessions,
  activityEvents as seedActivity,
  notifications as seedNotifications,
  contracts as seedContracts,
  movementRequests as seedMovementRequests,
  condemnationRecords as seedCondemnationRecords,
  workOrders as seedWorkOrders,
  warrantyOverrideRequests as seedWarrantyOverrideRequests,
  equipmentDocuments as seedDocuments,
  cylinderLog as seedCylinderLog,
  consumableItems as seedConsumableItems,
  consumableLog as seedConsumableLog,
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
import { PRIORITY_RANK, DOCUMENT_TYPE_LABEL, now as demoNow } from './derive';
import { SEED_TEAM_MEMBERS, generateCredentials, type TeamMember, type TeamRole, type TeamMemberDocument } from './team';
import {
  emptyEquipmentDraftData,
  type EquipmentDraft, type EquipmentDraftData, type EquipmentDraftUnit,
} from './equipment-draft';
import {
  emptyItemDraftData,
  type ItemDraft, type ItemDraftData,
} from './item-draft';

/** Fixed demo identities the staff/engineer portal's role-switcher toggles between — no auth backend yet. */
export const PORTAL_STAFF_USER_ID = 'usr-staff1';
export const PORTAL_ENGINEER_USER_ID = 'usr-eng';

export type PortalAvailability = 'AVAILABLE' | 'ON_BREAK' | 'OFF_DUTY';

interface DemoState {
  equipment: Equipment[];
  contracts: Contract[];
  tickets: Ticket[];
  sessions: UsageSession[];
  activity: ActivityEvent[];
  notifications: AppNotification[];

  /** The session running right now, if any. Drives the timer UI. */
  activeSession: UsageSession | null;

  /**
   * Who the staff/engineer mobile portal (Home, Profile, /qrscanstart) is
   * "logged in" as. Separate from the admin-side `currentUser` constant —
   * this one is switchable so the portal can be demoed as either role.
   */
  portalUserId: string;
  setPortalRole: (role: 'STAFF' | 'ENGINEER') => void;

  portalNotificationsEnabled: boolean;
  setPortalNotificationsEnabled: (enabled: boolean) => void;

  /** Internal-engineer-only. Hidden entirely for General staff in the portal UI. */
  engineerAvailability: PortalAvailability;
  setEngineerAvailability: (status: PortalAvailability) => void;

  startSession: (args: {
    equipmentId: string;
    expectedDurationMinutes?: number;
    gateState: GateState;
    gateAcknowledged: boolean;
  }) => void;

  stopSession: () => void;

  /** Mid-session breakdown: freezes runtime, downs the unit, opens a ticket, alerts. */
  flagBreakdown: (issueType: string, description: string, photoDataUrl?: string) => void;

  /** Session ids logged via `logEmergencyUse` rather than a live timer — drives the "Emergency" tag in Profile history. */
  emergencySessionIds: string[];

  /** Photos attached to a breakdown report, keyed by ticket id. Not on the shared Ticket type — a side channel so the type contract stays untouched. */
  ticketPhotos: Record<string, string>;

  /**
   * Scan-after-use path: no live timer ran, so the person declares how long
   * they used the equipment for once they're done. Optionally doubles as a
   * breakdown report when the declared use ended in a failure.
   */
  logEmergencyUse: (args: {
    equipmentId: string;
    durationMinutes: number;
    gateState: GateState;
    breakdown?: { issueType: string; description: string; photoDataUrl?: string };
  }) => void;

  setStatus: (equipmentId: string, status: OperationalStatus) => void;
  markNotificationRead: (id: string) => void;

  movementRequests: MovementRequest[];
  condemnationRecords: CondemnationRecord[];
  /** Staff-initiated: log that a unit is being relocated, temporarily or for good. Creates a PENDING request for admin sign-off. */
  initiateMovement: (args: {
    equipmentId: string;
    toRoomId: string;
    movementKind: MovementKind;
    expectedReturnAt?: string;
    note?: string;
  }) => void;
  approveMovement: (id: string) => void;
  rejectMovement: (id: string) => void;
  /** Closes out a TEMPORARY move once the unit is back. actorUserId defaults to the admin currentUser when omitted (e.g. called from Approvals). */
  confirmMovementReturn: (
    id: string,
    opts?: { actorUserId?: string; returnedWithAllAccessories?: boolean },
  ) => void;
  /** Engineer's review of a condemnation request: write the unit off, or refurbish it with parts replacement. */
  resolveCondemnation: (id: string, resolution: 'CONDEMN' | 'REFURBISH', notes?: string) => void;
  rejectCondemnation: (id: string) => void;
  /** Admin/engineer-initiated — opens a new condemnation review for a unit. */
  requestCondemnation: (equipmentId: string, justification: string) => void;

  /** MGPS oxygen cylinder stock, event-sourced — current stock is derived by summing this, never stored directly. */
  cylinderLog: CylinderLogEntry[];
  logCylinderEvent: (args: { equipmentId: string; kind: CylinderLogKind; quantity: number; note?: string }) => void;

  /** General consumables/spares catalog and its event-sourced stock log — separate from MGPS cylinder stock above. */
  consumableItems: ConsumableItem[];
  consumableLog: ConsumableLogEntry[];
  logConsumableEvent: (args: { itemId: string; kind: ConsumableLogKind; quantity: number; note?: string }) => void;
  /** Adds a new catalog item — optionally seeding its starting stock as an initial RESTOCK log entry. */
  addConsumableItem: (args: {
    name: string;
    category: ConsumableCategory;
    unit: string;
    reorderThreshold: number;
    initialQuantity?: number;
    purchaseBillFileName?: string;
    purchaseBillFileSizeKb?: number;
  }) => void;

  documents: EquipmentDocument[];
  /** Attach a new document (manual, invoice, certificate, ...) to a unit — Contracts tab's "Add document" flow. */
  addEquipmentDocument: (input: {
    equipmentId: string;
    type: DocumentType;
    label?: string;
    fileName: string;
    fileSizeKb: number;
    expiryDate?: string;
  }) => EquipmentDocument;

  workOrders: WorkOrder[];
  /** Assign (or reassign) the engineer on a ticket — creates the WorkOrder if none exists yet. */
  assignEngineer: (ticketId: string, engineerId: string) => void;
  /** Greedily spreads every unassigned open ticket across available engineers by current load. */
  autoAssignOpenTickets: () => void;

  warrantyOverrideRequests: WarrantyOverrideRequest[];
  /** Staff-initiated from the QR scan gate when a unit's warranty has expired. */
  requestWarrantyOverride: (equipmentId: string) => void;
  approveWarrantyOverride: (id: string) => void;
  rejectWarrantyOverride: (id: string) => void;

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

  itemDrafts: ItemDraft[];
  /** Upsert — pass an existing draft's id to update it, or null to create one. Returns the draft id. */
  saveItemDraft: (id: string | null, data: ItemDraftData) => string;
  discardItemDraft: (id: string) => void;

  /** Mirrors addForm above, for the Items tab's in-progress submission. */
  addItemForm: ItemDraftData;
  addItemFormDraftId: string | null;
  addItemFormSnapshot: string;
  updateAddItemForm: (patch: Partial<ItemDraftData>) => void;
  setAddItemForm: (data: ItemDraftData, draftId: string | null) => void;
  resetAddItemForm: () => void;

  teamMembers: TeamMember[];
  addTeamMember: (input: { role: TeamRole; name: string; phone: string; email?: string }) => {
    staffId: string;
    password: string;
  };
  deactivateTeamMember: (id: string) => void;
  activateTeamMember: (id: string) => void;
  updateTeamMember: (id: string, patch: Partial<Pick<TeamMember, 'name' | 'phone' | 'email' | 'notes'>>) => void;

  teamMemberDocuments: TeamMemberDocument[];
  /** A member attaching their own certification/training record — portable with them, not tied to a piece of equipment. */
  addTeamMemberDocument: (input: {
    memberId: string;
    label: string;
    fileName: string;
    fileSizeKb: number;
    expiryDate?: string;
  }) => TeamMemberDocument;

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
  movementRequests: seedMovementRequests,
  condemnationRecords: seedCondemnationRecords,
  workOrders: seedWorkOrders,
  warrantyOverrideRequests: seedWarrantyOverrideRequests,
  documents: seedDocuments,
  cylinderLog: seedCylinderLog,
  consumableItems: seedConsumableItems,
  consumableLog: seedConsumableLog,
  activeSession: null,

  portalUserId: PORTAL_STAFF_USER_ID,
  setPortalRole: (role) =>
    set({ portalUserId: role === 'ENGINEER' ? PORTAL_ENGINEER_USER_ID : PORTAL_STAFF_USER_ID }),

  portalNotificationsEnabled: true,
  setPortalNotificationsEnabled: (enabled) => set({ portalNotificationsEnabled: enabled }),

  engineerAvailability: 'AVAILABLE',
  setEngineerAvailability: (status) => set({ engineerAvailability: status }),

  startSession: ({ equipmentId, expectedDurationMinutes, gateState, gateAcknowledged }) => {
    const actor = getUser(get().portalUserId) ?? currentUser;
    const session: UsageSession = {
      id: rid('ses'),
      equipmentId,
      userId: actor.id,
      sessionType: actor.role === 'ENGINEER' ? 'MAINTENANCE_WORK' : 'CLINICAL_USE',
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
        actorUserId: actor.id,
        actorSystem: false,
        occurredAt: session.startedAt,
        summary: expectedDurationMinutes
          ? `Session started by ${actor.name} — expected ${expectedDurationMinutes} min`
          : `Session started by ${actor.name}`,
      },
    ];

    if (gateAcknowledged) {
      events.unshift({
        id: rid('act'),
        equipmentId,
        eventType: 'GATE_ACKNOWLEDGED',
        actorUserId: actor.id,
        actorSystem: false,
        occurredAt: session.startedAt,
        summary: `${actor.name} acknowledged the ${gateState.toLowerCase()} advisory and proceeded`,
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
    const actor = getUser(get().portalUserId) ?? currentUser;

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
          actorUserId: actor.id,
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
  flagBreakdown: (issueType, description, photoDataUrl) => {
    const active = get().activeSession;
    if (!active) return;
    const actor = getUser(get().portalUserId) ?? currentUser;

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
      raisedByUserId: actor.id,
      source: 'SCAN_BREAKDOWN',
      issueType,
      description,
      priority: eq?.criticality === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      status: 'OPEN',
      runtimeHoursAtFailure: eq?.cumulativeUsageHours,
      openedAt: at,
      responseDueAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      responseOverdue: false,
    };

    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    const notification: AppNotification = {
      id: rid('ntf'),
      tier: 'IMMEDIATE',
      equipmentId: active.equipmentId,
      title: `${eq ? equipmentName(eq) : 'Equipment'} down — ${room?.name ?? dept?.name ?? ''}`,
      body: `Flagged by ${actor.name} ${mins}m ${secs}s into a session. ${issueType}.`,
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
        actorUserId: actor.id, actorSystem: false, occurredAt: at,
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
      ticketPhotos: photoDataUrl ? { ...s.ticketPhotos, [ticket.id]: photoDataUrl } : s.ticketPhotos,
    }));
  },

  emergencySessionIds: [],
  ticketPhotos: {},

  /**
   * No live timer ran here — the person scanned after already using the
   * equipment (the emergency case) and declares the duration by hand.
   * Reuses the same session shape as a live session, just built backwards
   * from an end time instead of forward from a start tap, and marked
   * ESTIMATED since nothing was actually measured live.
   */
  logEmergencyUse: ({ equipmentId, durationMinutes, gateState, breakdown }) => {
    const actor = getUser(get().portalUserId) ?? currentUser;
    const durationSeconds = Math.max(1, Math.round(durationMinutes * 60));
    const endedAt = nowIso();
    const startedAt = new Date(new Date(endedAt).getTime() - durationSeconds * 1000).toISOString();

    const session: UsageSession = {
      id: rid('ses'),
      equipmentId,
      userId: actor.id,
      sessionType: actor.role === 'ENGINEER' ? 'MAINTENANCE_WORK' : 'CLINICAL_USE',
      startedAt,
      endedAt,
      durationSeconds,
      endReason: breakdown ? 'BREAKDOWN' : 'NORMAL',
      dataQuality: 'ESTIMATED',
      gateStateAtStart: gateState,
      gateAcknowledged: false,
      breakdownAtSeconds: breakdown ? durationSeconds : undefined,
    };

    const startedEvent: ActivityEvent = {
      id: rid('act'), equipmentId, eventType: 'SESSION_STARTED', actorUserId: actor.id, actorSystem: false,
      occurredAt: startedAt,
      summary: `Emergency use logged by ${actor.name} — entered after use, ${durationMinutes} min declared`,
    };

    if (!breakdown) {
      set((s) => ({
        sessions: [session, ...s.sessions],
        emergencySessionIds: [...s.emergencySessionIds, session.id],
        equipment: s.equipment.map((e) =>
          e.id === equipmentId
            ? { ...e, cumulativeUsageHours: e.cumulativeUsageHours + durationSeconds / 3600 }
            : e,
        ),
        activity: [
          {
            id: rid('act'), equipmentId, eventType: 'SESSION_ENDED', actorUserId: actor.id, actorSystem: false,
            occurredAt: endedAt, summary: `Emergency session logged — ${durationMinutes} min, estimated`,
          },
          startedEvent,
          ...s.activity,
        ],
      }));
      return;
    }

    const eq = get().equipment.find((e) => e.id === equipmentId);
    const room = eq ? getRoom(eq.roomId) : undefined;
    const dept = eq ? getDepartment(eq.departmentId) : undefined;

    const ticket: Ticket = {
      id: rid('tkt'),
      ticketNumber: `TKT-2026-${String(200 + get().tickets.length).padStart(4, '0')}`,
      equipmentId,
      raisedByUserId: actor.id,
      source: 'SCAN_BREAKDOWN',
      issueType: breakdown.issueType,
      description: breakdown.description,
      priority: eq?.criticality === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      status: 'OPEN',
      runtimeHoursAtFailure: eq?.cumulativeUsageHours,
      openedAt: endedAt,
      responseDueAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      responseOverdue: false,
    };

    const notification: AppNotification = {
      id: rid('ntf'),
      tier: 'IMMEDIATE',
      equipmentId,
      title: `${eq ? equipmentName(eq) : 'Equipment'} down — ${room?.name ?? dept?.name ?? ''}`,
      body: `Emergency use flagged by ${actor.name} — ${durationMinutes} min declared. ${breakdown.issueType}.`,
      createdAt: endedAt,
      actionLabel: 'View ticket',
      actionHref: `/tickets/${ticket.id}`,
    };

    set((s) => ({
      sessions: [session, ...s.sessions],
      emergencySessionIds: [...s.emergencySessionIds, session.id],
      tickets: [ticket, ...s.tickets],
      notifications: [notification, ...s.notifications],
      equipment: s.equipment.map((e) => (e.id === equipmentId ? { ...e, operationalStatus: 'DOWN' as const } : e)),
      activity: [
        {
          id: rid('act'), equipmentId, eventType: 'TICKET_OPENED', actorSystem: true, occurredAt: endedAt,
          summary: `${ticket.ticketNumber} created automatically from emergency breakdown flag`,
        },
        {
          id: rid('act'), equipmentId, eventType: 'STATUS_CHANGED', actorSystem: true, occurredAt: endedAt,
          summary: 'Status changed to Down, downtime clock started',
          before: { operationalStatus: eq?.operationalStatus }, after: { operationalStatus: 'DOWN' },
        },
        {
          id: rid('act'), equipmentId, eventType: 'BREAKDOWN_FLAGGED', actorUserId: actor.id, actorSystem: false,
          occurredAt: endedAt, summary: `Breakdown flagged on emergency-logged use (${durationMinutes} min declared) — ${breakdown.issueType}`,
        },
        startedEvent,
        ...s.activity,
      ],
      ticketPhotos: breakdown.photoDataUrl
        ? { ...s.ticketPhotos, [ticket.id]: breakdown.photoDataUrl }
        : s.ticketPhotos,
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

  initiateMovement: ({ equipmentId, toRoomId, movementKind, expectedReturnAt, note }) => {
    const eq = get().equipment.find((e) => e.id === equipmentId);
    if (!eq) return;
    const actor = getUser(get().portalUserId) ?? currentUser;
    const at = nowIso();
    const request: MovementRequest = {
      id: rid('mv'),
      equipmentId,
      initiatedByUserId: actor.id,
      fromRoomId: eq.roomId,
      toRoomId,
      initiatedAt: at,
      approvalStatus: 'PENDING',
      flaggedUnapproved: false,
      accessoryCheckIns: [],
      movementKind,
      expectedReturnAt: movementKind === 'TEMPORARY' ? expectedReturnAt : undefined,
      note,
    };
    set((s) => ({
      movementRequests: [request, ...s.movementRequests],
      notifications: [
        {
          id: rid('ntf'),
          tier: 'IMMEDIATE',
          equipmentId,
          title: `${equipmentName(eq)} — movement logged, awaiting approval`,
          body: `${actor.name} logged a ${movementKind === 'TEMPORARY' ? 'temporary' : 'permanent'} move to ${getRoom(toRoomId)?.name ?? 'a new location'}.`,
          createdAt: at,
          actionLabel: 'Review move',
          actionHref: '/approvals',
        },
        ...s.notifications,
      ],
      activity: [
        {
          id: rid('act'), equipmentId, eventType: 'MOVE_INITIATED',
          actorUserId: actor.id, actorSystem: false, occurredAt: at,
          summary: `Movement to ${getRoom(toRoomId)?.name ?? 'new location'} logged by ${actor.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  approveMovement: (id) => {
    const move = get().movementRequests.find((m) => m.id === id);
    if (!move) return;
    const at = nowIso();
    set((s) => ({
      movementRequests: s.movementRequests.map((m) =>
        m.id === id
          ? { ...m, approvalStatus: 'APPROVED' as const, approvedByUserId: currentUser.id, approvedAt: at, flaggedUnapproved: false }
          : m,
      ),
      equipment: s.equipment.map((e) =>
        e.id === move.equipmentId
          ? { ...e, roomId: move.toRoomId, departmentId: getRoom(move.toRoomId)?.departmentId ?? e.departmentId }
          : e,
      ),
      activity: [
        {
          id: rid('act'), equipmentId: move.equipmentId, eventType: 'MOVE_APPROVED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: `Movement approved by ${currentUser.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  confirmMovementReturn: (id, opts) => {
    const move = get().movementRequests.find((m) => m.id === id);
    if (!move) return;
    if (move.approvalStatus !== 'APPROVED' || move.movementKind !== 'TEMPORARY' || move.returnedAt) return;
    const actor = (opts?.actorUserId ? getUser(opts.actorUserId) : undefined) ?? currentUser;
    const withAccessories = opts?.returnedWithAllAccessories ?? true;
    const at = nowIso();
    set((s) => ({
      movementRequests: s.movementRequests.map((m) =>
        m.id === id
          ? { ...m, returnedAt: at, returnedByUserId: actor.id, returnedWithAllAccessories: withAccessories }
          : m,
      ),
      equipment: s.equipment.map((e) =>
        e.id === move.equipmentId
          ? { ...e, roomId: move.fromRoomId, departmentId: getRoom(move.fromRoomId)?.departmentId ?? e.departmentId }
          : e,
      ),
      activity: [
        {
          id: rid('act'), equipmentId: move.equipmentId, eventType: 'MOVE_RETURNED',
          actorUserId: actor.id, actorSystem: false, occurredAt: at,
          summary: withAccessories
            ? `Return confirmed by ${actor.name}`
            : `Return confirmed by ${actor.name} — accessories missing, flagged for follow-up`,
        },
        ...s.activity,
      ],
    }));
  },

  rejectMovement: (id) => {
    const move = get().movementRequests.find((m) => m.id === id);
    if (!move) return;
    const at = nowIso();
    set((s) => ({
      movementRequests: s.movementRequests.map((m) =>
        m.id === id
          ? { ...m, approvalStatus: 'REJECTED' as const, approvedByUserId: currentUser.id, approvedAt: at, flaggedUnapproved: false }
          : m,
      ),
      activity: [
        {
          id: rid('act'), equipmentId: move.equipmentId, eventType: 'MOVE_REJECTED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: `Movement rejected by ${currentUser.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  resolveCondemnation: (id, resolution, notes) => {
    const record = get().condemnationRecords.find((c) => c.id === id);
    if (!record) return;
    const at = nowIso();
    const outcome = resolution === 'CONDEMN' ? 'CONDEMNED' as const : 'REFURBISHED' as const;
    set((s) => ({
      condemnationRecords: s.condemnationRecords.map((c) =>
        c.id === id
          ? { ...c, approvedByUserId: currentUser.id, approvedAt: at, resolution: outcome, resolutionNotes: notes }
          : c,
      ),
      equipment:
        resolution === 'CONDEMN'
          ? s.equipment.map((e) => (e.id === record.equipmentId ? { ...e, financialStatus: 'CONDEMNED' as const } : e))
          : s.equipment,
      activity: [
        {
          id: rid('act'), equipmentId: record.equipmentId, eventType: 'CONDEMNATION_APPROVED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary:
            resolution === 'CONDEMN'
              ? `Condemned by ${currentUser.name}`
              : `Refurbish approved by ${currentUser.name} — reuse with parts replacement`,
        },
        ...s.activity,
      ],
    }));
  },

  rejectCondemnation: (id) => {
    const record = get().condemnationRecords.find((c) => c.id === id);
    if (!record) return;
    const at = nowIso();
    set((s) => ({
      condemnationRecords: s.condemnationRecords.map((c) =>
        c.id === id ? { ...c, rejectedByUserId: currentUser.id, rejectedAt: at } : c,
      ),
      activity: [
        {
          id: rid('act'), equipmentId: record.equipmentId, eventType: 'CONDEMNATION_REJECTED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: `Condemnation request rejected by ${currentUser.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  requestCondemnation: (equipmentId, justification) => {
    const at = nowIso();
    const windowStart = new Date(demoNow().getTime() - 365 * 24 * 3600_000).toISOString();
    const breakdownCountLast12m = get().tickets.filter(
      (t) => t.equipmentId === equipmentId && t.source === 'SCAN_BREAKDOWN' && t.openedAt >= windowStart,
    ).length;
    const repairCostLast12m = get().workOrders
      .filter((w) => w.equipmentId === equipmentId && w.startedAt >= windowStart)
      .reduce((sum, w) => sum + w.labourCost + w.partsCost, 0);

    const record: CondemnationRecord = {
      id: rid('cnd'),
      equipmentId,
      requestedByUserId: currentUser.id,
      justification,
      breakdownCountLast12m,
      repairCostLast12m,
    };

    set((s) => ({
      condemnationRecords: [record, ...s.condemnationRecords],
      activity: [
        {
          id: rid('act'), equipmentId, eventType: 'CONDEMNATION_REQUESTED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: `Condemnation review requested by ${currentUser.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  logCylinderEvent: ({ equipmentId, kind, quantity, note }) => {
    const entry: CylinderLogEntry = {
      id: rid('cyl'),
      equipmentId,
      loggedAt: nowIso(),
      kind,
      quantity,
      performedByUserId: currentUser.id,
      note,
    };
    set((s) => ({ cylinderLog: [entry, ...s.cylinderLog] }));
  },

  logConsumableEvent: ({ itemId, kind, quantity, note }) => {
    const entry: ConsumableLogEntry = {
      id: rid('con'),
      itemId,
      loggedAt: nowIso(),
      kind,
      quantity,
      performedByUserId: currentUser.id,
      note,
    };
    set((s) => ({ consumableLog: [entry, ...s.consumableLog] }));
  },

  addConsumableItem: ({ name, category, unit, reorderThreshold, initialQuantity, purchaseBillFileName, purchaseBillFileSizeKb }) => {
    const item: ConsumableItem = {
      id: rid('itm'), name, category, unit, reorderThreshold,
      purchaseBillFileName, purchaseBillFileSizeKb,
    };
    const openingEntry: ConsumableLogEntry | null =
      initialQuantity && initialQuantity > 0
        ? {
            id: rid('con'),
            itemId: item.id,
            loggedAt: nowIso(),
            kind: 'RESTOCK',
            quantity: initialQuantity,
            performedByUserId: currentUser.id,
            note: 'Opening stock, logged on item creation.',
          }
        : null;
    set((s) => ({
      consumableItems: [...s.consumableItems, item],
      consumableLog: openingEntry ? [openingEntry, ...s.consumableLog] : s.consumableLog,
    }));
  },

  addEquipmentDocument: ({ equipmentId, type, label, fileName, fileSizeKb, expiryDate }) => {
    const at = nowIso();
    const doc: EquipmentDocument = {
      id: rid('doc'),
      equipmentId,
      type,
      label,
      fileName,
      fileSizeKb,
      uploadedByUserId: currentUser.id,
      uploadedAt: at,
      expiryDate,
    };

    set((s) => ({
      documents: [doc, ...s.documents],
      activity: [
        {
          id: rid('act'), equipmentId, eventType: 'DOCUMENT_ADDED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: `${label ?? DOCUMENT_TYPE_LABEL[type]} added — ${fileName}`,
        },
        ...s.activity,
      ],
    }));
    return doc;
  },

  assignEngineer: (ticketId, engineerId) => {
    const ticket = get().tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const engineer = getUser(engineerId);
    if (!engineer) return;
    const at = nowIso();
    const existing = get().workOrders.find((w) => w.ticketId === ticketId);

    set((s) => ({
      workOrders: existing
        ? s.workOrders.map((w) => (w.id === existing.id ? { ...w, performedByUserId: engineerId } : w))
        : [
            {
              id: rid('wo'),
              workOrderNumber: `WO-2026-${String(200 + s.workOrders.length).padStart(4, '0')}`,
              equipmentId: ticket.equipmentId,
              ticketId,
              type: 'CORRECTIVE' as const,
              performedByUserId: engineerId,
              startedAt: at,
              labourCost: 0,
              partsCost: 0,
            },
            ...s.workOrders,
          ],
      tickets: s.tickets.map((t) =>
        t.id === ticketId && t.status === 'OPEN' ? { ...t, status: 'ASSIGNED' as const, assignedAt: at } : t,
      ),
      activity: [
        {
          id: rid('act'), equipmentId: ticket.equipmentId, eventType: 'TICKET_ASSIGNED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: existing
            ? `${ticket.ticketNumber} reassigned to ${engineer.name}`
            : `${ticket.ticketNumber} assigned to ${engineer.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  autoAssignOpenTickets: () => {
    const { tickets, workOrders, teamMembers } = get();
    const engineers = teamMembers.filter((m) => m.role === 'ENGINEER' && m.active);
    if (engineers.length === 0) return;

    const assignedTicketIds = new Set(workOrders.filter((w) => w.ticketId).map((w) => w.ticketId!));
    const unassigned = tickets
      .filter((t) => t.status === 'OPEN' && !assignedTicketIds.has(t.id))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.openedAt.localeCompare(b.openedAt));
    if (unassigned.length === 0) return;

    const load = new Map<string, number>(
      engineers.map((e) => [e.id, workOrders.filter((w) => w.performedByUserId === e.id && !w.completedAt).length]),
    );

    const at = nowIso();
    const newWorkOrders: WorkOrder[] = [];
    const events: ActivityEvent[] = [];
    const assignedByTicket = new Map<string, string>();

    for (const ticket of unassigned) {
      const [engineerId] = [...load.entries()].sort((a, b) => a[1] - b[1])[0];
      load.set(engineerId, (load.get(engineerId) ?? 0) + 1);
      assignedByTicket.set(ticket.id, engineerId);
      const engineer = getUser(engineerId);

      newWorkOrders.push({
        id: rid('wo'),
        workOrderNumber: `WO-2026-${String(200 + workOrders.length + newWorkOrders.length).padStart(4, '0')}`,
        equipmentId: ticket.equipmentId,
        ticketId: ticket.id,
        type: 'CORRECTIVE',
        performedByUserId: engineerId,
        startedAt: at,
        labourCost: 0,
        partsCost: 0,
      });
      events.push({
        id: rid('act'), equipmentId: ticket.equipmentId, eventType: 'TICKET_ASSIGNED',
        actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
        summary: `${ticket.ticketNumber} auto-assigned to ${engineer?.name ?? 'engineer'}`,
      });
    }

    set((s) => ({
      workOrders: [...newWorkOrders, ...s.workOrders],
      tickets: s.tickets.map((t) =>
        assignedByTicket.has(t.id) && t.status === 'OPEN' ? { ...t, status: 'ASSIGNED' as const, assignedAt: at } : t,
      ),
      activity: [...events, ...s.activity],
    }));
  },

  requestWarrantyOverride: (equipmentId) => {
    const actor = getUser(get().portalUserId) ?? currentUser;
    const at = nowIso();
    const request: WarrantyOverrideRequest = {
      id: rid('wor'),
      equipmentId,
      requestedByUserId: actor.id,
      requestedAt: at,
      status: 'PENDING',
    };
    const eq = get().equipment.find((e) => e.id === equipmentId);

    set((s) => ({
      warrantyOverrideRequests: [request, ...s.warrantyOverrideRequests],
      notifications: [
        {
          id: rid('ntf'),
          tier: 'IMMEDIATE',
          equipmentId,
          title: `${eq ? equipmentName(eq) : 'Equipment'} — warranty expired, override requested`,
          body: `${actor.name} requested approval to continue using this unit despite its expired warranty.`,
          createdAt: at,
          actionLabel: 'Review request',
          actionHref: '/approvals',
        },
        ...s.notifications,
      ],
      activity: [
        {
          id: rid('act'), equipmentId, eventType: 'WARRANTY_OVERRIDE_REQUESTED',
          actorUserId: actor.id, actorSystem: false, occurredAt: at,
          summary: `Warranty override requested by ${actor.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  approveWarrantyOverride: (id) => {
    const request = get().warrantyOverrideRequests.find((r) => r.id === id);
    if (!request) return;
    const at = nowIso();
    set((s) => ({
      warrantyOverrideRequests: s.warrantyOverrideRequests.map((r) =>
        r.id === id ? { ...r, status: 'APPROVED' as const, decidedByUserId: currentUser.id, decidedAt: at } : r,
      ),
      activity: [
        {
          id: rid('act'), equipmentId: request.equipmentId, eventType: 'WARRANTY_OVERRIDE_APPROVED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: `Warranty override approved by ${currentUser.name}`,
        },
        ...s.activity,
      ],
    }));
  },

  rejectWarrantyOverride: (id) => {
    const request = get().warrantyOverrideRequests.find((r) => r.id === id);
    if (!request) return;
    const at = nowIso();
    set((s) => ({
      warrantyOverrideRequests: s.warrantyOverrideRequests.map((r) =>
        r.id === id ? { ...r, status: 'REJECTED' as const, decidedByUserId: currentUser.id, decidedAt: at } : r,
      ),
      activity: [
        {
          id: rid('act'), equipmentId: request.equipmentId, eventType: 'WARRANTY_OVERRIDE_REJECTED',
          actorUserId: currentUser.id, actorSystem: false, occurredAt: at,
          summary: `Warranty override rejected by ${currentUser.name}`,
        },
        ...s.activity,
      ],
    }));
  },

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
          responseHours: 48,
          resolutionHours: 168,
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

  itemDrafts: [],

  saveItemDraft: (id, data) => {
    const existing = id ? get().itemDrafts.find((d) => d.id === id) : undefined;
    const draft: ItemDraft = {
      ...data,
      id: existing?.id ?? rid('itemdraft'),
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({
      itemDrafts: existing ? s.itemDrafts.map((d) => (d.id === draft.id ? draft : d)) : [draft, ...s.itemDrafts],
    }));
    return draft.id;
  },

  discardItemDraft: (id) => set((s) => ({ itemDrafts: s.itemDrafts.filter((d) => d.id !== id) })),

  addItemForm: emptyItemDraftData(),
  addItemFormDraftId: null,
  addItemFormSnapshot: JSON.stringify(emptyItemDraftData()),

  updateAddItemForm: (patch) => set((s) => ({ addItemForm: { ...s.addItemForm, ...patch } })),

  setAddItemForm: (data, draftId) =>
    set({ addItemForm: data, addItemFormDraftId: draftId, addItemFormSnapshot: JSON.stringify(data) }),

  resetAddItemForm: () => {
    const empty = emptyItemDraftData();
    set({ addItemForm: empty, addItemFormDraftId: null, addItemFormSnapshot: JSON.stringify(empty) });
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

  teamMemberDocuments: [],

  addTeamMemberDocument: ({ memberId, label, fileName, fileSizeKb, expiryDate }) => {
    const doc: TeamMemberDocument = {
      id: rid('tmdoc'),
      memberId,
      label,
      fileName,
      fileSizeKb,
      uploadedAt: nowIso(),
      expiryDate,
    };
    set((s) => ({ teamMemberDocuments: [doc, ...s.teamMemberDocuments] }));
    return doc;
  },

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
      movementRequests: seedMovementRequests,
      condemnationRecords: seedCondemnationRecords,
      workOrders: seedWorkOrders,
      warrantyOverrideRequests: seedWarrantyOverrideRequests,
      documents: seedDocuments,
      cylinderLog: seedCylinderLog,
      consumableItems: seedConsumableItems,
      consumableLog: seedConsumableLog,
      activeSession: null,
      portalUserId: PORTAL_STAFF_USER_ID,
      portalNotificationsEnabled: true,
      engineerAvailability: 'AVAILABLE',
      emergencySessionIds: [],
      ticketPhotos: {},
      equipmentDrafts: [],
      addForm: emptyEquipmentDraftData(),
      addFormDraftId: null,
      addFormSnapshot: JSON.stringify(emptyEquipmentDraftData()),
      itemDrafts: [],
      addItemForm: emptyItemDraftData(),
      addItemFormDraftId: null,
      addItemFormSnapshot: JSON.stringify(emptyItemDraftData()),
      teamMembers: SEED_TEAM_MEMBERS,
      teamMemberDocuments: [],
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

/** Whoever the staff/engineer portal is currently "logged in" as. */
export const usePortalUser = () => useDemo((s) => getUser(s.portalUserId) ?? currentUser);

/** Pending count for the Approvals nav badge — spans every approval type on that page. */
export const usePendingApprovalsCount = () =>
  useDemo(
    (s) =>
      s.movementRequests.filter((m) => m.approvalStatus === 'PENDING' || m.flaggedUnapproved).length +
      s.warrantyOverrideRequests.filter((r) => r.status === 'PENDING').length,
  );
