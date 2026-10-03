/**
 * Meriva BEMS — MGPS (medical gas pipeline system)
 *
 * The pipeline as a whole: piped gases, supply sources, zones, readings,
 * alarms, the test plan, and individual gas cylinders with their movement
 * log. Supply sources are ordinary Equipment records (eq-mgps-*) and MGPS
 * incidents are ordinary tickets; everything else has no backend yet, so it
 * is typed mock data here, behind this one module, ready to be swapped for
 * API calls.
 *
 * Rules (what a cylinder may do next) and derived state (Normal / Low /
 * High, in service or not, overdue) are pure functions, so the dialogs and
 * the store enforce exactly the same thing. Nothing derived is stored.
 */

import type {
  CalibrationRecord, CylinderFill, CylinderGas, CylinderLocation, CylinderMovement,
  CylinderSize, CylinderStatus, CylinderVendorPurpose, Department, GasCylinder, MgpsReading, MgpsReadingAlarm,
  MgpsZone, PipedGas, PipedGasId, Ticket, TicketPriority,
} from './types';
import { getRoom, getUser, getVendor } from './seed';
import { DEMO_TODAY, now } from './derive';

// ─────────────────────────────────────────────────────────────
// Dates — the app's one clock (now(), fixed to DEMO_TODAY in the demo)
// ─────────────────────────────────────────────────────────────

/** YYYY-MM-DD in local time. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const mgpsToday = () => dayKey(now());

const LOADED_AT = Date.now();

/**
 * Timestamp for something done just now. With the demo clock fixed, it
 * starts at DEMO_TODAY and ticks forward in real time, so new entries sort
 * after the seed data and still read as "today" next to it.
 */
export function mgpsStamp(): string {
  return (DEMO_TODAY ? new Date(DEMO_TODAY.getTime() + (Date.now() - LOADED_AT)) : new Date()).toISOString();
}

/** Whole days from `a` to `b` (both YYYY-MM-DD or ISO). */
export function daysBetween(a: string, b: string): number {
  const at = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`).getTime();
  return Math.round((at(b) - at(a)) / 864e5);
}

/**
 * Sort comparator, newest first. Timestamps mix offsets (seed data is
 * +05:30, new entries are UTC "Z"), so compare instants, never strings.
 */
export function newestFirst(a: string, b: string): number {
  return Date.parse(b) - Date.parse(a);
}

function addMonthsKey(key: string, months: number): string {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return dayKey(new Date(y, m - 1 + months, d));
}

// ─────────────────────────────────────────────────────────────
// Piped gases and their readings
// ─────────────────────────────────────────────────────────────

export const PIPED_GASES: PipedGas[] = [
  { id: 'o2', name: 'Oxygen', short: 'O₂', unit: 'bar', range: [4.0, 4.5] },
  { id: 'air', name: 'Medical air', short: 'MA4', unit: 'bar', range: [4.0, 4.5] },
  { id: 'vac', name: 'Vacuum', short: 'VAC', unit: 'mmHg', range: [400, 600] },
  { id: 'n2o', name: 'Nitrous oxide', short: 'N₂O', unit: 'bar', range: [4.0, 4.5] },
];

export const pipedGas = (id: PipedGasId): PipedGas => PIPED_GASES.find((g) => g.id === id)!;

export type ReadingState = 'Normal' | 'Low' | 'High';

/** Always derived from the value — a reading's state is never stored. */
export function readingState(value: number, [low, high]: [number, number]): ReadingState {
  return value < low ? 'Low' : value > high ? 'High' : 'Normal';
}

/** "4.0 bar" / "520 mmHg" — bar readings always carry one decimal. */
export function formatReading(value: number, gas: PipedGas): string {
  return `${gas.unit === 'bar' ? value.toFixed(1) : Math.round(value)} ${gas.unit}`;
}

/** "4.0 to 4.5 bar" — the gas's normal band. */
export function formatRange(gas: PipedGas): string {
  const v = (n: number) => (gas.unit === 'bar' ? n.toFixed(1) : String(n));
  return `${v(gas.range[0])} to ${v(gas.range[1])} ${gas.unit}`;
}

/** Clean axis ticks around the normal band: every 0.2 bar or 50 mmHg. */
export function gaugeTicks(gas: PipedGas): { domain: [number, number]; ticks: number[] } {
  const [low, high] = gas.range;
  const step = gas.unit === 'bar' ? 0.2 : 50;
  const min = Math.floor((low - (high - low) * 0.6) / step) * step;
  const max = Math.ceil((high + (high - low) * 0.6) / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 10) / 10);
  return { domain: [min, max], ticks };
}

/**
 * Where a reading sits on a gauge that runs a little past the normal band
 * on both sides, as 0–100 — so "normal" fills the middle, not the end.
 */
export function gaugePct(value: number, [low, high]: [number, number]): number {
  const span = high - low;
  return Math.max(0, Math.min(100, ((value - (low - span * 0.6)) / (span * 2.2)) * 100));
}

// ─────────────────────────────────────────────────────────────
// Supply sources. Each is an Equipment record; the fields here are the
// plant-room telemetry and service facts the record itself doesn't carry.
// ─────────────────────────────────────────────────────────────

export interface MgpsSource {
  gasId: PipedGasId;
  equipmentId: string;
  type: string;
  /** Supply pressure (or plant vacuum) right now, and its change over 24 hours. */
  supplyValue: number;
  supplyChange24h: number;
  /** Plant duty unit; manifolds derive their banks from the cylinders on them instead. */
  dutyUnit?: string;
  dutyLevelPct: number;
  reserveLevelPct: number;
  changeover: 'Automatic' | 'Manual';
  lastServiceAt: string;
  serviceVendorId: string;
  /** Manifolds only: the cylinders that sit on the banks — in use on duty, full in reserve. */
  bank?: { gas: CylinderGas; size: CylinderSize; slotsPerBank: number };
}

export const MGPS_SOURCES: MgpsSource[] = [
  {
    gasId: 'o2', equipmentId: 'eq-mgps-001', type: 'Cylinder manifold, 2 × 10',
    supplyValue: 4.2, supplyChange24h: 0.1, dutyLevelPct: 96, reserveLevelPct: 100, changeover: 'Automatic',
    lastServiceAt: '2026-07-02', serviceVendorId: 'ven-amc-inox',
    bank: { gas: 'Oxygen', size: 'D type (46.7 L)', slotsPerBank: 10 },
  },
  {
    gasId: 'air', equipmentId: 'eq-mgps-air', type: 'Duplex compressor with dryer',
    supplyValue: 4.1, supplyChange24h: 0, dutyUnit: 'Compressor 1', dutyLevelPct: 100, reserveLevelPct: 100, changeover: 'Automatic',
    lastServiceAt: '2026-06-18', serviceVendorId: 'ven-amc-atlas',
  },
  {
    gasId: 'vac', equipmentId: 'eq-mgps-vac', type: 'Triplex vacuum pump',
    supplyValue: 520, supplyChange24h: 10, dutyUnit: 'Pump 2', dutyLevelPct: 100, reserveLevelPct: 100, changeover: 'Automatic',
    lastServiceAt: '2026-06-18', serviceVendorId: 'ven-amc-busch',
  },
  {
    gasId: 'n2o', equipmentId: 'eq-mgps-n2o', type: 'Cylinder manifold, 2 × 2',
    supplyValue: 4.1, supplyChange24h: -0.1, dutyLevelPct: 62, reserveLevelPct: 100, changeover: 'Automatic',
    lastServiceAt: '2026-07-02', serviceVendorId: 'ven-amc-inox',
    bank: { gas: 'Nitrous oxide', size: 'D type (46.7 L)', slotsPerBank: 2 },
  },
];

export const MGPS_EQUIPMENT_IDS = MGPS_SOURCES.map((s) => s.equipmentId);
export const sourceFor = (gasId: PipedGasId) => MGPS_SOURCES.find((s) => s.gasId === gasId)!;

/** Supply value every two hours over the last day, oldest first. Sensor feed stand-in. */
export const MGPS_SUPPLY_TREND: Record<PipedGasId, number[]> = {
  o2: [4.1, 4.1, 4.2, 4.2, 4.1, 4.0, 4.1, 4.2, 4.3, 4.2, 4.2, 4.2],
  air: [4.1, 4.1, 4.1, 4.2, 4.1, 4.1, 4.0, 4.1, 4.1, 4.2, 4.1, 4.1],
  vac: [505, 510, 512, 508, 500, 498, 505, 515, 520, 518, 522, 520],
  n2o: [4.2, 4.2, 4.2, 4.1, 4.1, 4.2, 4.1, 4.1, 4.0, 4.1, 4.1, 4.1],
};

/** Trend points labelled with the hour they were taken, ending at the current hour. */
export function supplyTrend(gasId: PipedGasId): { time: string; value: number }[] {
  const values = MGPS_SUPPLY_TREND[gasId];
  const end = now();
  return values.map((value, i) => {
    const t = new Date(end.getTime() - (values.length - 1 - i) * 2 * 3600e3);
    return { time: `${String(t.getHours()).padStart(2, '0')}:00`, value };
  });
}

/** Manifold banks drawn from the cylinders actually on them: in use = duty bank, full = reserve. */
export function manifoldBanks(source: MgpsSource, departmentId: string, cylinders: GasCylinder[]) {
  if (!source.bank) return null;
  const { gas, size } = source.bank;
  const onManifold = cylinders.filter(
    (c) => c.gas === gas && c.size === size && c.location.kind === 'DEPARTMENT' && c.location.departmentId === departmentId && c.status !== 'Damaged',
  );
  return {
    duty: onManifold.filter((c) => c.fill === 'In use'),
    reserve: onManifold.filter((c) => c.fill === 'Full'),
    empty: onManifold.filter((c) => c.fill === 'Empty'),
  };
}

// ─────────────────────────────────────────────────────────────
// Zones — area alarm panel + isolation valve, grouping gas-outlet rooms
// the way the pipeline's zone valve boxes do.
// ─────────────────────────────────────────────────────────────

export const MGPS_ZONES: MgpsZone[] = [
  { id: 'zone-icu', name: 'ICU', panel: 'Zone B alarm panel', valve: 'Open', departmentId: 'dept-icu', roomIds: ['room-icu1', 'room-icu2'], gases: ['o2', 'air', 'vac'] },
  { id: 'zone-ot', name: 'OT Complex', panel: 'Zone C alarm panel', valve: 'Open', departmentId: 'dept-ot', roomIds: ['room-ot1', 'room-ot2'], gases: ['o2', 'air', 'vac', 'n2o'] },
  { id: 'zone-nicu', name: 'NICU', panel: 'Zone A alarm panel', valve: 'Open', departmentId: 'dept-nicu', roomIds: ['room-nicu1'], gases: ['o2', 'air', 'vac'] },
  { id: 'zone-er', name: 'Emergency & Wards', panel: 'Zone D alarm panel', valve: 'Open', departmentId: 'dept-er', roomIds: ['room-er1', 'room-dial1'], gases: ['o2', 'air', 'vac'] },
];

const ROUND = (at: string, by: string, values: Record<string, Partial<Record<PipedGasId, number>>>): MgpsReading[] =>
  Object.entries(values).flatMap(([zoneId, perGas]) =>
    Object.entries(perGas).map(([gasId, value]) => ({
      id: `rd-${at.slice(0, 10)}-${zoneId}-${gasId}`, zoneId, gasId: gasId as PipedGasId, value: value!, loggedAt: at, loggedByUserId: by,
    })),
  );

/** Daily pressure rounds. A zone's current value is its latest reading per gas. */
export const SEED_MGPS_READINGS: MgpsReading[] = [
  ...ROUND('2026-07-24T08:00:00+05:30', 'usr-eng', {
    'zone-icu': { o2: 4.2, air: 4.1, vac: 510 },
    'zone-ot': { o2: 4.3, air: 4.2, vac: 530, n2o: 4.1 },
    'zone-nicu': { o2: 4.1, air: 4.0, vac: 500 },
    'zone-er': { o2: 4.2, air: 4.1, vac: 520 },
  }),
  ...ROUND('2026-07-23T08:00:00+05:30', 'usr-eng2', {
    'zone-icu': { o2: 4.2, air: 4.1, vac: 505 },
    'zone-ot': { o2: 4.2, air: 4.2, vac: 525, n2o: 4.1 },
    'zone-nicu': { o2: 4.1, air: 4.1, vac: 500 },
    'zone-er': { o2: 4.2, air: 4.1, vac: 515 },
  }),
];

/** Latest reading for each gas piped to the zone. */
export function latestReadings(zone: MgpsZone, readings: MgpsReading[]): Partial<Record<PipedGasId, MgpsReading>> {
  const out: Partial<Record<PipedGasId, MgpsReading>> = {};
  for (const r of readings) {
    if (r.zoneId !== zone.id || !zone.gases.includes(r.gasId)) continue;
    const prev = out[r.gasId];
    if (!prev || Date.parse(r.loggedAt) > Date.parse(prev.loggedAt)) out[r.gasId] = r;
  }
  return out;
}

export interface MgpsRoomFault {
  ticketId: string;
  ticketNumber: string;
  issueType: string;
  description: string;
  reportedByName: string;
  reportedAt: string;
  priority: TicketPriority;
  responseOverdue: boolean;
}

export interface MgpsRoomStatus {
  roomId: string;
  roomName: string;
  roomLabel: string;
  fault?: MgpsRoomFault;
}

const isOpenTicket = (t: Ticket) => t.status !== 'CLOSED' && t.status !== 'RESOLVED';
const mgpsTickets = (tickets: Ticket[]) => tickets.filter((t) => MGPS_EQUIPMENT_IDS.includes(t.equipmentId));

/** Each of the zone's rooms with its current open MGPS fault, if any. MGPS tickets carry Ticket.roomId for this. */
export function zoneRoomStatuses(zone: MgpsZone, tickets: Ticket[]): MgpsRoomStatus[] {
  const open = mgpsTickets(tickets).filter(isOpenTicket);
  return zone.roomIds.map((roomId) => {
    const room = getRoom(roomId);
    const t = open.filter((x) => x.roomId === roomId).sort((a, b) => newestFirst(a.openedAt, b.openedAt))[0];
    return {
      roomId,
      roomName: room?.name ?? roomId,
      roomLabel: room ? `Floor ${room.floor} · ${room.name}` : roomId,
      fault: t
        ? {
            ticketId: t.id, ticketNumber: t.ticketNumber, issueType: t.issueType, description: t.description,
            reportedByName: getUser(t.raisedByUserId)?.name ?? 'Unknown', reportedAt: t.openedAt,
            priority: t.priority, responseOverdue: t.responseOverdue,
          }
        : undefined,
    };
  });
}

export type ZoneStatus = 'Normal' | 'Fault reported' | 'Out of range';

export interface MgpsZoneView {
  zone: MgpsZone;
  readings: Partial<Record<PipedGasId, MgpsReading>>;
  rooms: MgpsRoomStatus[];
  /** An open fault outranks an out-of-band reading. */
  status: ZoneStatus;
}

export function zoneViews(readings: MgpsReading[], tickets: Ticket[]): MgpsZoneView[] {
  return MGPS_ZONES.map((zone) => {
    const latest = latestReadings(zone, readings);
    const rooms = zoneRoomStatuses(zone, tickets);
    const outOfRange = Object.values(latest).some((r) => r && readingState(r.value, pipedGas(r.gasId).range) !== 'Normal');
    return {
      zone,
      readings: latest,
      rooms,
      status: rooms.some((r) => r.fault) ? 'Fault reported' : outOfRange ? 'Out of range' : 'Normal',
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Alarms — open MGPS tickets plus out-of-range readings. Acknowledging
// silences one on this page; it doesn't close the ticket behind it.
// ─────────────────────────────────────────────────────────────

export interface MgpsAlarm {
  /** `tkt:<ticket id>` or `rd:<reading alarm id>` — the key acknowledgements are stored under. */
  id: string;
  title: string;
  detail: string;
  zoneName: string;
  raisedAt: string;
  reference: string;
  owner: string;
  statusLabel: string;
  acknowledged: boolean;
}

function sentenceCase(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function mgpsAlarms(args: { tickets: Ticket[]; readingAlarms: MgpsReadingAlarm[]; acknowledgedIds: string[] }): MgpsAlarm[] {
  const zoneOfRoom = (roomId?: string) => MGPS_ZONES.find((z) => roomId && z.roomIds.includes(roomId));
  const fromTickets: MgpsAlarm[] = mgpsTickets(args.tickets)
    .filter(isOpenTicket)
    .map((t) => ({
      id: `tkt:${t.id}`,
      title: t.issueType,
      detail: t.description,
      zoneName: zoneOfRoom(t.roomId)?.name ?? (t.roomId ? getRoom(t.roomId)?.name ?? '—' : 'Plant room'),
      raisedAt: t.openedAt,
      reference: t.ticketNumber,
      owner: getUser(t.raisedByUserId)?.name ?? 'Unknown',
      statusLabel: sentenceCase(t.status),
      acknowledged: false,
    }));
  const fromReadings: MgpsAlarm[] = args.readingAlarms.map((a) => {
    const gas = pipedGas(a.gasId);
    const zone = MGPS_ZONES.find((z) => z.id === a.zoneId);
    const state = readingState(a.value, gas.range);
    return {
      id: `rd:${a.id}`,
      title: `${gas.name} pressure ${state.toLowerCase()} in ${zone?.name ?? 'zone'}`,
      detail: `Reading of ${formatReading(a.value, gas)} is outside the normal range of ${formatRange(gas)}.`,
      zoneName: zone?.name ?? '—',
      raisedAt: a.raisedAt,
      reference: 'No ticket yet',
      owner: getUser(a.raisedByUserId)?.name ?? 'Unknown',
      statusLabel: 'Needs review',
      acknowledged: false,
    };
  });
  return [...fromReadings, ...fromTickets]
    .map((a) => ({ ...a, acknowledged: args.acknowledgedIds.includes(a.id) }))
    .sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged) || newestFirst(a.raisedAt, b.raisedAt));
}

// ─────────────────────────────────────────────────────────────
// Test plan — statutory MGPS checks. State is derived from the due date.
// Certificates for the source equipment stay CalibrationRecords.
// ─────────────────────────────────────────────────────────────

export interface MgpsTestResult {
  at: string;
  passed: boolean;
  result: string;
  byUserId: string;
}

export interface MgpsTest {
  id: string;
  name: string;
  scope: string;
  frequencyMonths: number;
  /** Newest first. */
  results: MgpsTestResult[];
}

export const SEED_MGPS_TESTS: MgpsTest[] = [
  { id: 'mt-purity', name: 'Oxygen purity test', scope: 'Oxygen manifold outlet', frequencyMonths: 3, results: [{ at: '2026-05-12T11:00:00+05:30', passed: true, result: '99.6% purity', byUserId: 'usr-eng' }] },
  { id: 'mt-alarm', name: 'Area alarm panel function test', scope: 'All 4 zones', frequencyMonths: 1, results: [{ at: '2026-06-20T10:00:00+05:30', passed: false, result: 'Zone C failed battery test', byUserId: 'usr-eng' }] },
  { id: 'mt-leak', name: 'Pipeline leak and pressure test', scope: 'Oxygen and medical air', frequencyMonths: 12, results: [{ at: '2026-01-04T09:00:00+05:30', passed: true, result: 'No drop in 24 hours', byUserId: 'usr-eng' }] },
  { id: 'mt-relief', name: 'Safety relief valve test', scope: 'Manifolds and plant', frequencyMonths: 12, results: [{ at: '2026-01-04T14:00:00+05:30', passed: true, result: 'Lifted at 5.3 bar', byUserId: 'usr-eng' }] },
  { id: 'mt-vacuum', name: 'Vacuum plant performance test', scope: 'Busch vacuum plant', frequencyMonths: 6, results: [{ at: '2026-03-18T10:00:00+05:30', passed: true, result: '560 mmHg at plant', byUserId: 'usr-eng2' }] },
];

export type TestState = 'Overdue' | 'Due soon' | 'Up to date';
export const TEST_DUE_SOON_DAYS = 30;

export function testDue(t: MgpsTest): string {
  const last = t.results[0];
  return addMonthsKey(last ? dayKey(new Date(last.at)) : mgpsToday(), t.frequencyMonths);
}

export function testState(t: MgpsTest, today = mgpsToday()): TestState {
  const due = testDue(t);
  if (due < today) return 'Overdue';
  return daysBetween(today, due) <= TEST_DUE_SOON_DAYS ? 'Due soon' : 'Up to date';
}

export function frequencyLabel(months: number): string {
  return ({ 1: 'Monthly', 3: 'Quarterly', 6: 'Half-yearly', 12: 'Yearly' } as Record<number, string>)[months] ?? `Every ${months} months`;
}

// ─────────────────────────────────────────────────────────────
// Gas cylinders — individual tracking, carried over from the Meriva BEMS
// gas cylinder module.
// ─────────────────────────────────────────────────────────────

export const CYLINDER_GASES: CylinderGas[] = ['Oxygen', 'Nitrous oxide', 'Medical air', 'Carbon dioxide'];
export const CYLINDER_SIZES: CylinderSize[] = ['D type (46.7 L)', 'B type (10 L)'];
export const CYLINDER_STATUSES: CylinderStatus[] = ['Available', 'Allocated', 'Empty', 'Refilling', 'Outside', 'Damaged'];
export const VENDOR_PURPOSES: CylinderVendorPurpose[] = ['Refilling', 'Hydro testing', 'Repair'];
/** Vendors who refill and hydro-test cylinders. */
export const CYLINDER_VENDOR_IDS = ['ven-amc-inox', 'ven-gas-linde', 'ven-gas-svg'];
/** Ready (full, in central stock) cylinders to keep on hand per gas. A settings screen should own this. */
export const MIN_READY_STOCK: Record<CylinderGas, number> = { Oxygen: 6, 'Nitrous oxide': 2, 'Medical air': 2, 'Carbon dioxide': 1 };
export const HYDRO_DUE_SOON_DAYS = 60;
/** Hydro tests are valid for five years. */
export const HYDRO_TEST_INTERVAL_MONTHS = 60;

export const STOCK: CylinderLocation = { kind: 'STOCK' };
export const STOCK_LABEL = 'Central stock';

const atDept = (departmentId: string): CylinderLocation => ({ kind: 'DEPARTMENT', departmentId });
const atVendor = (vendorId: string): CylinderLocation => ({ kind: 'VENDOR', vendorId });

function seedCylinders(): GasCylinder[] {
  const hydro = ['2027-03-12', '2026-09-05', '2028-01-20', '2026-06-30', '2027-11-02', '2026-08-28'];
  const out: GasCylinder[] = [];
  type Rest = Pick<GasCylinder, 'status' | 'fill' | 'location'> & Partial<GasCylinder>;
  const add = (prefix: string, n: number, gas: CylinderGas, size: CylinderSize, rest: Rest) =>
    out.push({
      id: `${prefix}-${String(n).padStart(3, '0')}`, gas, size,
      serialNumber: `${prefix}${7400 + out.length * 13}`, hydroTestDue: hydro[out.length % hydro.length], ...rest,
    });
  const dept = (departmentId: string, fill: CylinderFill = 'In use'): Rest => ({ status: fill === 'Empty' ? 'Empty' : 'Allocated', fill, location: atDept(departmentId) });
  const stock = (fill: CylinderFill = 'Full'): Rest => ({ status: fill === 'Empty' ? 'Empty' : 'Available', fill, location: STOCK });
  const away = (vendorId: string, purpose: CylinderVendorPurpose, sentOn: string, expectedReturn: string): Rest => ({
    status: purpose === 'Refilling' ? 'Refilling' : 'Outside', fill: 'Empty', location: atVendor(vendorId), away: { purpose, sentOn, expectedReturn },
  });

  // Oxygen D type: 10 on the duty bank, 10 in reserve, the rest in stock or out for refilling.
  for (let i = 1; i <= 28; i++) {
    add('OXD', i, 'Oxygen', 'D type (46.7 L)',
      i <= 10 ? dept('dept-plant') : i <= 20 ? dept('dept-plant', 'Full') : i <= 24 ? stock() : i <= 26 ? stock('Empty')
        : i === 27 ? away('ven-amc-inox', 'Refilling', '2026-07-14', '2026-07-20') : away('ven-amc-inox', 'Refilling', '2026-07-21', '2026-07-27'));
  }
  // Oxygen B type: bedside and transport cylinders. [department, cylinders, of which empty, of which full]
  const wards: [string, number, number, number][] = [['dept-icu', 5, 1, 1], ['dept-nicu', 2, 0, 0], ['dept-er', 3, 1, 0], ['dept-cardio', 4, 1, 0], ['dept-dial', 2, 0, 0], ['dept-ot', 2, 0, 0]];
  let n = 0;
  for (const [d, count, empty, full] of wards) {
    for (let k = 0; k < count; k++) add('OXB', ++n, 'Oxygen', 'B type (10 L)', dept(d, k < empty ? 'Empty' : k < empty + full ? 'Full' : 'In use'));
  }
  for (let k = 0; k < 3; k++) add('OXB', ++n, 'Oxygen', 'B type (10 L)', stock());
  add('OXB', ++n, 'Oxygen', 'B type (10 L)', { status: 'Damaged', fill: 'Empty', location: STOCK, damageNote: 'Valve spindle bent, leaking at neck' });
  for (let i = 1; i <= 6; i++) {
    add('N2O', i, 'Nitrous oxide', 'D type (46.7 L)',
      i <= 2 ? dept('dept-plant', 'Full') : i <= 4 ? dept('dept-plant') : i === 5 ? stock() : away('ven-gas-linde', 'Hydro testing', '2026-07-10', '2026-08-02'));
  }
  for (let i = 1; i <= 3; i++) add('AIR', i, 'Medical air', 'D type (46.7 L)', stock());
  for (let i = 1; i <= 3; i++) add('CO2', i, 'Carbon dioxide', 'B type (10 L)', i <= 2 ? dept('dept-ot') : stock());
  return out;
}

export const SEED_CYLINDERS: GasCylinder[] = seedCylinders();

export const SEED_CYLINDER_MOVEMENTS: CylinderMovement[] = [
  { id: 'mv-005', cylinderId: 'OXD-028', kind: 'Refilling', from: STOCK, to: atVendor('ven-amc-inox'), at: '2026-07-21T16:00:00+05:30', byUserId: 'usr-eng2', note: 'Expected back 27 Jul 2026' },
  { id: 'mv-004', cylinderId: 'OXD-021', kind: 'Receiving', from: atVendor('ven-amc-inox'), to: STOCK, at: '2026-07-21T11:00:00+05:30', byUserId: 'usr-eng2', note: 'Challan 88213, filled and seal intact' },
  { id: 'mv-003', cylinderId: 'OXB-007', kind: 'Transfer', from: STOCK, to: atDept('dept-er'), at: '2026-07-19T09:30:00+05:30', byUserId: 'usr-eng', note: 'Received by Sr. Kavita' },
  { id: 'mv-002', cylinderId: 'OXD-027', kind: 'Refilling', from: STOCK, to: atVendor('ven-amc-inox'), at: '2026-07-14T16:00:00+05:30', byUserId: 'usr-eng2', note: 'Expected back 20 Jul 2026' },
  { id: 'mv-001', cylinderId: 'N2O-006', kind: 'Hydro testing', from: STOCK, to: atVendor('ven-gas-linde'), at: '2026-07-10T15:00:00+05:30', byUserId: 'usr-eng', note: 'Expected back 2 Aug 2026' },
];

// Where a cylinder is ───────────────────────────────────────────

export const isAway = (c: GasCylinder) => c.location.kind === 'VENDOR';
export const inDepartment = (c: GasCylinder, departmentId?: string) =>
  c.location.kind === 'DEPARTMENT' && (!departmentId || c.location.departmentId === departmentId);
export const inStock = (c: GasCylinder) => c.location.kind === 'STOCK';
export const isReady = (c: GasCylinder) => c.fill === 'Full' && !isAway(c) && c.status !== 'Damaged';
export const isReturnOverdue = (c: GasCylinder, today = mgpsToday()) => !!c.away && c.away.expectedReturn < today;
export const isHydroOverdue = (c: GasCylinder, today = mgpsToday()) => c.hydroTestDue < today;

export function sameLocation(a: CylinderLocation | null, b: CylinderLocation | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'DEPARTMENT' && b.kind === 'DEPARTMENT') return a.departmentId === b.departmentId;
  if (a.kind === 'VENDOR' && b.kind === 'VENDOR') return a.vendorId === b.vendorId;
  return true;
}

export function locationLabel(loc: CylinderLocation | null, departments: Department[]): string {
  if (!loc) return 'New';
  if (loc.kind === 'STOCK') return STOCK_LABEL;
  if (loc.kind === 'VENDOR') return getVendor(loc.vendorId)?.name ?? 'Vendor';
  return departments.find((d) => d.id === loc.departmentId)?.name ?? 'Unknown department';
}

// In service / not in service ─────────────────────────────────
// Every cylinder falls in exactly one group, derived, never stored.

/** Physically in a department doing its job, and not damaged. */
export const inService = (c: GasCylinder) => inDepartment(c) && c.status !== 'Damaged';

export const SERVICE_REASONS = ['In use', 'Full, standing by', 'Empty, awaiting pickup'] as const;
export const IDLE_REASONS = ['Ready in stock', 'Empty in stock', 'Damaged', 'At vendor for refilling', 'At vendor for testing or repair'] as const;
export type CylinderGroup = 'In service' | 'Not in service';
export type CylinderReason = (typeof SERVICE_REASONS)[number] | (typeof IDLE_REASONS)[number];

export function reasonOf(c: GasCylinder): CylinderReason {
  if (isAway(c)) return c.away?.purpose === 'Refilling' ? 'At vendor for refilling' : 'At vendor for testing or repair';
  if (c.status === 'Damaged') return 'Damaged';
  if (inStock(c)) return c.fill === 'Empty' ? 'Empty in stock' : 'Ready in stock';
  return c.fill === 'Empty' ? 'Empty, awaiting pickup' : c.fill === 'Full' ? 'Full, standing by' : 'In use';
}

export function placement(cylinders: GasCylinder[]) {
  const count = (r: CylinderReason) => cylinders.filter((c) => reasonOf(c) === r).length;
  const service = SERVICE_REASONS.map((r) => [r, count(r)] as const);
  const idle = IDLE_REASONS.map((r) => [r, count(r)] as const);
  return {
    service,
    idle,
    serviceTotal: service.reduce((s, [, n]) => s + n, 0),
    idleTotal: idle.reduce((s, [, n]) => s + n, 0),
    overdue: cylinders.filter((c) => isReturnOverdue(c)).length,
  };
}

// Register filters ─────────────────────────────────────────────

export const AT_VENDOR = 'VENDOR';

export interface CylinderFilter {
  q: string;
  gas: CylinderGas | '';
  group: CylinderGroup | '';
  reason: CylinderReason | '';
  /** '' anywhere, 'STOCK', 'VENDOR', or a department id. */
  location: string;
  status: CylinderStatus | '';
}

export const NO_CYLINDER_FILTER: CylinderFilter = { q: '', gas: '', group: '', reason: '', location: '', status: '' };

export function matchesCylinder(c: GasCylinder, f: CylinderFilter, departments: Department[]): boolean {
  if (f.group && (f.group === 'In service') !== inService(c)) return false;
  if (f.reason && reasonOf(c) !== f.reason) return false;
  if (f.gas && c.gas !== f.gas) return false;
  if (f.status && c.status !== f.status) return false;
  if (f.location) {
    if (f.location === 'STOCK' && !inStock(c)) return false;
    if (f.location === AT_VENDOR && !isAway(c)) return false;
    if (f.location !== 'STOCK' && f.location !== AT_VENDOR && !inDepartment(c, f.location)) return false;
  }
  if (!f.q.trim()) return true;
  return `${c.id} ${c.serialNumber} ${locationLabel(c.location, departments)}`.toLowerCase().includes(f.q.trim().toLowerCase());
}

export const isFiltered = (f: CylinderFilter) => Object.values(f).some((v) => v !== '');

// Rules ────────────────────────────────────────────────────────
// Each returns a plain-language reason the action can't happen, or null.

export function transferProblem(c: GasCylinder, to: CylinderLocation | null): string | null {
  if (isAway(c)) return 'This cylinder is at a vendor. Receive it into stock before moving it.';
  if (!to) return 'Choose where it is going.';
  if (to.kind === 'VENDOR') return 'Use Send to vendor to dispatch a cylinder.';
  if (sameLocation(c.location, to)) return 'The cylinder is already there.';
  if (to.kind === 'DEPARTMENT') {
    if (c.status === 'Damaged') return 'This cylinder is damaged and cannot be issued to a department.';
    if (c.fill === 'Empty') return 'This cylinder is empty. Only full cylinders can go to a department.';
  }
  return null;
}

export function dispatchProblem(c: GasCylinder, purpose: CylinderVendorPurpose, today = mgpsToday()): string | null {
  if (isAway(c)) return 'This cylinder is already at a vendor. It can only be received.';
  if (purpose === 'Refilling' && isHydroOverdue(c, today)) return 'Hydro test is overdue. Send it for hydro testing instead of refilling.';
  return null;
}

export function receiveProblem(c: GasCylinder): string | null {
  return isAway(c) ? null : 'This cylinder is not at a vendor.';
}

export function registerProblem(id: string, cylinders: GasCylinder[]): string | null {
  const clean = id.trim();
  if (!clean) return 'Enter the cylinder number.';
  if (cylinders.some((c) => c.id.toLowerCase() === clean.toLowerCase())) return `${clean.toUpperCase()} is already registered.`;
  return null;
}

/** Status a cylinder takes after a move, from where it lands and how full it is. */
export function statusAt(location: CylinderLocation, fill: CylinderFill, damaged: boolean): CylinderStatus {
  if (damaged) return 'Damaged';
  if (fill === 'Empty') return 'Empty';
  return location.kind === 'STOCK' ? 'Available' : 'Allocated';
}

export function nextHydroDue(from = mgpsToday()): string {
  return addMonthsKey(from, HYDRO_TEST_INTERVAL_MONTHS);
}

// Alerts ───────────────────────────────────────────────────────

export type AlertLevel = 'Overdue' | 'Due soon';

export interface MgpsAlert {
  key: string;
  level: AlertLevel;
  title: string;
  detail: string;
  /** Register view that shows the cylinders behind this alert. */
  filter?: Partial<CylinderFilter>;
}

export function readyInStock(cylinders: GasCylinder[], gas: CylinderGas): number {
  return cylinders.filter((c) => c.gas === gas && inStock(c) && isReady(c)).length;
}

/** Stock below minimum, overdue returns, hydro tests overdue or due within 60 days, damaged cylinders. */
export function cylinderAlerts(cylinders: GasCylinder[], today = mgpsToday()): MgpsAlert[] {
  const out: MgpsAlert[] = [];
  for (const gas of CYLINDER_GASES) {
    const ready = readyInStock(cylinders, gas);
    if (ready < MIN_READY_STOCK[gas]) {
      out.push({ key: `min-${gas}`, level: 'Overdue', title: `${gas} stock below minimum`, detail: `${ready} ready in central stock, minimum is ${MIN_READY_STOCK[gas]}`, filter: { gas, location: 'STOCK' } });
    }
  }
  for (const c of cylinders.filter((x) => isReturnOverdue(x, today))) {
    out.push({ key: `late-${c.id}`, level: 'Overdue', title: `${c.id} return overdue`, detail: `${daysBetween(c.away!.expectedReturn, today)} days late from ${locationLabel(c.location, [])}`, filter: { q: c.id } });
  }
  const hydroLate = cylinders.filter((c) => isHydroOverdue(c, today)).length;
  const hydroSoon = cylinders.filter((c) => !isHydroOverdue(c, today) && daysBetween(today, c.hydroTestDue) <= HYDRO_DUE_SOON_DAYS).length;
  if (hydroLate) out.push({ key: 'hydro-late', level: 'Overdue', title: `${hydroLate} cylinder${hydroLate === 1 ? '' : 's'} past hydro test date`, detail: 'Do not refill until tested' });
  if (hydroSoon) out.push({ key: 'hydro-soon', level: 'Due soon', title: `${hydroSoon} cylinder${hydroSoon === 1 ? '' : 's'} due for hydro test in ${HYDRO_DUE_SOON_DAYS} days`, detail: 'Plan the dispatch with the vendor' });
  const damaged = cylinders.filter((c) => c.status === 'Damaged').length;
  if (damaged) out.push({ key: 'damaged', level: 'Due soon', title: `${damaged} damaged cylinder${damaged === 1 ? '' : 's'} awaiting repair`, detail: 'Send for repair or retire', filter: { status: 'Damaged' } });
  return out;
}

/** Header status: alarms, overdue tests and overdue cylinder returns need someone now. */
export function overallStatus(args: { activeAlarms: number; overdueTests: number; overdueReturns: number }) {
  const reasons = [
    args.activeAlarms && `${args.activeAlarms} active alarm${args.activeAlarms === 1 ? '' : 's'}`,
    args.overdueTests && `${args.overdueTests} overdue test${args.overdueTests === 1 ? '' : 's'}`,
    args.overdueReturns && `${args.overdueReturns} overdue return${args.overdueReturns === 1 ? '' : 's'}`,
  ].filter(Boolean) as string[];
  return { attention: reasons.length > 0, reasons };
}

// ─────────────────────────────────────────────────────────────
// History — everything that happened to the pipeline, newest first.
// ─────────────────────────────────────────────────────────────

/** Plant-room events with no record type of their own yet (changeovers, plant services). */
export const MGPS_PLANT_EVENTS: { id: string; kind: 'Changeover' | 'Service'; title: string; detail: string; at: string }[] = [
  { id: 'pe-002', kind: 'Changeover', title: 'Oxygen manifold changed over to the reserve bank', detail: 'Automatic · empty bank sent for refilling', at: '2026-07-22T02:15:00+05:30' },
  { id: 'pe-001', kind: 'Service', title: 'Medical air compressor plant: quarterly service', detail: 'Atlas Copco India · dryer cartridges replaced', at: '2026-06-18T10:00:00+05:30' },
];

export type MgpsHistoryKind = 'Incident' | 'Test' | 'Reading' | 'Alarm' | 'Cylinder' | 'Changeover' | 'Service';

export interface MgpsHistoryItem {
  id: string;
  kind: MgpsHistoryKind;
  title: string;
  detail: string;
  at: string;
}

export function buildMgpsHistory(args: {
  tickets: Ticket[];
  calibrationRecords: CalibrationRecord[];
  tests: MgpsTest[];
  readings: MgpsReading[];
  readingAlarms: MgpsReadingAlarm[];
  movements: CylinderMovement[];
  departments: Department[];
}): MgpsHistoryItem[] {
  const userName = (id: string) => getUser(id)?.name ?? 'Unknown';
  const items: MgpsHistoryItem[] = [];

  for (const t of mgpsTickets(args.tickets)) {
    items.push({ id: `h-${t.id}`, kind: 'Incident', title: t.issueType, detail: `${t.ticketNumber} · ${userName(t.raisedByUserId)} · ${sentenceCase(t.status)}`, at: t.openedAt });
  }
  for (const c of args.calibrationRecords.filter((r) => MGPS_EQUIPMENT_IDS.includes(r.equipmentId))) {
    items.push({ id: `h-${c.id}`, kind: 'Test', title: `Compliance certificate ${c.certificateNumber}: ${c.passed ? 'passed' : 'failed'}`, detail: c.accuracyNotes, at: c.performedAt });
  }
  for (const t of args.tests) {
    t.results.forEach((r, i) =>
      items.push({ id: `h-${t.id}-${i}`, kind: 'Test', title: `${t.name}: ${r.passed ? 'passed' : 'failed'}`, detail: `${r.result} · ${userName(r.byUserId)}`, at: r.at }),
    );
  }
  // A pressure round is every reading logged at the same moment by the same person.
  const rounds = new Map<string, MgpsReading[]>();
  for (const r of args.readings) {
    const key = `${r.loggedAt}|${r.loggedByUserId}`;
    rounds.set(key, [...(rounds.get(key) ?? []), r]);
  }
  for (const [key, list] of rounds) {
    const bad = list.filter((r) => readingState(r.value, pipedGas(r.gasId).range) !== 'Normal');
    if (list.length === 1) {
      const r = list[0];
      const gas = pipedGas(r.gasId);
      const zone = MGPS_ZONES.find((z) => z.id === r.zoneId);
      items.push({ id: `h-${r.id}`, kind: 'Reading', title: `${zone?.name ?? 'Zone'}: ${gas.name.toLowerCase()} ${formatReading(r.value, gas)} (${readingState(r.value, gas.range)})`, detail: userName(r.loggedByUserId), at: r.loggedAt });
    } else {
      items.push({ id: `h-round-${key}`, kind: 'Reading', title: bad.length ? `Pressure round: ${bad.length} of ${list.length} readings out of range` : 'Pressure round completed, all zones normal', detail: `${list.length} readings · ${userName(list[0].loggedByUserId)}`, at: list[0].loggedAt });
    }
  }
  for (const a of args.readingAlarms) {
    const gas = pipedGas(a.gasId);
    const zone = MGPS_ZONES.find((z) => z.id === a.zoneId);
    items.push({ id: `h-${a.id}`, kind: 'Alarm', title: `${gas.name} pressure ${readingState(a.value, gas.range).toLowerCase()} in ${zone?.name ?? 'zone'}`, detail: `Alarm raised at ${formatReading(a.value, gas)} · ${userName(a.raisedByUserId)}`, at: a.raisedAt });
  }
  for (const m of args.movements) {
    items.push({
      id: `h-${m.id}`, kind: 'Cylinder',
      title: `${m.cylinderId}: ${m.kind.toLowerCase()}, ${locationLabel(m.from, args.departments)} → ${locationLabel(m.to, args.departments)}`,
      detail: [userName(m.byUserId), m.note].filter(Boolean).join(' · '), at: m.at,
    });
  }
  for (const e of MGPS_PLANT_EVENTS) items.push({ id: `h-${e.id}`, kind: e.kind, title: e.title, detail: e.detail, at: e.at });

  return items.sort((a, b) => newestFirst(a.at, b.at));
}

