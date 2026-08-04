/**
 * Meriva BEMS — Derived logic
 *
 * Nothing here is stored. Every value is computed from seed data at render time,
 * which is exactly how it should work against a real API later.
 *
 * The important idea: `operationalStatus` and `financialStatus` are STATES.
 * Everything in `EquipmentFlag` is a computed BADGE. One unit can be
 * IN_SERVICE while carrying PM_OVERDUE + WARRANTY_EXPIRED + AGED_STOCK.
 */

import type {
  Equipment, EquipmentFlag, EquipmentDerived, GateEvaluation, GateState,
  UsageSession, DashboardStats, Ticket, TicketStatus, DocumentType, EquipmentDocument, ActivityEventType,
  WorkOrder, PmTriggerType, Department, AlertType, NotificationChannel, Criticality,
} from './types';
import type { ActivityFeedItem } from '@/components/recent-activity-feed';
import {
  contractsFor, pmScheduleFor, calibrationsFor, authorisationFor,
  sessionsFor, ticketsFor, documentsFor, equipment as allEquipment, tickets as allTickets,
  workOrders, getCategory, getModel, getEquipmentById, getDepartment, getUser, equipmentName,
  usageSessions, movementRequests, activityEvents as allActivity, getRoom, getVendor,
} from './seed';

/** Fixed "today" so the demo never drifts. Set to null to use the real clock. */
export const DEMO_TODAY: Date | null = new Date('2026-07-24T10:00:00+05:30');

export const now = () => DEMO_TODAY ?? new Date();

// ─────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - now().getTime();
  return Math.ceil(diff / 864e5);
}

export function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Indian numbering — ₹14,50,000 not ₹1,450,000. Matters in this market. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────
// Procurement integrity
// ─────────────────────────────────────────────────────────────

/**
 * Months the unit sat before it was bought. Manufacture year only gives us
 * a year, so we assume 1 July as the midpoint — honest enough for a flag,
 * and worth replacing with a real manufacture date if the nameplate has one.
 */
export function shelfAgeMonths(eq: Equipment): number {
  const assumedManufacture = `${eq.yearOfManufacture}-07-01`;
  return Math.max(0, monthsBetween(assumedManufacture, eq.dateOfPurchase));
}

export const AGED_STOCK_THRESHOLD_MONTHS = 12;

/** Years in service since installation — the "how old is this unit" number, not the pre-purchase shelf age. */
export function ageYears(eq: Equipment): number {
  const months = monthsBetween(eq.dateOfInstallation, now().toISOString());
  return Number.isFinite(months) ? months / 12 : 0;
}

// ─────────────────────────────────────────────────────────────
// Usage confidence — what makes usage-based triggers honest
// ─────────────────────────────────────────────────────────────

/**
 * Share of recorded session time that came from a real scan-out, as a
 * percentage. Surface it next to the hours: "4,187 hrs — 82% confirmed".
 * Without this, nobody should trust a usage-based PM trigger.
 */
export function usageConfidencePct(sessions: UsageSession[]): number {
  const total = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  if (total === 0) return 100;
  const trusted = sessions
    .filter((s) => s.dataQuality === 'CONFIRMED' || s.dataQuality === 'CORRECTED')
    .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  return Math.round((trusted / total) * 100);
}

// ─────────────────────────────────────────────────────────────
// Flags
// ─────────────────────────────────────────────────────────────

const PM_WARN_DAYS = 14;
const CALIBRATION_WARN_DAYS = 30;
const CONTRACT_WARN_DAYS = 90;

export function computeFlags(eq: Equipment): EquipmentFlag[] {
  const flags: EquipmentFlag[] = [];

  // Preventive maintenance
  const pm = pmScheduleFor(eq.id);
  if (pm?.nextDueDate) {
    const d = daysUntil(pm.nextDueDate);
    if (d < 0) flags.push('PM_OVERDUE');
    else if (d <= PM_WARN_DAYS) flags.push('PM_DUE');
  }
  // Usage-hour trigger can fire independently of the calendar
  if (pm?.nextDueHours && eq.cumulativeUsageHours >= pm.nextDueHours) {
    if (!flags.includes('PM_OVERDUE')) flags.push('PM_OVERDUE');
  }

  // Calibration
  const cals = calibrationsFor(eq.id);
  const latest = cals.sort((a, b) => b.validUntil.localeCompare(a.validUntil))[0];
  if (latest) {
    const d = daysUntil(latest.validUntil);
    if (d < 0) flags.push('CALIBRATION_EXPIRED');
    else if (d <= CALIBRATION_WARN_DAYS) flags.push('CALIBRATION_EXPIRING');
  }

  // Contracts
  for (const c of contractsFor(eq.id)) {
    const d = daysUntil(c.endDate);
    if (c.type === 'WARRANTY') {
      if (d < 0) flags.push('WARRANTY_EXPIRED');
      else if (d <= CONTRACT_WARN_DAYS) flags.push('WARRANTY_EXPIRING');
    } else if (c.type === 'AMC' || c.type === 'CMC') {
      if (d >= 0 && d <= CONTRACT_WARN_DAYS) flags.push('AMC_EXPIRING');
    }
  }
  // Condemned units carry no warranty by definition
  if (eq.financialStatus === 'CONDEMNED' && !flags.includes('WARRANTY_EXPIRED')) {
    flags.push('WARRANTY_EXPIRED');
  }

  // Continued-use review
  const auth = authorisationFor(eq.id);
  if (eq.financialStatus === 'CONDEMNED') {
    if (!auth || daysUntil(auth.validUntil) < 0) {
      flags.push('CONTINUED_USE_REVIEW_OVERDUE');
    }
  }

  // SLA
  if (ticketsFor(eq.id).some((t) => isSlaBreached(t))) flags.push('SLA_BREACHED');

  // Procurement
  if (shelfAgeMonths(eq) > AGED_STOCK_THRESHOLD_MONTHS) flags.push('AGED_STOCK_AT_PURCHASE');

  return flags;
}

export function isSlaBreached(t: Ticket): boolean {
  if (t.status === 'CLOSED' || t.status === 'RESOLVED') return t.slaBreached;
  if (!t.slaDueAt) return false;
  return new Date(t.slaDueAt).getTime() < now().getTime();
}

/** Human-readable labels. Keep UI copy in one place. */
export const FLAG_LABEL: Record<EquipmentFlag, string> = {
  PM_DUE: 'PM due',
  PM_OVERDUE: 'PM overdue',
  CALIBRATION_EXPIRING: 'Calibration expiring',
  CALIBRATION_EXPIRED: 'Calibration expired',
  WARRANTY_EXPIRING: 'Warranty expiring',
  WARRANTY_EXPIRED: 'Warranty expired',
  AMC_EXPIRING: 'AMC expiring',
  SLA_BREACHED: 'SLA breached',
  CONTINUED_USE_REVIEW_OVERDUE: 'Review overdue',
  AGED_STOCK_AT_PURCHASE: 'Aged stock',
};

/** Which flags are serious enough to gate a scan. */
const AMBER_FLAGS: EquipmentFlag[] = [
  'PM_OVERDUE', 'CALIBRATION_EXPIRED', 'WARRANTY_EXPIRED',
  'CONTINUED_USE_REVIEW_OVERDUE', 'SLA_BREACHED',
];

/**
 * Tag color per flag, using the shared status tokens (design-tokens.css)
 * instead of one flat orange for everything. Grouped by severity: SLA
 * breach is the most serious (danger); overdue/expired items are next
 * (warning); still-upcoming "expiring soon" items are informational
 * (status-accent); aged stock is a low-urgency procurement note (neutral).
 */
export const FLAG_TAG_CLASS: Record<EquipmentFlag, string> = {
  PM_DUE: 'bg-status-accent/10 text-status-accent border-status-accent/30',
  PM_OVERDUE: 'bg-warning/10 text-warning border-warning/30',
  CALIBRATION_EXPIRING: 'bg-status-accent/10 text-status-accent border-status-accent/30',
  CALIBRATION_EXPIRED: 'bg-warning/10 text-warning border-warning/30',
  WARRANTY_EXPIRING: 'bg-status-accent/10 text-status-accent border-status-accent/30',
  WARRANTY_EXPIRED: 'bg-warning/10 text-warning border-warning/30',
  AMC_EXPIRING: 'bg-status-accent/10 text-status-accent border-status-accent/30',
  SLA_BREACHED: 'bg-danger/10 text-danger border-danger/30',
  CONTINUED_USE_REVIEW_OVERDUE: 'bg-warning/10 text-warning border-warning/30',
  AGED_STOCK_AT_PURCHASE: 'bg-neutral/10 text-neutral border-neutral/30',
};

// ─────────────────────────────────────────────────────────────
// Standardized equipment status — used everywhere: Dashboard,
// Equipment list, equipment profile. Buckets checked in order;
// a unit only ever carries one at a time (unlike EquipmentFlag,
// where several can stack).
// ─────────────────────────────────────────────────────────────

export type EquipmentStatusKey = 'operational' | 'attention' | 'maintenance' | 'down' | 'condemned';

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatusKey, string> = {
  operational: 'Operational',
  attention: 'Attention required',
  maintenance: 'Under maintenance',
  down: 'Out of service',
  condemned: 'Condemned',
};

/** Small status dot — activity feeds, legends. */
export const EQUIPMENT_STATUS_DOT_CLASS: Record<EquipmentStatusKey, string> = {
  operational: 'bg-emerald-500',
  attention: 'bg-amber-500',
  maintenance: 'bg-sky-500',
  down: 'bg-red-500',
  condemned: 'bg-zinc-500',
};

/** Status badge — tables, cards. */
export const EQUIPMENT_STATUS_BADGE_CLASS: Record<EquipmentStatusKey, string> = {
  operational: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  attention: 'bg-amber-50 text-amber-800 border-amber-200',
  maintenance: 'bg-sky-50 text-sky-700 border-sky-200',
  down: 'bg-red-50 text-red-700 border-red-200',
  condemned: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

/** Criticality label/badge — shared by the Equipment list and design system reference. */
export const CRITICALITY_LABEL: Record<Criticality, string> = {
  CRITICAL: 'Critical',
  SEMI_CRITICAL: 'Semi-critical',
  NON_CRITICAL: 'Non-critical',
};

export const CRITICALITY_BADGE_CLASS: Record<Criticality, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  SEMI_CRITICAL: 'bg-amber-50 text-amber-800 border-amber-200',
  NON_CRITICAL: 'bg-sky-50 text-sky-700 border-sky-200',
};

export function equipmentStatusKey(eq: Equipment): EquipmentStatusKey {
  if (eq.financialStatus === 'CONDEMNED') return 'condemned';
  if (eq.operationalStatus === 'DOWN') return 'down';
  if (eq.operationalStatus === 'UNDER_MAINTENANCE') return 'maintenance';
  if (computeFlags(eq).length > 0) return 'attention';
  return 'operational';
}

// ─────────────────────────────────────────────────────────────
// Documents — completeness against the baseline expected set,
// feeds the Equipment list's "Docs" column.
// ─────────────────────────────────────────────────────────────

export const BASELINE_DOC_TYPES: DocumentType[] = ['MANUAL', 'INVOICE', 'WARRANTY_CARD'];

export function docsCompletion(eq: Equipment): { present: number; expected: number } {
  const owned = new Set(documentsFor(eq.id).map((d) => d.type));
  const present = BASELINE_DOC_TYPES.filter((t) => owned.has(t)).length;
  return { present, expected: BASELINE_DOC_TYPES.length };
}

// ─────────────────────────────────────────────────────────────
// Certifications & insurance — unlike warranty (always a single
// contract), an equipment can carry any number of these: a 5-year
// radiological safety certification, an insurance policy, and more
// added over time. Reuses EquipmentDocument's expiryDate field.
// ─────────────────────────────────────────────────────────────

export const CERTIFICATION_DOC_TYPES: DocumentType[] = ['CERTIFICATION', 'INSURANCE'];
export const CERTIFICATION_WARN_DAYS = 90;

export type ExpiryStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED';

export function expiryStatus(dateIso: string, warnDays = CERTIFICATION_WARN_DAYS): { status: ExpiryStatus; offsetDays: number } {
  const offsetDays = daysUntil(dateIso);
  const status: ExpiryStatus = offsetDays < 0 ? 'EXPIRED' : offsetDays <= warnDays ? 'EXPIRING' : 'ACTIVE';
  return { status, offsetDays };
}

/** Certification/insurance documents for a unit, soonest-expiring first. */
export function certificationDocuments(equipmentId: string): (EquipmentDocument & { expiryDate: string })[] {
  return documentsFor(equipmentId)
    .filter((d): d is EquipmentDocument & { expiryDate: string } => CERTIFICATION_DOC_TYPES.includes(d.type) && !!d.expiryDate)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

// ─────────────────────────────────────────────────────────────
// Last serviced — most recent completed work order or PM run.
// ─────────────────────────────────────────────────────────────

export function lastServicedAt(eq: Equipment): string | undefined {
  const dates: string[] = [];
  const pm = pmScheduleFor(eq.id);
  if (pm?.lastPerformedAt) dates.push(pm.lastPerformedAt);
  for (const w of workOrders) {
    if (w.equipmentId === eq.id && w.completedAt) dates.push(w.completedAt);
  }
  if (dates.length === 0) return undefined;
  return dates.sort().at(-1);
}

// ─────────────────────────────────────────────────────────────
// Operating hours — usage accumulated since the last PM run, feeds
// the Maintenance tab's "Operating hours" card. Sessions are windowed
// to lastPerformedAt rather than introducing a separate hours ledger.
// ─────────────────────────────────────────────────────────────

const HOURS_BASED_TRIGGERS: PmTriggerType[] = ['USAGE_HOURS', 'WHICHEVER_FIRST'];

export interface OperatingHoursSummary {
  cumulativeHours: number;
  lastPmDate?: string;
  hoursSinceLastPm: number | null;
  sessionsSinceLastPm: number;
  avgSessionSeconds: number | null;
  /** % of the way to the next hours-based PM threshold; null when the trigger is calendar-only. */
  hoursTriggerPct: number | null;
}

export function operatingHoursSummary(eq: Equipment): OperatingHoursSummary {
  const pm = pmScheduleFor(eq.id);
  const since = pm?.lastPerformedAt;
  const windowSessions = since
    ? sessionsFor(eq.id).filter((s) => new Date(s.startedAt).getTime() >= new Date(since).getTime())
    : [];
  const totalSeconds = windowSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  const isHoursBased = !!pm && HOURS_BASED_TRIGGERS.includes(pm.triggerType);
  const hoursTriggerPct =
    isHoursBased && pm?.nextDueHours
      ? Math.min(100, Math.round((eq.cumulativeUsageHours / pm.nextDueHours) * 100))
      : null;

  return {
    cumulativeHours: eq.cumulativeUsageHours,
    lastPmDate: since,
    hoursSinceLastPm: since ? totalSeconds / 3600 : null,
    sessionsSinceLastPm: windowSessions.length,
    avgSessionSeconds: windowSessions.length > 0 ? totalSeconds / windowSessions.length : null,
    hoursTriggerPct,
  };
}

// ─────────────────────────────────────────────────────────────
// Cost of ownership
// ─────────────────────────────────────────────────────────────

export function totalCostOfOwnership(eq: Equipment): number {
  const contractCost = contractsFor(eq.id).reduce((sum, c) => sum + c.annualCost, 0);
  return eq.purchaseCost + contractCost;
}

// ─────────────────────────────────────────────────────────────
// The full derived bundle
// ─────────────────────────────────────────────────────────────

export function derive(eq: Equipment): EquipmentDerived {
  const sessions = sessionsFor(eq.id);
  const pm = pmScheduleFor(eq.id);
  return {
    shelfAgeMonths: shelfAgeMonths(eq),
    flags: computeFlags(eq),
    activeSession: sessions.find((s) => !s.endedAt),
    usageConfidencePct: usageConfidencePct(sessions),
    nextPmDue: pm?.nextDueDate,
    totalCostOfOwnership: totalCostOfOwnership(eq),
  };
}

// ─────────────────────────────────────────────────────────────
// The scan gate
// ─────────────────────────────────────────────────────────────

/**
 * Every scan is a safety checkpoint. RED blocks the session, AMBER requires
 * an acknowledgement that gets logged against the person's name, GREEN just
 * starts the timer.
 */
export function evaluateGate(eq: Equipment): GateEvaluation {
  // RED — hard stop
  if (eq.operationalStatus === 'DOWN') {
    return {
      state: 'RED',
      headline: 'This unit is marked down',
      detail: 'Maintenance is in progress. Contact biomedical before use.',
      canProceed: false,
    };
  }
  if (eq.operationalStatus === 'RETIRED' || eq.operationalStatus === 'DISPOSED') {
    return {
      state: 'RED',
      headline: 'This unit is out of service',
      detail: 'It has been retired and cannot be used.',
      canProceed: false,
    };
  }
  if (eq.operationalStatus === 'UNDER_MAINTENANCE') {
    return {
      state: 'RED',
      headline: 'Maintenance in progress',
      detail: 'An engineer is working on this unit.',
      canProceed: false,
    };
  }

  // AMBER — proceed with an acknowledgement
  const flags = computeFlags(eq);
  const blocking = flags.filter((f) => AMBER_FLAGS.includes(f));

  if (blocking.length > 0) {
    const auth = authorisationFor(eq.id);
    const reasons = blocking.map((f) => FLAG_LABEL[f]).join(' · ');

    return {
      state: 'AMBER',
      headline: reasons,
      detail: auth
        ? `Biomedical approved continued use until ${formatDate(auth.validUntil)}. ${auth.reason}`
        : 'No continued-use authorisation on file. Contact biomedical if unsure.',
      authorisationValidUntil: auth?.validUntil,
      canProceed: true,
    };
  }

  // GREEN
  return { state: 'GREEN', headline: 'Ready to use', canProceed: true };
}

export const GATE_COLOUR: Record<GateState, string> = {
  GREEN: 'emerald',
  AMBER: 'amber',
  RED: 'red',
};

// ─────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────

/** When a declared session should have ended, in ms since epoch. */
export function expectedEndAt(session: UsageSession): number | null {
  if (!session.expectedDurationMinutes) return null;
  return new Date(session.startedAt).getTime() + session.expectedDurationMinutes * 60_000;
}

/** Grace period before we nudge, then auto-close. */
export const SESSION_GRACE_MINUTES = 10;

export function isSessionOverrunning(session: UsageSession): boolean {
  const expected = expectedEndAt(session);
  if (!expected || session.endedAt) return false;
  return now().getTime() > expected + SESSION_GRACE_MINUTES * 60_000;
}

/** Auto-close threshold for a unit with no declared expectation. */
export function maxSessionSeconds(eq: Equipment): number {
  const model = getModel(eq.equipmentModelId);
  const category = model ? getCategory(model.categoryId) : undefined;
  return (category?.maxSessionHours ?? 24) * 3600;
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

export function dashboardStats(): DashboardStats {
  const fleet = allEquipment;
  const down = fleet.filter((e) => e.operationalStatus === 'DOWN').length;
  const underMaintenance = fleet.filter((e) => e.operationalStatus === 'UNDER_MAINTENANCE').length;
  const operational = fleet.filter((e) => e.operationalStatus === 'IN_SERVICE').length;
  const open = allTickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED');

  const allFlags = fleet.flatMap((e) => computeFlags(e));
  const count = (f: EquipmentFlag) => allFlags.filter((x) => x === f).length;

  return {
    totalEquipment: fleet.length,
    operational,
    down,
    underMaintenance,
    uptimePct: fleet.length === 0 ? 100 : Math.round((operational / fleet.length) * 1000) / 10,
    openTickets: open.length,
    slaBreached: open.filter(isSlaBreached).length,
    pmDueThisWeek: count('PM_DUE') + count('PM_OVERDUE'),
    calibrationExpiring30d: count('CALIBRATION_EXPIRING') + count('CALIBRATION_EXPIRED'),
    contractsExpiring90d: count('AMC_EXPIRING') + count('WARRANTY_EXPIRING'),
    unapprovedMoves: 0,
    condemnedInUse: fleet.filter(
      (e) => e.financialStatus === 'CONDEMNED' && e.operationalStatus === 'IN_SERVICE',
    ).length,
  };
}

// ─────────────────────────────────────────────────────────────
// Active jobs — internal repair tickets, joined to whichever
// engineer's work order is attached (if any). Shared by the
// Dashboard's Jobs tab and the dedicated Jobs page.
// ─────────────────────────────────────────────────────────────

export const JOB_STATUS_LABEL: Partial<Record<TicketStatus, string>> = {
  OPEN: 'Pending assignment',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  PENDING_PARTS: 'Awaiting parts',
  PENDING_VENDOR: 'Awaiting vendor',
};

export const TICKET_SOURCE_LABEL: Record<string, string> = {
  SCAN_BREAKDOWN: 'Flagged via scan',
  MANUAL: 'Manually raised',
  PM_FINDING: 'PM finding',
};

export const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };

export const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-amber-50 text-amber-800 border-amber-200',
  NORMAL: 'bg-sky-50 text-sky-700 border-sky-200',
};

export interface ActiveJob {
  id: string;
  equipmentId: string;
  equipmentDisplayName: string;
  department: string;
  priority: string;
  status: TicketStatus;
  statusLabel: string;
  engineerName: string | null;
  lastUpdated: string;
  slaBreached: boolean;
  ticketNumber: string;
  issueType: string;
  description: string;
  source: string;
  raisedByName: string;
  openedAt: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDueAt?: string;
  downtimeHours?: number;
  runtimeHoursAtFailure?: number;
  timeToComplete?: string;
}

function toActiveJob(t: Ticket, statusLabel: string): ActiveJob {
  const eq = getEquipmentById(t.equipmentId);
  const dept = eq ? getDepartment(eq.departmentId) : undefined;
  const wo = workOrders.find((w) => w.ticketId === t.id);
  const engineer = wo ? getUser(wo.performedByUserId) : undefined;
  return {
    id: t.id,
    equipmentId: t.equipmentId,
    equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
    department: dept?.name ?? '—',
    priority: t.priority,
    status: t.status,
    statusLabel,
    engineerName: engineer?.name ?? null,
    lastUpdated: t.assignedAt ?? t.openedAt,
    slaBreached: isSlaBreached(t),
    ticketNumber: t.ticketNumber,
    issueType: t.issueType,
    description: t.description,
    source: TICKET_SOURCE_LABEL[t.source] ?? t.source,
    raisedByName: getUser(t.raisedByUserId)?.name ?? 'Unknown',
    openedAt: t.openedAt,
    assignedAt: t.assignedAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    slaDueAt: t.slaDueAt,
    downtimeHours: t.downtimeHours,
    runtimeHoursAtFailure: t.runtimeHoursAtFailure,
  };
}

export function buildActiveJobs(): ActiveJob[] {
  return allTickets
    .filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED')
    .map((t) => toActiveJob(t, JOB_STATUS_LABEL[t.status] ?? t.status.replace(/_/g, ' ').toLowerCase()))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.lastUpdated.localeCompare(b.lastUpdated),
    );
}

/** Resolved/closed tickets — the Jobs page's history section. */
export function buildClosedJobs(): ActiveJob[] {
  return allTickets
    .filter((t) => t.status === 'CLOSED' || t.status === 'RESOLVED')
    .map((t) => {
      const completedAt = t.closedAt ?? t.resolvedAt ?? t.openedAt;
      const completionSeconds = Math.round(
        (new Date(completedAt).getTime() - new Date(t.openedAt).getTime()) / 1000,
      );
      return {
        ...toActiveJob(t, t.status === 'CLOSED' ? 'Closed' : 'Resolved'),
        lastUpdated: completedAt,
        slaBreached: t.slaBreached,
        timeToComplete: completionSeconds > 0 ? formatDuration(completionSeconds) : undefined,
      };
    })
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}

// ─────────────────────────────────────────────────────────────
// Recent activity — curated event types, colored by severity.
// Shared by the Dashboard's Activity tab and the dedicated
// Activity page.
// ─────────────────────────────────────────────────────────────

export const CURATED_ACTIVITY_TYPES: ActivityEventType[] = [
  'BREAKDOWN_FLAGGED',
  'WORK_ORDER_CREATED',
  'SESSION_STARTED',
  'MOVE_INITIATED',
  'MOVE_ARRIVED',
  'MOVE_APPROVED',
  'MOVE_FLAGGED',
];

/** Event types that represent something finishing/settling, vs. starting. */
const COMPLETION_ACTIVITY_TYPES: ActivityEventType[] = [
  'SESSION_ENDED', 'SESSION_AUTO_CLOSED', 'WORK_ORDER_COMPLETED',
  'TICKET_RESOLVED', 'TICKET_CLOSED', 'MOVE_APPROVED', 'CONDEMNATION_APPROVED',
];

export function eventDotClass(type: ActivityEventType): string {
  if (type === 'BREAKDOWN_FLAGGED' || type === 'TICKET_OPENED') return 'bg-red-500';
  if (
    type === 'CONDEMNATION_REQUESTED' ||
    type === 'CONDEMNATION_APPROVED' ||
    type === 'CONTINUED_USE_AUTHORISED' ||
    type === 'CONTINUED_USE_REVIEWED' ||
    type === 'CONTINUED_USE_REVOKED' ||
    type === 'GATE_ACKNOWLEDGED'
  )
    return 'bg-amber-500';
  if (
    type === 'SESSION_STARTED' ||
    type === 'SESSION_ENDED' ||
    type === 'SESSION_AUTO_CLOSED' ||
    type === 'SESSION_CORRECTED' ||
    type === 'WORK_ORDER_CREATED' ||
    type === 'WORK_ORDER_COMPLETED' ||
    type === 'PM_PERFORMED' ||
    type === 'CALIBRATION_RECORDED'
  )
    return 'bg-emerald-500';
  if (type.startsWith('MOVE_')) return 'bg-sky-500';
  return 'bg-zinc-400';
}

export function relativeTimeFromNow(iso: string): string {
  const diffMs = now().getTime() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

export function buildRecentActivityItems(limit = 8): ActivityFeedItem[] {
  return allActivity
    .filter((a) => CURATED_ACTIVITY_TYPES.includes(a.eventType))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
    .map((a) => {
      const eq = getEquipmentById(a.equipmentId);
      return {
        id: a.id,
        equipmentName: eq ? equipmentName(eq) : 'Unknown equipment',
        href: `/equipment/${a.equipmentId}`,
        summary: a.summary,
        relativeTime: relativeTimeFromNow(a.occurredAt),
        dotClass: eventDotClass(a.eventType),
      };
    });
}

function isSameCalendarDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/**
 * Motion snapshot for the Activity tab/page: what's actively happening
 * right now (live sessions, open tickets, pending moves) vs. what settled
 * today (completed work orders, resolved/closed tickets, approved moves).
 */
export function activityMotionSnapshot() {
  const activeSessions = usageSessions.filter((s) => !s.endedAt).length;
  const openTickets = allTickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
  const pendingMoves = movementRequests.filter(
    (m) => m.approvalStatus === 'PENDING' || m.flaggedUnapproved,
  ).length;

  const today = now();
  const eventsToday = allActivity.filter((a) => isSameCalendarDay(a.occurredAt, today));
  const atRest = eventsToday.filter((a) => COMPLETION_ACTIVITY_TYPES.includes(a.eventType)).length;

  return {
    inMotion: activeSessions + openTickets + pendingMoves,
    atRest,
    activeSessions,
    eventsToday: eventsToday.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Schedule — equipment moving between rooms, equipment currently
// in use, and repairs in progress, split by internal engineer
// vs. external vendor. Powers the dedicated Schedule page.
// ─────────────────────────────────────────────────────────────

export interface InTransitMove {
  id: string;
  equipmentId: string;
  equipmentDisplayName: string;
  fromRoom: string;
  toRoom: string;
  initiatedByName: string;
  initiatedAt: string;
}

/** Moves that have left their origin room but haven't checked in anywhere yet. */
export function buildInTransitMoves(): InTransitMove[] {
  return movementRequests
    .filter((m) => !m.arrivedAt)
    .sort((a, b) => a.initiatedAt.localeCompare(b.initiatedAt))
    .map((m) => {
      const eq = getEquipmentById(m.equipmentId);
      return {
        id: m.id,
        equipmentId: m.equipmentId,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        fromRoom: getRoom(m.fromRoomId)?.name ?? '—',
        toRoom: getRoom(m.toRoomId)?.name ?? '—',
        initiatedByName: getUser(m.initiatedByUserId)?.name ?? 'Unknown',
        initiatedAt: m.initiatedAt,
      };
    });
}

export interface ActiveUsage {
  id: string;
  equipmentId: string;
  equipmentDisplayName: string;
  userName: string;
  startedAt: string;
}

/** Equipment that's switched "on" right now — a live, unended usage session. */
export function buildActiveUsage(): ActiveUsage[] {
  return usageSessions
    .filter((s) => !s.endedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s) => {
      const eq = getEquipmentById(s.equipmentId);
      return {
        id: s.id,
        equipmentId: s.equipmentId,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        userName: getUser(s.userId)?.name ?? 'Unknown user',
        startedAt: s.startedAt,
      };
    });
}

export interface ActiveRepair {
  id: string;
  equipmentId: string;
  equipmentDisplayName: string;
  workOrderNumber: string;
  type: string;
  performerName: string;
  startedAt: string;
  findings?: string;
}

function toActiveRepair(w: WorkOrder, performerName: string): ActiveRepair {
  const eq = getEquipmentById(w.equipmentId);
  return {
    id: w.id,
    equipmentId: w.equipmentId,
    equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
    workOrderNumber: w.workOrderNumber,
    type: w.type.charAt(0) + w.type.slice(1).toLowerCase(),
    performerName,
    startedAt: w.startedAt,
    findings: w.findings,
  };
}

/** Repairs in progress right now, split by who's doing the work. */
export function buildActiveRepairs(): { internal: ActiveRepair[]; external: ActiveRepair[] } {
  const active = workOrders.filter((w) => !w.completedAt);

  const internal = active
    .filter((w) => !w.vendorId)
    .map((w) => toActiveRepair(w, getUser(w.performedByUserId)?.name ?? 'Unassigned'))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const external = active
    .filter((w) => w.vendorId)
    .map((w) => toActiveRepair(w, getVendor(w.vendorId)?.name ?? 'Unknown vendor'))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  return { internal, external };
}

// ─────────────────────────────────────────────────────────────
// Settings — labels for the Notifications tab, and equipment-count
// guards so Floor setup can warn before removing something in use.
// ─────────────────────────────────────────────────────────────

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  BREAKDOWN_FLAGGED: 'Breakdown flagged',
  PM_DUE: 'PM due',
  WARRANTY_EXPIRING: 'Warranty expiring',
  APPROVAL_REQUESTS: 'Approval requests',
  UNAPPROVED_USE: 'Unapproved-use flags',
};

export const ALERT_TYPE_DESCRIPTION: Record<AlertType, string> = {
  BREAKDOWN_FLAGGED: 'A unit is flagged down mid-session.',
  PM_DUE: 'Preventive maintenance is due or overdue.',
  WARRANTY_EXPIRING: 'A warranty or AMC is about to lapse.',
  APPROVAL_REQUESTS: 'A movement or condemnation needs sign-off.',
  UNAPPROVED_USE: 'Equipment is scanned in use without approval.',
};

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  IN_APP: 'In-app',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

export function equipmentCountForDepartment(departmentId: string): number {
  return allEquipment.filter((e) => e.departmentId === departmentId).length;
}

/** Sums equipment across every department currently placed on this floor. */
export function equipmentCountForFloor(departmentsOnFloor: Department[], floorNumber: number): number {
  const deptIds = new Set(departmentsOnFloor.filter((d) => d.floor === floorNumber).map((d) => d.id));
  return allEquipment.filter((e) => deptIds.has(e.departmentId)).length;
}
