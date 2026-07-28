/**
 * Meriva BEMS — Team
 *
 * Internal engineers and general staff (nurses/doctors/junior staff) on one
 * shared roster. Deliberately additive — extends `User` from types.ts rather
 * than editing that shared contract file.
 */

import type { User, UserRole, WorkOrder } from './types';
import { users, tickets, usageSessions, workOrders, getEquipmentById, getModel, getCategory, equipmentName } from './seed';
import { formatDuration } from './derive';

export type TeamRole = Extract<UserRole, 'ENGINEER' | 'STAFF'>;

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  ENGINEER: 'Engineer',
  STAFF: 'Staff',
};

export interface TeamMember extends User {
  role: TeamRole;
  staffId: string;
  /** Generated once at creation. Only ever surfaced right after signup. */
  password: string;
  joinedAt: string; // ISO date
  active: boolean;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Credential generation
// ─────────────────────────────────────────────────────────────

const STAFF_ID_PREFIX: Record<TeamRole, string> = { ENGINEER: 'ENG', STAFF: 'STF' };

const PASSWORD_WORDS = [
  'Falcon', 'Tiger', 'Comet', 'River', 'Maple', 'Granite', 'Harbor', 'Ember',
  'Cedar', 'Orbit', 'Quartz', 'Willow', 'Summit', 'Delta', 'Coral', 'Aspen',
];

function randomPassword(): string {
  const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
  const num = 100 + Math.floor(Math.random() * 900);
  return `${word}-${num}`;
}

function nextStaffId(role: TeamRole, existing: TeamMember[]): string {
  const prefix = STAFF_ID_PREFIX[role];
  const nums = existing
    .filter((m) => m.staffId.startsWith(`${prefix}-`))
    .map((m) => parseInt(m.staffId.slice(prefix.length + 1), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

export function generateCredentials(role: TeamRole, existing: TeamMember[]): { staffId: string; password: string } {
  return { staffId: nextStaffId(role, existing), password: randomPassword() };
}

// ─────────────────────────────────────────────────────────────
// Seed roster — built from the existing internal users (Ramesh, Ananya,
// Vikram). Freelance/external engineers are a separate concept
// (DirectoryEngineer, tokenized-link flow) and are out of scope here.
// ─────────────────────────────────────────────────────────────

const SEED_BASE: { userId: string; staffId: string; joinedAt: string; notes?: string }[] = [
  { userId: 'usr-eng', staffId: 'ENG-0001', joinedAt: '2022-03-14', notes: 'Primary biomedical engineer — ICU and imaging equipment.' },
  { userId: 'usr-staff1', staffId: 'STF-0001', joinedAt: '2023-06-01' },
  { userId: 'usr-staff2', staffId: 'STF-0002', joinedAt: '2021-11-20' },
];

export const SEED_TEAM_MEMBERS: TeamMember[] = SEED_BASE.map((base) => {
  const user = users.find((u) => u.id === base.userId) as User;
  return {
    ...user,
    role: user.role as TeamRole,
    staffId: base.staffId,
    password: '', // never shown for pre-existing accounts
    joinedAt: base.joinedAt,
    active: true,
    notes: base.notes,
  };
});

// ─────────────────────────────────────────────────────────────
// Availability — derived from whether they currently have any open job,
// not a manually-set field.
// ─────────────────────────────────────────────────────────────

export type Availability = 'AVAILABLE' | 'BUSY';

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
};

export const AVAILABILITY_DOT_CLASS: Record<Availability, string> = {
  AVAILABLE: 'bg-success',
  BUSY: 'bg-warning',
};

export function jobsForMember(memberId: string): WorkOrder[] {
  return workOrders.filter((w) => w.performedByUserId === memberId);
}

export function activeJobsCountFor(memberId: string): number {
  return jobsForMember(memberId).filter((w) => !w.completedAt).length;
}

export function completedJobsCountFor(memberId: string): number {
  return jobsForMember(memberId).filter((w) => w.completedAt).length;
}

export function availabilityFor(memberId: string): Availability {
  return activeJobsCountFor(memberId) > 0 ? 'BUSY' : 'AVAILABLE';
}

export function avgResolutionTimeFor(memberId: string): string {
  const completed = jobsForMember(memberId).filter((w) => w.completedAt);
  if (completed.length === 0) return '—';
  const totalSeconds = completed.reduce(
    (sum, w) => sum + (new Date(w.completedAt!).getTime() - new Date(w.startedAt).getTime()) / 1000,
    0
  );
  return formatDuration(Math.round(totalSeconds / completed.length));
}

/** Equipment categories handled, from completed job history — never manually entered. */
export function equipmentTypesHandledFor(memberId: string): string[] {
  const names = new Set<string>();
  for (const w of jobsForMember(memberId).filter((w) => w.completedAt)) {
    const eq = getEquipmentById(w.equipmentId);
    const model = eq ? getModel(eq.equipmentModelId) : undefined;
    const category = model ? getCategory(model.categoryId) : undefined;
    if (category) names.add(category.name);
  }
  return Array.from(names);
}

// ─────────────────────────────────────────────────────────────
// Job history (Internal engineer) — each job plus the usage session that
// originated it, if the job came from a scan-triggered breakdown.
// ─────────────────────────────────────────────────────────────

export interface JobHistoryOrigin {
  flaggedBy: string;
  usedFor: string;
  reason: string;
}

export interface JobHistoryRow {
  id: string;
  workOrderNumber: string;
  type: WorkOrder['type'];
  equipmentName: string;
  status: 'Completed' | 'In progress';
  date: string;
  resolutionDuration?: string;
  findings?: string;
  labourCost: number;
  partsCost: number;
  ticketNumber?: string;
  ticketDescription?: string;
  origin?: JobHistoryOrigin;
}

export function jobHistoryFor(memberId: string): JobHistoryRow[] {
  return jobsForMember(memberId)
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((w) => {
      const eq = getEquipmentById(w.equipmentId);
      const ticket = w.ticketId ? tickets.find((t) => t.id === w.ticketId) : undefined;

      let origin: JobHistoryOrigin | undefined;
      if (ticket) {
        const session = usageSessions.find(
          (s) => s.equipmentId === ticket.equipmentId && s.endReason === 'BREAKDOWN' && s.endedAt === ticket.openedAt
        );
        if (session) {
          const flagger = users.find((u) => u.id === session.userId);
          origin = {
            flaggedBy: flagger?.name ?? 'Unknown',
            usedFor: session.durationSeconds ? formatDuration(session.durationSeconds) : 'a short time',
            reason: ticket.issueType,
          };
        }
      }

      return {
        id: w.id,
        workOrderNumber: w.workOrderNumber,
        type: w.type,
        equipmentName: eq ? equipmentName(eq) : 'Unknown equipment',
        status: w.completedAt ? 'Completed' : 'In progress',
        date: w.startedAt,
        resolutionDuration: w.completedAt
          ? formatDuration(Math.round((new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()) / 1000))
          : undefined,
        findings: w.findings,
        labourCost: w.labourCost,
        partsCost: w.partsCost,
        ticketNumber: ticket?.ticketNumber,
        ticketDescription: ticket?.description,
        origin,
      };
    });
}

// ─────────────────────────────────────────────────────────────
// Usage sessions (General staff)
// ─────────────────────────────────────────────────────────────

export interface SessionHistoryRow {
  id: string;
  equipmentName: string;
  date: string;
  duration: string;
  breakdownFlag?: string;
}

export function sessionsForMember(memberId: string): SessionHistoryRow[] {
  return usageSessions
    .filter((s) => s.userId === memberId)
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((s) => {
      const eq = getEquipmentById(s.equipmentId);
      let breakdownFlag: string | undefined;
      if (s.endReason === 'BREAKDOWN') {
        const ticket = tickets.find((t) => t.equipmentId === s.equipmentId && t.openedAt === s.endedAt);
        breakdownFlag = ticket?.issueType ?? 'Breakdown flagged';
      }
      return {
        id: s.id,
        equipmentName: eq ? equipmentName(eq) : 'Unknown equipment',
        date: s.startedAt,
        duration: s.durationSeconds ? formatDuration(s.durationSeconds) : 'In progress',
        breakdownFlag,
      };
    });
}

export function sessionsLoggedCountFor(memberId: string): number {
  return usageSessions.filter((s) => s.userId === memberId).length;
}
