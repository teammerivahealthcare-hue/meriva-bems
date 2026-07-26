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
  UsageSession, DashboardStats, Ticket, DocumentType,
} from './types';
import {
  contractsFor, pmScheduleFor, calibrationsFor, authorisationFor,
  sessionsFor, ticketsFor, documentsFor, equipment as allEquipment, tickets as allTickets,
  workOrders, getCategory, getModel,
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
