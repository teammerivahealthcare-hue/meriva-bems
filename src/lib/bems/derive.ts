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
  UsageSession, DashboardStats, Ticket, TicketStatus, DocumentType, EquipmentDocument, ActivityEventType, ActivityEvent,
  WorkOrder, PmTriggerType, PmSchedule, PmVerdict, RepairOutcome, PmSource, CalibrationRecord, Department, AlertType, NotificationChannel, Criticality, ConsumableLogEntry, ConsumableCategory,
  ConsumableItem, MovementRequest, CondemnationRecord,
} from './types';
import type { ActivityFeedItem } from '@/components/recent-activity-feed';
import {
  contractsFor, pmScheduleFor, calibrationsFor, authorisationFor,
  sessionsFor, ticketsFor, documentsFor, equipment as allEquipment, tickets as allTickets,
  workOrders, departments, getCategory, getModel, getEquipmentById, getDepartment, getUser, equipmentName,
  movementRequests, activityEvents as allActivity, getRoom, getVendor,
  consumableLog as seedConsumableLog, condemnationRecords, consumableItems as seedConsumableItems,
  categoryFor, modelFor, pmTemplateFor, vendors,
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

/**
 * Live overrides for flags whose backing data can change mid-session (a
 * submitted PM report updates pmSchedules; a PM finding raises a ticket).
 * Defaults to the static seed lookups, matching every other call site that
 * doesn't pass one — same optional-override shape as docsCompletion.
 */
export interface FlagsContext {
  pmSchedules?: PmSchedule[];
  tickets?: Ticket[];
  calibrationRecords?: CalibrationRecord[];
}

export function computeFlags(eq: Equipment, ctx: FlagsContext = {}): EquipmentFlag[] {
  const flags: EquipmentFlag[] = [];

  // Preventive maintenance
  const pm = ctx.pmSchedules ? ctx.pmSchedules.find((p) => p.equipmentId === eq.id) : pmScheduleFor(eq.id);
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
  const cals = ctx.calibrationRecords ? ctx.calibrationRecords.filter((c) => c.equipmentId === eq.id) : calibrationsFor(eq.id);
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

  // Response time
  const eqTickets = ctx.tickets ? ctx.tickets.filter((t) => t.equipmentId === eq.id) : ticketsFor(eq.id);
  if (eqTickets.some((t) => isResponseOverdue(t))) flags.push('RESPONSE_OVERDUE');

  // A PM report that raised a follow-up ticket keeps the unit "Attention
  // required" until that ticket is resolved/closed.
  if (eqTickets.some((t) => t.source === 'PM_FINDING' && t.status !== 'RESOLVED' && t.status !== 'CLOSED')) {
    flags.push('PM_FOLLOWUP_OPEN');
  }

  // Procurement
  if (shelfAgeMonths(eq) > AGED_STOCK_THRESHOLD_MONTHS) flags.push('AGED_STOCK_AT_PURCHASE');

  return flags;
}

export function isResponseOverdue(t: Ticket): boolean {
  if (t.status === 'CLOSED' || t.status === 'RESOLVED') return t.responseOverdue;
  if (!t.responseDueAt) return false;
  return new Date(t.responseDueAt).getTime() < now().getTime();
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
  RESPONSE_OVERDUE: 'Response overdue',
  CONTINUED_USE_REVIEW_OVERDUE: 'Review overdue',
  AGED_STOCK_AT_PURCHASE: 'Aged stock',
  PM_FOLLOWUP_OPEN: 'PM follow-up open',
};

/** Which flags are serious enough to gate a scan. */
const AMBER_FLAGS: EquipmentFlag[] = [
  'PM_OVERDUE', 'CALIBRATION_EXPIRED', 'WARRANTY_EXPIRED',
  'CONTINUED_USE_REVIEW_OVERDUE', 'RESPONSE_OVERDUE', 'PM_FOLLOWUP_OPEN',
];

/**
 * Severity order for the Equipment profile's alert-chip row — expired/breached
 * first, then overdue, then still-upcoming "expiring soon", then the
 * low-urgency procurement note. Lower index = shown first.
 */
export const ALERT_FLAG_SEVERITY_ORDER: EquipmentFlag[] = [
  'RESPONSE_OVERDUE', 'CALIBRATION_EXPIRED', 'WARRANTY_EXPIRED',
  'CONTINUED_USE_REVIEW_OVERDUE',
  'PM_OVERDUE', 'PM_FOLLOWUP_OPEN',
  'PM_DUE', 'CALIBRATION_EXPIRING', 'WARRANTY_EXPIRING', 'AMC_EXPIRING',
  'AGED_STOCK_AT_PURCHASE',
];

/**
 * Tag color per flag, using the shared status tokens (design-tokens.css)
 * instead of one flat orange for everything. Grouped by severity: a missed
 * response deadline is the most serious (danger); overdue/expired items are next
 * (warning); still-upcoming "expiring soon" items are informational
 * (status-accent); aged stock is a low-urgency procurement note (neutral).
 */
export const FLAG_TAG_CLASS: Record<EquipmentFlag, string> = {
  PM_DUE: 'bg-status-accent/10 text-status-accent border-transparent',
  PM_OVERDUE: 'bg-warning/10 text-warning border-transparent',
  CALIBRATION_EXPIRING: 'bg-status-accent/10 text-status-accent border-transparent',
  CALIBRATION_EXPIRED: 'bg-warning/10 text-warning border-transparent',
  WARRANTY_EXPIRING: 'bg-status-accent/10 text-status-accent border-transparent',
  WARRANTY_EXPIRED: 'bg-warning/10 text-warning border-transparent',
  AMC_EXPIRING: 'bg-status-accent/10 text-status-accent border-transparent',
  RESPONSE_OVERDUE: 'bg-danger/10 text-danger border-transparent',
  CONTINUED_USE_REVIEW_OVERDUE: 'bg-warning/10 text-warning border-transparent',
  AGED_STOCK_AT_PURCHASE: 'bg-neutral/10 text-neutral border-transparent',
  PM_FOLLOWUP_OPEN: 'bg-warning/10 text-warning border-transparent',
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
  operational: 'bg-emerald-50 text-emerald-700 border-transparent',
  attention: 'bg-amber-50 text-amber-800 border-transparent',
  maintenance: 'bg-sky-50 text-sky-700 border-transparent',
  down: 'bg-red-50 text-red-700 border-transparent',
  condemned: 'bg-zinc-100 text-zinc-700 border-transparent',
};

/** Criticality label/badge — shared by the Equipment list and design system reference. */
export const CRITICALITY_LABEL: Record<Criticality, string> = {
  CRITICAL: 'Critical',
  SEMI_CRITICAL: 'Semi-critical',
  NON_CRITICAL: 'Non-critical',
};

export const CRITICALITY_BADGE_CLASS: Record<Criticality, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-transparent',
  SEMI_CRITICAL: 'bg-amber-50 text-amber-800 border-transparent',
  NON_CRITICAL: 'bg-sky-50 text-sky-700 border-transparent',
};

export function equipmentStatusKey(eq: Equipment, ctx: FlagsContext = {}): EquipmentStatusKey {
  if (eq.financialStatus === 'CONDEMNED') return 'condemned';
  if (eq.operationalStatus === 'DOWN') return 'down';
  if (eq.operationalStatus === 'UNDER_MAINTENANCE') return 'maintenance';
  if (computeFlags(eq, ctx).length > 0) return 'attention';
  return 'operational';
}

// ─────────────────────────────────────────────────────────────
// Documents — completeness against the baseline expected set,
// feeds the Equipment list's "Docs" column.
// ─────────────────────────────────────────────────────────────

export const BASELINE_DOC_TYPES: DocumentType[] = ['MANUAL', 'INVOICE', 'WARRANTY_CARD'];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  MANUAL: 'Manual',
  INVOICE: 'Invoice',
  WARRANTY_CARD: 'Warranty card',
  CALIBRATION_CERT: 'Calibration certificate',
  SERVICE_REPORT: 'Service report',
  CONDEMNATION_APPROVAL: 'Condemnation approval',
  AMC_CONTRACT: 'AMC contract',
  CERTIFICATION: 'Certification',
  INSURANCE: 'Insurance',
};

/**
 * `documents` is optional and, when passed, takes priority over the static
 * seed list — callers that can add documents at runtime (the equipment
 * profile's "Add document" flow) pass the live store slice so a just-added
 * document is reflected immediately; everyone else falls back to seed data.
 */
export function docsCompletion(eq: Equipment, documents?: EquipmentDocument[]): { present: number; expected: number } {
  const list = documents ? documents.filter((d) => d.equipmentId === eq.id) : documentsFor(eq.id);
  const owned = new Set(list.map((d) => d.type));
  const present = BASELINE_DOC_TYPES.filter((t) => owned.has(t)).length;
  return { present, expected: BASELINE_DOC_TYPES.length };
}

/** Every document on file for a unit, most recent upload first. Same live-vs-seed convention as docsCompletion. */
export function allDocumentsFor(equipmentId: string, documents?: EquipmentDocument[]): EquipmentDocument[] {
  const list = documents ? documents.filter((d) => d.equipmentId === equipmentId) : documentsFor(equipmentId);
  return list.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Documents that aren't a certification/insurance — feeds the Contracts tab's general "Documents" section (certifications get their own section below it). */
export function generalDocuments(equipmentId: string, documents?: EquipmentDocument[]): EquipmentDocument[] {
  return allDocumentsFor(equipmentId, documents).filter((d) => !CERTIFICATION_DOC_TYPES.includes(d.type));
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
export function certificationDocuments(
  equipmentId: string,
  documents?: EquipmentDocument[]
): (EquipmentDocument & { expiryDate: string })[] {
  const list = documents ? documents.filter((d) => d.equipmentId === equipmentId) : documentsFor(equipmentId);
  return list
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
  const repairCost = workOrders
    .filter((w) => w.equipmentId === eq.id)
    .reduce((sum, w) => sum + w.labourCost + w.partsCost, 0);
  return eq.purchaseCost + contractCost + repairCost;
}

export interface LastSpend {
  amount: number;
  date: string;
}

/** Most recent completed work order's cost — the "last spend" figure next to lifetime TCO. */
export function lastSpend(eq: Equipment): LastSpend | null {
  const completed = workOrders
    .filter((w): w is WorkOrder & { completedAt: string } => w.equipmentId === eq.id && !!w.completedAt)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const latest = completed[0];
  return latest ? { amount: latest.labourCost + latest.partsCost, date: latest.completedAt } : null;
}

// ─────────────────────────────────────────────────────────────
// Spend tracker — who costs what. Every figure here is built from the
// same fields the Equipment profile already shows (purchaseCost,
// contract annualCost, work-order labour/parts cost), just grouped by
// department instead of read one unit at a time. "What's regularly
// damaged" is answered with real, populated data — breakdown-sourced
// tickets — rather than the PartUsage/ComponentReplacement damage
// remark chips, which are modeled in types.ts but never populated by
// seed data or the store, so they carry no signal yet.
// ─────────────────────────────────────────────────────────────

const SPEND_WINDOW_MS = 365 * 24 * 3600_000;

export interface DepartmentSpend {
  departmentId: string;
  departmentName: string;
  equipmentCount: number;
  purchaseCost: number;          // lifetime, sum of Equipment.purchaseCost
  contractCost: number;          // lifetime, sum of every contract's annualCost
  repairCostLifetime: number;    // lifetime, sum of every work order's labourCost + partsCost
  totalSpend: number;            // purchaseCost + contractCost + repairCostLifetime — matches sum of totalCostOfOwnership()
  repairCost12m: number;         // work orders started in the last 365 days
  breakdownCount12m: number;     // SCAN_BREAKDOWN tickets opened in the last 365 days
}

/** Per-department cost rollup, built by grouping the same per-equipment figures shown on the Equipment profile. */
export function buildDepartmentSpend(
  equipmentList: Equipment[] = allEquipment,
  ticketsList: Ticket[] = allTickets,
  workOrdersList: WorkOrder[] = workOrders,
): DepartmentSpend[] {
  const windowStart = new Date(now().getTime() - SPEND_WINDOW_MS).toISOString();

  return departments
    .map((dept) => {
      const deptEquipment = equipmentList.filter((e) => e.departmentId === dept.id);
      const deptEquipmentIds = new Set(deptEquipment.map((e) => e.id));

      const purchaseCost = deptEquipment.reduce((sum, e) => sum + e.purchaseCost, 0);
      const contractCost = deptEquipment.reduce(
        (sum, e) => sum + contractsFor(e.id).reduce((s, c) => s + c.annualCost, 0),
        0,
      );
      const deptWorkOrders = workOrdersList.filter((w) => deptEquipmentIds.has(w.equipmentId));
      const repairCostLifetime = deptWorkOrders.reduce((sum, w) => sum + w.labourCost + w.partsCost, 0);
      const repairCost12m = deptWorkOrders
        .filter((w) => w.startedAt >= windowStart)
        .reduce((sum, w) => sum + w.labourCost + w.partsCost, 0);
      const breakdownCount12m = ticketsList.filter(
        (t) => deptEquipmentIds.has(t.equipmentId) && t.source === 'SCAN_BREAKDOWN' && t.openedAt >= windowStart,
      ).length;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        equipmentCount: deptEquipment.length,
        purchaseCost,
        contractCost,
        repairCostLifetime,
        totalSpend: purchaseCost + contractCost + repairCostLifetime,
        repairCost12m,
        breakdownCount12m,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);
}

export interface BreakdownLeaderboardRow {
  equipmentId: string;
  equipmentDisplayName: string;
  departmentName: string;
  responsibleName: string;
  breakdownCount12m: number;
  repairCost12m: number;
  lastBreakdownAt: string;
}

/** Equipment breaking down most often in the last 12 months — the real "what's regularly damaged" signal. */
export function buildBreakdownLeaderboard(
  equipmentList: Equipment[] = allEquipment,
  ticketsList: Ticket[] = allTickets,
  workOrdersList: WorkOrder[] = workOrders,
  limit = 10,
): BreakdownLeaderboardRow[] {
  const windowStart = new Date(now().getTime() - SPEND_WINDOW_MS).toISOString();

  return equipmentList
    .map((eq) => {
      const breakdowns = ticketsList
        .filter((t) => t.equipmentId === eq.id && t.source === 'SCAN_BREAKDOWN' && t.openedAt >= windowStart)
        .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
      if (breakdowns.length === 0) return null;

      const repairCost12m = workOrdersList
        .filter((w) => w.equipmentId === eq.id && w.startedAt >= windowStart)
        .reduce((sum, w) => sum + w.labourCost + w.partsCost, 0);

      return {
        equipmentId: eq.id,
        equipmentDisplayName: equipmentName(eq),
        departmentName: getDepartment(eq.departmentId)?.name ?? '—',
        responsibleName: getUser(eq.responsibleUserId)?.name ?? 'Unknown',
        breakdownCount12m: breakdowns.length,
        repairCost12m,
        lastBreakdownAt: breakdowns[0].openedAt,
      };
    })
    .filter((r): r is BreakdownLeaderboardRow => r !== null)
    .sort((a, b) => b.breakdownCount12m - a.breakdownCount12m || b.repairCost12m - a.repairCost12m)
    .slice(0, limit);
}

export interface TopSpendRow {
  equipmentId: string;
  equipmentDisplayName: string;
  departmentName: string;
  responsibleName: string;
  totalSpend: number;
}

/** Equipment with the highest lifetime cost of ownership, facility-wide. */
export function buildTopSpendEquipment(equipmentList: Equipment[] = allEquipment, limit = 10): TopSpendRow[] {
  return equipmentList
    .map((eq) => ({
      equipmentId: eq.id,
      equipmentDisplayName: equipmentName(eq),
      departmentName: getDepartment(eq.departmentId)?.name ?? '—',
      responsibleName: getUser(eq.responsibleUserId)?.name ?? 'Unknown',
      totalSpend: totalCostOfOwnership(eq),
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────
// Lifecycle progress — years-in-service vs. cumulative usage hours,
// whichever is further along toward the model's expected life. Powers
// the Equipment profile sidebar's lifecycle bar.
// ─────────────────────────────────────────────────────────────

export interface LifecycleProgress {
  pct: number;
  driver: 'years' | 'hours';
  driverLabel: string;
}

export function lifecycleProgress(eq: Equipment): LifecycleProgress | null {
  const model = getModel(eq.equipmentModelId);
  if (!model || model.expectedServiceLifeYears <= 0) return null;

  const yearsPct = Math.min(100, Math.round((ageYears(eq) / model.expectedServiceLifeYears) * 100));
  const hoursPct = model.expectedServiceLifeHours
    ? Math.min(100, Math.round((eq.cumulativeUsageHours / model.expectedServiceLifeHours) * 100))
    : null;

  if (hoursPct != null && hoursPct >= yearsPct) {
    return {
      pct: hoursPct,
      driver: 'hours',
      driverLabel: `${eq.cumulativeUsageHours.toLocaleString('en-IN')} / ${model.expectedServiceLifeHours!.toLocaleString('en-IN')} hrs`,
    };
  }
  return {
    pct: yearsPct,
    driver: 'years',
    driverLabel: `${ageYears(eq).toFixed(1)} / ${model.expectedServiceLifeYears} yrs`,
  };
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
// PM gate — same severity-tier pattern as evaluateGate (block / caution /
// clear), kept as a separate function rather than reused because it's
// judging a different thing: whether it's safe to START A PM, not whether
// a USAGE SESSION can start. Condemned is a hard block; an active usage
// session is deliberately NOT part of this — the PM flow surfaces that
// separately as an always-informational banner, never a block.
// ─────────────────────────────────────────────────────────────

export type PmGateState = 'BLOCKED' | 'CAUTION' | 'CLEAR';

export interface PmGateEvaluation {
  state: PmGateState;
  headline: string;
  detail?: string;
  canProceed: boolean;
  dismissible: boolean;
}

const PM_CAUTION_FLAGS: EquipmentFlag[] = [
  'PM_OVERDUE', 'CALIBRATION_EXPIRED', 'CALIBRATION_EXPIRING', 'WARRANTY_EXPIRED', 'WARRANTY_EXPIRING',
];

export function evaluatePmGate(eq: Equipment, ctx: FlagsContext = {}): PmGateEvaluation {
  if (eq.financialStatus === 'CONDEMNED') {
    return {
      state: 'BLOCKED',
      headline: 'This unit is condemned',
      detail: 'PM cannot be logged against a condemned asset.',
      canProceed: false,
      dismissible: false,
    };
  }

  const caution = computeFlags(eq, ctx).filter((f) => PM_CAUTION_FLAGS.includes(f));
  if (caution.length > 0) {
    return {
      state: 'CAUTION',
      headline: caution.map((f) => FLAG_LABEL[f]).join(' · '),
      canProceed: true,
      dismissible: true,
    };
  }

  return { state: 'CLEAR', headline: 'Ready for PM', canProceed: true, dismissible: false };
}

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
    responseOverdue: open.filter(isResponseOverdue).length,
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
// Inventory — consumable stock, derived from the restock/consumed log.
// Takes the log as a parameter (defaulting to seed data) so callers can
// pass the live store's log and stay reactive to newly logged movements.
// ─────────────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<ConsumableCategory, string> = {
  AIRWAY_RESPIRATORY: 'Airway & Respiratory',
  MONITORING_SENSORS: 'Monitoring & Sensors',
  EMERGENCY_RESUS: 'Emergency & Resuscitation',
  POWER_BATTERIES: 'Power & Batteries',
  STERILE_SUPPLY: 'Sterile Supply',
  GENERAL: 'General',
};

export function consumableStock(itemId: string, log: ConsumableLogEntry[] = seedConsumableLog): number {
  return log
    .filter((e) => e.itemId === itemId)
    .reduce((sum, e) => sum + (e.kind === 'RESTOCK' ? e.quantity : -e.quantity), 0);
}

export interface EquipmentPartUsage {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  loggedAt: string;
  performedByName: string;
  note?: string;
}

/** Parts an engineer logged as used on this specific machine — CONSUMED entries carrying that equipmentId, most recent first. */
export function consumableUsageForEquipment(
  equipmentId: string,
  log: ConsumableLogEntry[] = seedConsumableLog,
  items: ConsumableItem[] = seedConsumableItems,
): EquipmentPartUsage[] {
  return log
    .filter((e) => e.kind === 'CONSUMED' && e.equipmentId === equipmentId)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
    .map((e) => {
      const item = items.find((i) => i.id === e.itemId);
      return {
        id: e.id,
        itemName: item?.name ?? 'Unknown item',
        unit: item?.unit ?? '',
        quantity: e.quantity,
        loggedAt: e.loggedAt,
        performedByName: getUser(e.performedByUserId)?.name ?? 'Unknown',
        note: e.note,
      };
    });
}

// ─────────────────────────────────────────────────────────────
// Active tickets — internal repair tickets, joined to whichever
// engineer's work order is attached (if any). Shared by the
// Dashboard's Tickets tab and the dedicated Tickets page.
// ─────────────────────────────────────────────────────────────

export const TICKET_STATUS_LABEL: Partial<Record<TicketStatus, string>> = {
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
  CRITICAL: 'bg-red-50 text-red-700 border-transparent',
  HIGH: 'bg-amber-50 text-amber-800 border-transparent',
  NORMAL: 'bg-sky-50 text-sky-700 border-transparent',
};

export interface ActiveTicket {
  id: string;
  equipmentId: string;
  equipmentDisplayName: string;
  department: string;
  location: string;
  priority: string;
  status: TicketStatus;
  statusLabel: string;
  engineerId: string | null;
  engineerName: string | null;
  lastUpdated: string;
  responseOverdue: boolean;
  ticketNumber: string;
  issueType: string;
  description: string;
  source: string;
  raisedByName: string;
  raisedByDesignation: string;
  openedAt: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  responseDueAt?: string;
  downtimeHours?: number;
  runtimeHoursAtFailure?: number;
  timeToComplete?: string;
  /** When the engineer started on it — the ticket's work order startedAt. */
  workStartedAt?: string;
}

function toActiveTicket(t: Ticket, statusLabel: string, workOrdersList: WorkOrder[] = workOrders): ActiveTicket {
  const eq = getEquipmentById(t.equipmentId);
  const dept = eq ? getDepartment(eq.departmentId) : undefined;
  const room = eq ? getRoom(eq.roomId) : undefined;
  const wo = workOrdersList.find((w) => w.ticketId === t.id);
  const engineer = wo?.performedByUserId ? getUser(wo.performedByUserId) : undefined;
  const raisedBy = getUser(t.raisedByUserId);
  return {
    id: t.id,
    equipmentId: t.equipmentId,
    equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
    department: dept?.name ?? '—',
    location: room ? `Floor ${room.floor} · ${room.name}` : '—',
    priority: t.priority,
    status: t.status,
    statusLabel,
    engineerId: engineer?.id ?? null,
    engineerName: engineer?.name ?? null,
    lastUpdated: t.assignedAt ?? t.openedAt,
    responseOverdue: isResponseOverdue(t),
    ticketNumber: t.ticketNumber,
    issueType: t.issueType,
    description: t.description,
    source: TICKET_SOURCE_LABEL[t.source] ?? t.source,
    raisedByName: raisedBy?.name ?? 'Unknown',
    raisedByDesignation: raisedBy?.designation ?? '',
    openedAt: t.openedAt,
    assignedAt: t.assignedAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    responseDueAt: t.responseDueAt,
    downtimeHours: t.downtimeHours,
    runtimeHoursAtFailure: t.runtimeHoursAtFailure,
    workStartedAt: wo?.startedAt,
  };
}

export function buildActiveTickets(ticketsList: Ticket[] = allTickets, workOrdersList: WorkOrder[] = workOrders): ActiveTicket[] {
  return ticketsList
    .filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED')
    .map((t) => toActiveTicket(t, TICKET_STATUS_LABEL[t.status] ?? t.status.replace(/_/g, ' ').toLowerCase(), workOrdersList))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.lastUpdated.localeCompare(b.lastUpdated),
    );
}

/** Open tickets with a work order actively assigned to this engineer — the /engineer dashboard's "Your assigned repairs" list. */
export function buildEngineerOpenTickets(
  engineerUserId: string,
  ticketsList: Ticket[] = allTickets,
  workOrdersList: WorkOrder[] = workOrders,
): ActiveTicket[] {
  return buildActiveTickets(ticketsList, workOrdersList).filter((t) => {
    const wo = workOrdersList.find((w) => w.ticketId === t.id && !w.completedAt);
    return wo?.performedByUserId === engineerUserId;
  });
}

/** Resolved/closed tickets — the Tickets page's history section. */
export function buildClosedTickets(ticketsList: Ticket[] = allTickets, workOrdersList: WorkOrder[] = workOrders): ActiveTicket[] {
  return ticketsList
    .filter((t) => t.status === 'CLOSED' || t.status === 'RESOLVED')
    .map((t) => {
      const completedAt = t.closedAt ?? t.resolvedAt ?? t.openedAt;
      const completionSeconds = Math.round(
        (new Date(completedAt).getTime() - new Date(t.openedAt).getTime()) / 1000,
      );
      return {
        ...toActiveTicket(t, t.status === 'CLOSED' ? 'Closed' : 'Resolved', workOrdersList),
        lastUpdated: completedAt,
        responseOverdue: t.responseOverdue,
        timeToComplete: completionSeconds > 0 ? formatDuration(completionSeconds) : undefined,
      };
    })
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}

// ─────────────────────────────────────────────────────────────
// Tickets board — four columns over the ticket lifecycle. Waiting on
// parts/vendor stays in In progress (tagged on the card) since the
// engineer still owns it. A completed ticket lingers in Completed for
// TICKET_COMPLETED_VISIBLE_MS — long enough to notice it and undo a
// mis-drag — then drops to History.
// ─────────────────────────────────────────────────────────────

export type TicketBoardColumn = 'OPENED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export const TICKET_BOARD_COLUMNS: TicketBoardColumn[] = ['OPENED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

export const TICKET_COMPLETED_VISIBLE_MS = 60 * 60 * 1000;

export function ticketBoardColumn(status: TicketStatus): TicketBoardColumn {
  switch (status) {
    case 'OPEN': return 'OPENED';
    case 'ASSIGNED': return 'ASSIGNED';
    case 'RESOLVED':
    case 'CLOSED': return 'COMPLETED';
    default: return 'IN_PROGRESS';
  }
}

/** When a resolved/closed ticket finished — the clock the Completed → History hand-off runs on. */
export function ticketCompletedAt(t: Pick<ActiveTicket, 'resolvedAt' | 'closedAt'>): string | undefined {
  return t.resolvedAt ?? t.closedAt;
}

/** Still inside the Completed column's window, measured against the real clock (completions are stamped with it). */
export function isRecentlyCompleted(t: Pick<ActiveTicket, 'resolvedAt' | 'closedAt'>, nowMs: number): boolean {
  const at = ticketCompletedAt(t);
  return !!at && nowMs - new Date(at).getTime() < TICKET_COMPLETED_VISIBLE_MS;
}

/**
 * Board moves allowed by drag or the card's Move menu. Opened → Assigned
 * isn't a plain status flip — it needs an engineer, so the board opens the
 * assign dialog for it. A ticket can't skip ahead of having an engineer.
 */
export function canMoveTicket(from: TicketBoardColumn, to: TicketBoardColumn): boolean {
  if (from === to) return false;
  if (from === 'OPENED') return to === 'ASSIGNED';
  if (to === 'OPENED') return from === 'ASSIGNED';
  return true;
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

function toActivityFeedItem(a: ActivityEvent): ActivityFeedItem {
  const eq = getEquipmentById(a.equipmentId);
  return {
    id: a.id,
    equipmentId: a.equipmentId,
    equipmentName: eq ? equipmentName(eq) : 'Unknown equipment',
    href: `/equipment/${a.equipmentId}`,
    summary: a.summary,
    relativeTime: relativeTimeFromNow(a.occurredAt),
    fullDate: formatDate(a.occurredAt),
    dotClass: eventDotClass(a.eventType),
  };
}

export function buildRecentActivityItems(limit = 8, list: ActivityEvent[] = allActivity): ActivityFeedItem[] {
  return list
    .filter((a) => CURATED_ACTIVITY_TYPES.includes(a.eventType))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
    .map(toActivityFeedItem);
}

/** Same shape as buildRecentActivityItems, scoped to one unit -- the "recent activity" rail on its Maintenance/Breakdowns tabs. */
export function buildEquipmentActivityItems(equipmentId: string, types: ActivityEventType[], limit = 6): ActivityFeedItem[] {
  return allActivity
    .filter((a) => a.equipmentId === equipmentId && types.includes(a.eventType))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
    .map(toActivityFeedItem);
}

function isSameCalendarDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export interface DayActivity {
  iso: string;
  weekdayLabel: string;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  items: ActivityFeedItem[];
}

/**
 * Curated activity split into daily buckets for the dashboard's "Activity"
 * card: today plus the `days - 1` days before it, oldest first so today is
 * the last (default-selected) entry.
 */
export function buildActivityByDay(days = 4): DayActivity[] {
  const today = now();
  const result: DayActivity[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);

    const items = allActivity
      .filter((a) => CURATED_ACTIVITY_TYPES.includes(a.eventType) && isSameCalendarDay(a.occurredAt, day))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .map(toActivityFeedItem);

    result.push({
      iso: day.toISOString(),
      weekdayLabel: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayLabel: String(day.getDate()),
      dateLabel: formatDate(day.toISOString()),
      isToday: offset === 0,
      items,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// Approval movement & ticket assignments — dashboard summary rows.
// ─────────────────────────────────────────────────────────────

export interface TicketAssignmentRow {
  id: string;
  equipmentDisplayName: string;
  engineerName: string | null;
  scheduled: boolean;
}

export function buildTicketAssignmentRows(): TicketAssignmentRow[] {
  return workOrders
    .filter((w) => !w.completedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((w) => {
      const eq = getEquipmentById(w.equipmentId);
      const engineer = getUser(w.performedByUserId);
      return {
        id: w.id,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        engineerName: engineer?.name ?? null,
        scheduled: new Date(w.startedAt).getTime() > now().getTime(),
      };
    });
}

export interface MovementApprovalRow {
  id: string;
  equipmentDisplayName: string;
  fromRoomName: string;
  toRoomName: string;
  toDepartmentName: string;
  flaggedUnapproved: boolean;
}

export function buildMovementApprovalRows(list: MovementRequest[] = movementRequests): MovementApprovalRow[] {
  return list
    .filter((m) => m.approvalStatus === 'PENDING' || m.flaggedUnapproved)
    .map((m) => {
      const eq = getEquipmentById(m.equipmentId);
      const fromRoom = getRoom(m.fromRoomId);
      const toRoom = getRoom(m.toRoomId);
      const toDept = toRoom ? getDepartment(toRoom.departmentId) : undefined;
      return {
        id: m.id,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        fromRoomName: fromRoom?.name ?? '—',
        toRoomName: toRoom?.name ?? '—',
        toDepartmentName: toDept?.name ?? '—',
        flaggedUnapproved: m.flaggedUnapproved,
      };
    });
}

// ─────────────────────────────────────────────────────────────
// Equipment location status — in transit / temporary loan / settled.
// Shared by the equipment list and equipment detail pages so "where is
// this thing right now" reads the same everywhere. A PENDING move means
// the equipment record still shows its old room (rooms only update on
// approval — see approveMovement in store.ts), so that's the "in transit"
// signal; an approved TEMPORARY move with no returnedAt is an active loan.
// Anything else is just wherever the equipment record says it is — there's
// no way to tell "always been here" apart from "permanently moved here"
// once a PERMANENT move is approved, so that case gets no special label.
// ─────────────────────────────────────────────────────────────

export type EquipmentLocationStatus = 'IN_TRANSIT' | 'TEMPORARY' | 'PERMANENT';

export interface EquipmentLocationInfo {
  status: EquipmentLocationStatus;
  statusLabel: string;
  roomLabel: string;
  detail?: string;
  /** Only set when status is IN_TRANSIT — the department the pending move is headed to. */
  destinationDepartmentName?: string;
}

export function equipmentLocationInfo(
  eq: Equipment,
  movementRequestsList: MovementRequest[] = movementRequests,
): EquipmentLocationInfo {
  const room = getRoom(eq.roomId);
  const roomLabel = room ? `Floor ${room.floor} · ${room.name}` : '—';

  const pendingMove = movementRequestsList.find(
    (m) => m.equipmentId === eq.id && m.approvalStatus === 'PENDING',
  );
  if (pendingMove) {
    const toRoom = getRoom(pendingMove.toRoomId);
    const toDept = toRoom ? getDepartment(toRoom.departmentId) : undefined;
    return {
      status: 'IN_TRANSIT',
      statusLabel: 'In transit',
      roomLabel,
      detail: toRoom
        ? `Moving to ${toDept ? `${toDept.name} · ` : ''}${toRoom.name}`
        : undefined,
      destinationDepartmentName: toDept?.name,
    };
  }

  const activeLoan = movementRequestsList.find(
    (m) =>
      m.equipmentId === eq.id &&
      m.approvalStatus === 'APPROVED' &&
      m.movementKind === 'TEMPORARY' &&
      !m.returnedAt,
  );
  if (activeLoan) {
    return {
      status: 'TEMPORARY',
      statusLabel: 'Temporary',
      roomLabel,
      detail: activeLoan.expectedReturnAt
        ? `Expected back ${formatDate(activeLoan.expectedReturnAt)}`
        : undefined,
    };
  }

  return { status: 'PERMANENT', statusLabel: 'Permanent', roomLabel };
}

export interface InTransitDepartmentCount {
  departmentName: string;
  count: number;
}

export interface InTransitSummary {
  totalCount: number;
  byDepartment: InTransitDepartmentCount[];
}

/** How many equipment units are currently mid-move (PENDING, not yet approved), grouped by destination department. */
export function buildInTransitSummary(
  movementRequestsList: MovementRequest[] = movementRequests,
): InTransitSummary {
  const pending = movementRequestsList.filter((m) => m.approvalStatus === 'PENDING');
  const counts = new Map<string, number>();

  for (const m of pending) {
    const toRoom = getRoom(m.toRoomId);
    const toDept = toRoom ? getDepartment(toRoom.departmentId) : undefined;
    const name = toDept?.name ?? 'Unknown department';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return {
    totalCount: pending.length,
    byDepartment: Array.from(counts, ([departmentName, count]) => ({ departmentName, count })).sort(
      (a, b) => b.count - a.count,
    ),
  };
}

export interface CondemnationApprovalRow {
  id: string;
  equipmentDisplayName: string;
  justification: string;
  href: string;
}

export function buildCondemnationApprovalRows(list: CondemnationRecord[] = condemnationRecords): CondemnationApprovalRow[] {
  return list
    .filter((c) => !c.approvedAt)
    .map((c) => {
      const eq = getEquipmentById(c.equipmentId);
      return {
        id: c.id,
        equipmentDisplayName: eq ? equipmentName(eq) : 'Unknown equipment',
        justification: c.justification,
        href: eq ? `/equipment/${eq.id}` : '/equipment',
      };
    });
}

// ─────────────────────────────────────────────────────────────
// PM report — shared copy between the engineer flow, the printable
// report, and anywhere else a submitted report's verdict/source is shown.
// ─────────────────────────────────────────────────────────────

export const PM_VERDICT_LABEL: Record<PmVerdict, string> = {
  PASS: 'Pass',
  PASS_WITH_OBSERVATION: 'Pass with observation',
  NEEDS_FOLLOW_UP: 'Needs follow-up',
  RECOMMEND_CONDEMN: 'Recommend condemn',
};

export const REPAIR_OUTCOME_LABEL: Record<RepairOutcome, string> = {
  FIXED_PART_REPLACED: 'Fixed — part replaced',
  FIXED_CALIBRATED: 'Fixed — calibrated',
  FIXED_OTHER: 'Fixed',
  NEEDS_INTERNAL_ENGINEER: 'Needs another engineer',
  NEEDS_EXTERNAL_ENGINEER: 'Needs external engineer',
};

export const PM_SOURCE_LABEL: Record<PmSource, string> = {
  IN_HOUSE: 'In-house',
  OUTSOURCED: 'Outsourced',
};

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

// ─────────────────────────────────────────────────────────────
// Activity page — live operations, upcoming schedule, history
// categories. Everything takes the store's live lists so actions taken
// elsewhere in the session (approvals, repairs, sessions) show up here.
// ─────────────────────────────────────────────────────────────

export type OperationKind = 'IN_USE' | 'MOVING' | 'INTERNAL_REPAIR' | 'EXTERNAL_REPAIR' | 'PM' | 'CALIBRATION';

export const OPERATION_KIND_LABEL: Record<OperationKind, string> = {
  IN_USE: 'In use',
  MOVING: 'Movement',
  INTERNAL_REPAIR: 'Internal repair',
  EXTERNAL_REPAIR: 'External repair',
  PM: 'Preventive maintenance',
  CALIBRATION: 'Calibration',
};

export type OperationTone = 'progress' | 'attention' | 'danger' | 'done';

export interface LiveOperation {
  id: string;
  kind: OperationKind;
  equipmentId: string;
  assetId: string;
  title: string;
  subtitle: string;
  department: string;
  handledBy: string;
  startedAt: string;
  statusLabel: string;
  tone: OperationTone;
  /** Finished today — shown under the Completed filter, not the live counts. */
  completed: boolean;
}

export interface OperationsInput {
  equipment: Equipment[];
  sessions: UsageSession[];
  movementRequests: MovementRequest[];
  workOrders: WorkOrder[];
  tickets: Ticket[];
  pmSchedules: PmSchedule[];
  calibrationRecords: CalibrationRecord[];
  activity: ActivityEvent[];
}

/**
 * Store actions stamp the real clock while seed data sits around the fixed
 * demo date, so "today" means either: the same calendar day as now(), or
 * within the last 24 hours of the real clock.
 */
export function isRecentForActivity(iso: string): boolean {
  return isSameCalendarDay(iso, now()) || Date.now() - new Date(iso).getTime() < 864e5;
}

function operationBase(eq: Equipment | undefined, equipmentId: string) {
  const model = eq ? modelFor(eq) : undefined;
  return {
    equipmentId,
    assetId: eq?.assetId ?? '—',
    title: eq ? categoryFor(eq)?.name ?? equipmentName(eq) : 'Unknown equipment',
    subtitle: model?.modelName ?? (eq ? equipmentName(eq) : ''),
    department: eq ? getDepartment(eq.departmentId)?.name ?? '—' : '—',
  };
}

function latestCalibrations(records: CalibrationRecord[]): CalibrationRecord[] {
  const latest = new Map<string, CalibrationRecord>();
  for (const c of records) {
    const prev = latest.get(c.equipmentId);
    if (!prev || c.validUntil > prev.validUntil) latest.set(c.equipmentId, c);
  }
  return [...latest.values()];
}

/**
 * Which History filter an event belongs to. Events don't carry their work
 * order, so a repair counts as external when an external engineer acted or
 * the summary names a known vendor.
 */
export function historyCategory(a: ActivityEvent): OperationKind | null {
  const t = a.eventType;
  if (t.startsWith('MOVE_')) return 'MOVING';
  if (t === 'PM_PERFORMED') return 'PM';
  if (t === 'CALIBRATION_RECORDED') return 'CALIBRATION';
  if (t.startsWith('SESSION_') || t === 'GATE_ACKNOWLEDGED') return 'IN_USE';
  if (t.startsWith('TICKET_') || t.startsWith('WORK_ORDER_') || t === 'BREAKDOWN_FLAGGED' || t === 'PART_CONSUMED' || t === 'COMPONENT_REPLACED') {
    const external = !!a.actorEngineerId || vendors.some((v) => a.summary.includes(v.name));
    return external ? 'EXTERNAL_REPAIR' : 'INTERNAL_REPAIR';
  }
  return null;
}

/** Completion-type events — the History tab's "Settled today". */
export function isSettlingEvent(a: ActivityEvent): boolean {
  return COMPLETION_ACTIVITY_TYPES.includes(a.eventType);
}

/** Event types that close out an operation, mapped to the operation they close. */
function completedEventKind(a: ActivityEvent): OperationKind | null {
  switch (a.eventType) {
    case 'SESSION_ENDED':
    case 'SESSION_AUTO_CLOSED':
      return 'IN_USE';
    case 'MOVE_ARRIVED':
    case 'MOVE_RETURNED':
      return 'MOVING';
    case 'WORK_ORDER_COMPLETED':
    case 'TICKET_RESOLVED':
      return historyCategory(a) === 'EXTERNAL_REPAIR' ? 'EXTERNAL_REPAIR' : 'INTERNAL_REPAIR';
    case 'PM_PERFORMED':
      return 'PM';
    case 'CALIBRATION_RECORDED':
      return 'CALIBRATION';
    default:
      return null;
  }
}

/**
 * Everything happening right now — live sessions, moves in transit, open
 * repairs, PM/calibration due today or overdue — plus operations that
 * finished today, flagged `completed`.
 */
export function buildLiveOperations(input: OperationsInput): LiveOperation[] {
  const eqById = new Map(input.equipment.map((e) => [e.id, e]));
  const ops: LiveOperation[] = [];

  for (const s of input.sessions.filter((x) => !x.endedAt)) {
    ops.push({
      id: `use-${s.id}`, kind: 'IN_USE', ...operationBase(eqById.get(s.equipmentId), s.equipmentId),
      handledBy: getUser(s.userId)?.name ?? 'Unknown', startedAt: s.startedAt,
      statusLabel: 'In use', tone: 'progress', completed: false,
    });
  }

  for (const m of input.movementRequests.filter((x) => !x.arrivedAt)) {
    ops.push({
      id: `move-${m.id}`, kind: 'MOVING', ...operationBase(eqById.get(m.equipmentId), m.equipmentId),
      handledBy: getUser(m.initiatedByUserId)?.name ?? 'Unknown', startedAt: m.initiatedAt,
      statusLabel: `To ${getRoom(m.toRoomId)?.name ?? '—'}`, tone: 'attention', completed: false,
    });
  }

  // Open work orders that have started. PM/calibration work orders count as
  // those operations, not repairs; ones booked for later are Upcoming.
  const liveWorkOrderKinds = new Set<string>();
  for (const w of input.workOrders.filter((x) => !x.completedAt && !isScheduledWorkOrder(x))) {
    const ticket = w.ticketId ? input.tickets.find((t) => t.id === w.ticketId) : undefined;
    if (ticket && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')) continue;
    const external = !!w.vendorId;
    const blocked = ticket?.status === 'PENDING_PARTS' || ticket?.status === 'PENDING_VENDOR';
    const kind: OperationKind =
      w.type === 'PREVENTIVE' ? 'PM' : w.type === 'CALIBRATION' ? 'CALIBRATION' : external ? 'EXTERNAL_REPAIR' : 'INTERNAL_REPAIR';
    liveWorkOrderKinds.add(`${w.equipmentId}:${kind}`);
    ops.push({
      id: `wo-${w.id}`, kind,
      ...operationBase(eqById.get(w.equipmentId), w.equipmentId),
      handledBy: external ? getVendor(w.vendorId)?.name ?? 'Vendor' : getUser(w.performedByUserId)?.name ?? 'Unassigned',
      startedAt: w.startedAt,
      statusLabel: ticket ? TICKET_STATUS_LABEL[ticket.status] ?? 'In progress' : w.type === 'INSPECTION' ? 'Inspecting' : 'In progress',
      tone: blocked || ticket?.responseOverdue ? 'danger' : 'progress',
      completed: false,
    });
  }

  for (const pm of input.pmSchedules) {
    if (!pm.nextDueDate || liveWorkOrderKinds.has(`${pm.equipmentId}:PM`)) continue;
    const d = daysUntil(pm.nextDueDate);
    if (d > 0) continue;
    const eq = eqById.get(pm.equipmentId);
    ops.push({
      id: `pm-${pm.id}`, kind: 'PM', ...operationBase(eq, pm.equipmentId),
      handledBy: pm.pmSource === 'OUTSOURCED' ? 'Outsourced' : getUser(eq?.responsibleUserId)?.name ?? 'Unassigned',
      startedAt: pm.nextDueDate,
      statusLabel: d < 0 ? `Overdue ${-d}d` : 'Due today', tone: d < 0 ? 'danger' : 'attention', completed: false,
    });
  }

  for (const c of latestCalibrations(input.calibrationRecords)) {
    const d = daysUntil(c.validUntil);
    if (d > 0 || liveWorkOrderKinds.has(`${c.equipmentId}:CALIBRATION`)) continue;
    ops.push({
      id: `cal-${c.id}`, kind: 'CALIBRATION', ...operationBase(eqById.get(c.equipmentId), c.equipmentId),
      handledBy: (c.performedByVendorId ? getVendor(c.performedByVendorId)?.name : getUser(c.performedByUserId)?.name) ?? '—',
      startedAt: c.validUntil,
      statusLabel: d < 0 ? `Expired ${-d}d ago` : 'Expires today', tone: d < 0 ? 'danger' : 'attention', completed: false,
    });
  }

  for (const a of input.activity) {
    const kind = completedEventKind(a);
    if (!kind || !isRecentForActivity(a.occurredAt)) continue;
    ops.push({
      id: `done-${a.id}`, kind, ...operationBase(eqById.get(a.equipmentId), a.equipmentId),
      handledBy: a.actorSystem ? 'System' : getUser(a.actorUserId)?.name ?? (a.actorEngineerId ? 'External engineer' : '—'),
      startedAt: a.occurredAt,
      statusLabel: kind === 'MOVING' ? 'Reached' : 'Completed', tone: 'done', completed: true,
    });
  }

  return ops.sort((a, b) => Number(a.completed) - Number(b.completed) || b.startedAt.localeCompare(a.startedAt));
}

export type ScheduleKind = 'PM' | 'CALIBRATION' | 'INSPECTION';

export interface ScheduleItem {
  id: string;
  kind: ScheduleKind;
  equipmentId: string;
  title: string;
  assetId: string;
  location: string;
  /** YYYY-MM-DD. */
  dueDate: string;
  /** Full timestamp when a work order books a start time; schedule-derived items are due on a day, not at a time. */
  startsAt?: string;
  estimatedMinutes?: number;
  assignee: string;
  /** When this kind of work was last done on the unit — last PM run or calibration. */
  lastDoneAt?: string;
  /** PM plan's calendar interval. */
  intervalMonths?: number;
}

/**
 * Planned (non-corrective) work order booked for later. Session actions stamp
 * the real clock, which runs ahead of the fixed demo date — anything stamped
 * within the last day is treated as started, not scheduled.
 */
function isScheduledWorkOrder(w: WorkOrder): boolean {
  if (w.type === 'CORRECTIVE') return false;
  const t = new Date(w.startedAt).getTime();
  return t > now().getTime() && Math.abs(Date.now() - t) > 864e5;
}

const SCHEDULED_WORK_ORDER_KIND: Partial<Record<WorkOrder['type'], ScheduleKind>> = {
  PREVENTIVE: 'PM',
  CALIBRATION: 'CALIBRATION',
  INSPECTION: 'INSPECTION',
};

/**
 * Booked work orders plus future PM runs and calibration renewals, soonest
 * first. A PM/calibration that already has a booked work order shows once,
 * as the work order (it has a time and an engineer). Anything due today or
 * earlier is live, not upcoming.
 */
export function buildUpcomingSchedule(
  input: Pick<OperationsInput, 'equipment' | 'pmSchedules' | 'calibrationRecords' | 'workOrders'>,
): ScheduleItem[] {
  const eqById = new Map(input.equipment.map((e) => [e.id, e]));
  const items: ScheduleItem[] = [];
  const booked = new Set<string>();
  const pmByEquipment = new Map(input.pmSchedules.map((p) => [p.equipmentId, p]));
  const calibrations = latestCalibrations(input.calibrationRecords);
  const calibrationByEquipment = new Map(calibrations.map((c) => [c.equipmentId, c]));

  const base = (eq: Equipment | undefined, equipmentId: string) => ({
    equipmentId,
    title: eq ? categoryFor(eq)?.name ?? equipmentName(eq) : 'Unknown equipment',
    assetId: eq?.assetId ?? '—',
    location: (eq ? getRoom(eq.roomId)?.name : undefined) ?? '—',
  });

  for (const w of input.workOrders.filter((x) => !x.completedAt && isScheduledWorkOrder(x))) {
    const kind = SCHEDULED_WORK_ORDER_KIND[w.type];
    if (!kind) continue;
    booked.add(`${w.equipmentId}:${kind}`);
    const start = new Date(w.startedAt);
    const pm = kind === 'PM' ? pmByEquipment.get(w.equipmentId) : undefined;
    items.push({
      id: `wo-${w.id}`, kind, ...base(eqById.get(w.equipmentId), w.equipmentId),
      dueDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      startsAt: w.startedAt,
      estimatedMinutes: kind === 'PM' ? pmTemplateFor(w.equipmentId)?.estimatedMinutes : undefined,
      assignee: (w.vendorId ? getVendor(w.vendorId)?.name : getUser(w.performedByUserId)?.name) ?? 'Unassigned',
      lastDoneAt: kind === 'CALIBRATION' ? calibrationByEquipment.get(w.equipmentId)?.performedAt : pm?.lastPerformedAt,
      intervalMonths: pm?.intervalMonths,
    });
  }

  for (const pm of input.pmSchedules) {
    if (!pm.nextDueDate || daysUntil(pm.nextDueDate) <= 0 || booked.has(`${pm.equipmentId}:PM`)) continue;
    const eq = eqById.get(pm.equipmentId);
    items.push({
      id: `pm-${pm.id}`, kind: 'PM', ...base(eq, pm.equipmentId), dueDate: pm.nextDueDate.slice(0, 10),
      estimatedMinutes: pmTemplateFor(pm.equipmentId)?.estimatedMinutes,
      assignee: pm.pmSource === 'OUTSOURCED' ? 'Outsourced' : getUser(eq?.responsibleUserId)?.name ?? 'Unassigned',
      lastDoneAt: pm.lastPerformedAt,
      intervalMonths: pm.intervalMonths,
    });
  }

  for (const c of calibrations) {
    if (daysUntil(c.validUntil) <= 0 || booked.has(`${c.equipmentId}:CALIBRATION`)) continue;
    items.push({
      id: `cal-${c.id}`, kind: 'CALIBRATION', ...base(eqById.get(c.equipmentId), c.equipmentId), dueDate: c.validUntil.slice(0, 10),
      assignee: (c.performedByVendorId ? getVendor(c.performedByVendorId)?.name : getUser(c.performedByUserId)?.name) ?? 'Unassigned',
      lastDoneAt: c.performedAt,
    });
  }

  return items.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      (a.startsAt ?? '').localeCompare(b.startsAt ?? '') ||
      a.title.localeCompare(b.title),
  );
}
