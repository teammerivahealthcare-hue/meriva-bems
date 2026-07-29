/**
 * Meriva BEMS — Type Contract
 *
 * Derived from docs/phase1-foundation.md. This is the shared contract:
 * both founders build screens against these shapes, and in August these
 * same types become the API contract for the backend.
 *
 * RULE: after 25 Jul, don't edit this file without telling the other person.
 */

// ─────────────────────────────────────────────────────────────
// Tenancy
// ─────────────────────────────────────────────────────────────

/** Hidden in MVP UI — every account has exactly one. Present so chains work later. */
export interface Organization {
  id: string;
  name: string;
}

export interface Facility {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  logoUrl?: string;
  bedCount: number;
  city: string;
  state: string;
  nabhAccredited: boolean;
}

export interface Building {
  id: string;
  facilityId: string;
  name: string;
  floors: number;
}

/** A named level within a building — "Floor setup" in Settings edits this list. */
export interface Floor {
  id: string;
  buildingId: string;
  number: number;
  name: string;
}

export interface Department {
  id: string;
  facilityId: string;
  name: string;
  buildingId: string;
  floor: number;
}

export interface Room {
  id: string;
  departmentId: string;
  name: string;
  floor: number;
}

/** Hospital's designated point of contact — same shape as the signup flow's contact step. */
export interface FacilityContact {
  sameAsAdmin: boolean;
  role: string;
  name?: string;
  email?: string;
  phone?: string;
}

// ─────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'ENGINEER' | 'STAFF';

export interface User {
  id: string;
  facilityId: string;
  name: string;
  role: UserRole;
  designation: string; // "Staff Nurse", "Biomedical Engineer", "Consultant"
  departmentId?: string;
  phone: string;
  email: string;
  avatarUrl?: string;
}

export type EngineerAffiliation = 'FREELANCE' | 'SERVICE_COMPANY' | 'OEM';

/** Hospital-scoped directory entry. `platformIdentityId` keyed on phone — makes the marketplace merge trivial later. */
export interface DirectoryEngineer {
  id: string;
  facilityId: string;
  platformIdentityId: string;
  name: string;
  phone: string;
  affiliation: EngineerAffiliation;
  companyName?: string;
  specialisations: string[]; // category names
  ratePerVisit?: number;
  jobsCompleted: number;
  avgResponseHours?: number;
  avgRepairHours?: number;
}

// ─────────────────────────────────────────────────────────────
// Platform catalog (shared across all hospitals — your moat)
// ─────────────────────────────────────────────────────────────

export interface Manufacturer {
  id: string;
  name: string;
  country: string;
  supportPhone?: string;
}

export type Criticality = 'CRITICAL' | 'SEMI_CRITICAL' | 'NON_CRITICAL';
export type UsageTrackingMode = 'SESSION_TIMER' | 'HOUR_METER' | 'NONE';

export interface EquipmentCategory {
  id: string;
  name: string;
  defaultCriticality: Criticality;
  defaultUsageTrackingMode: UsageTrackingMode;
  defaultPmIntervalMonths: number;
  calibrationRequired: boolean;
  /** Auto-close threshold for orphaned sessions, in hours. */
  maxSessionHours: number;
}

export interface EquipmentModel {
  id: string;
  manufacturerId: string;
  categoryId: string;
  modelName: string;
  series?: string;
  expectedServiceLifeYears: number;
  typicalAccessories: string[];
}

/** Fictional dealer entities — the shelf-age scorecard attaches here. */
export interface Vendor {
  id: string;
  facilityId: string;
  name: string;
  type: 'OEM' | 'DEALER' | 'AMC_VENDOR' | 'SERVICE_COMPANY';
  contactPerson: string;
  phone: string;
  gstin?: string;
  responseSlaHours?: number;
}

// ─────────────────────────────────────────────────────────────
// Equipment
// ─────────────────────────────────────────────────────────────

/** Financial and operational status are ORTHOGONAL. Never collapse them. */
export type FinancialStatus = 'ACTIVE_ASSET' | 'CONDEMNED';

export type OperationalStatus =
  | 'DRAFT'
  | 'IN_SERVICE'
  | 'UNDER_MAINTENANCE'
  | 'DOWN'
  | 'IN_TRANSIT'
  | 'RETIRED'
  | 'DISPOSED';

/** Computed, never stored. One unit can carry several at once. */
export type EquipmentFlag =
  | 'PM_DUE'
  | 'PM_OVERDUE'
  | 'CALIBRATION_EXPIRING'
  | 'CALIBRATION_EXPIRED'
  | 'WARRANTY_EXPIRING'
  | 'WARRANTY_EXPIRED'
  | 'AMC_EXPIRING'
  | 'SLA_BREACHED'
  | 'CONTINUED_USE_REVIEW_OVERDUE'
  | 'AGED_STOCK_AT_PURCHASE';

export interface Equipment {
  id: string;
  facilityId: string;
  assetId: string;              // human-readable, e.g. "MH/RAD/0042"
  qrToken: string;

  equipmentModelId: string;
  serialNumber: string;

  // Procurement integrity — §13 of the foundation doc
  yearOfManufacture: number;
  dateOfPurchase: string;       // ISO
  dateOfInstallation: string;
  dateOfAcceptance: string;
  dealerVendorId: string;
  purchaseCost: number;         // INR

  departmentId: string;
  roomId: string;
  responsibleUserId: string;

  criticality: Criticality;
  usageTrackingMode: UsageTrackingMode;
  financialStatus: FinancialStatus;
  operationalStatus: OperationalStatus;

  cumulativeUsageHours: number;
  hourMeterReading?: number;
  hourMeterLastReadAt?: string;

  photoUrl?: string;
  createdAt: string;
}

/** Derived — compute in a selector, don't store. */
export interface EquipmentDerived {
  shelfAgeMonths: number;
  flags: EquipmentFlag[];
  activeSession?: UsageSession;
  usageConfidencePct: number;   // % of hours from CONFIRMED sessions
  nextPmDue?: string;
  totalCostOfOwnership: number;
}

export type AccessoryStatus = 'IN_USE' | 'REPLACED' | 'MISSING' | 'DAMAGED' | 'RETIRED';
export type PartSource = 'OEM' | 'LOCAL' | 'REFURBISHED';

/** Individually tracked child asset. Consumables are NOT accessories — see PartUsage. */
export interface Accessory {
  id: string;
  equipmentId: string;
  accessoryId: string;          // human-readable
  name: string;
  serialNumber?: string;
  status: AccessoryStatus;
  source: PartSource;
  partWarrantyUntil?: string;
  replacedAccessoryId?: string; // builds the lineage chain
  installedAt: string;
  removedAt?: string;
  removalReason?: string;
}

export type DocumentType =
  | 'MANUAL' | 'INVOICE' | 'WARRANTY_CARD' | 'CALIBRATION_CERT'
  | 'SERVICE_REPORT' | 'CONDEMNATION_APPROVAL' | 'AMC_CONTRACT';

export interface EquipmentDocument {
  id: string;
  equipmentId: string;
  type: DocumentType;
  fileName: string;
  fileSizeKb: number;
  uploadedByUserId: string;
  uploadedAt: string;
  expiryDate?: string;
}

// ─────────────────────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────────────────────

export type ContractType = 'WARRANTY' | 'AMC' | 'CMC' | 'SERVICE';

export interface Contract {
  id: string;
  facilityId: string;
  vendorId: string;
  type: ContractType;
  contractNumber: string;
  startDate: string;
  endDate: string;
  annualCost: number;
  coverageNotes: string;
  responseSlaHours: number;
  resolutionSlaHours: number;
  coveredEquipmentIds: string[];
}

// ─────────────────────────────────────────────────────────────
// Usage sessions — the differentiator
// ─────────────────────────────────────────────────────────────

export type SessionType = 'CLINICAL_USE' | 'MAINTENANCE_WORK';

export type SessionEndReason =
  | 'NORMAL' | 'BREAKDOWN' | 'AUTO_CLOSED' | 'ADMIN_CORRECTED';

/** Makes usage-based triggers honest. Surface as "1,240 hrs — 82% confirmed". */
export type SessionDataQuality =
  | 'CONFIRMED'        // both scans happened
  | 'ESTIMATED'        // auto-closed at declared expectation
  | 'CORRECTED'        // auto-closed then adjusted by a human
  | 'SYSTEM_CAPPED';   // no expectation given, hit category max

export type GateState = 'GREEN' | 'AMBER' | 'RED';

export interface UsageSession {
  id: string;
  equipmentId: string;
  userId: string;
  sessionType: SessionType;     // set from role, never chosen by staff
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  expectedDurationMinutes?: number;
  endReason?: SessionEndReason;
  dataQuality: SessionDataQuality;
  gateStateAtStart: GateState;
  gateAcknowledged: boolean;
  breakdownAtSeconds?: number;  // runtime at failure
}

export interface GateEvaluation {
  state: GateState;
  headline: string;
  detail?: string;
  authorisationValidUntil?: string;
  canProceed: boolean;
}

// ─────────────────────────────────────────────────────────────
// Tickets & work orders
// ─────────────────────────────────────────────────────────────

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'NORMAL';
export type TicketSource = 'SCAN_BREAKDOWN' | 'MANUAL' | 'PM_FINDING';

export type TicketStatus =
  | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS'
  | 'PENDING_VENDOR' | 'PENDING_PARTS' | 'RESOLVED' | 'CLOSED';

export interface Ticket {
  id: string;
  ticketNumber: string;
  equipmentId: string;
  raisedByUserId: string;
  source: TicketSource;
  issueType: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  runtimeHoursAtFailure?: number;
  openedAt: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDueAt?: string;
  slaBreached: boolean;
  downtimeHours?: number;
  acknowledgedByUserId?: string;
}

export type WorkOrderType =
  | 'CORRECTIVE' | 'PREVENTIVE' | 'CALIBRATION' | 'INSTALLATION' | 'INSPECTION';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  equipmentId: string;
  ticketId?: string;
  type: WorkOrderType;
  performedByUserId?: string;
  performedByEngineerId?: string;
  vendorId?: string;
  startedAt: string;
  completedAt?: string;
  findings?: string;
  labourCost: number;
  partsCost: number;
}

// ─────────────────────────────────────────────────────────────
// Maintenance
// ─────────────────────────────────────────────────────────────

export type PmTriggerType = 'CALENDAR' | 'USAGE_HOURS' | 'WHICHEVER_FIRST';

export interface PmSchedule {
  id: string;
  equipmentId: string;
  triggerType: PmTriggerType;
  intervalMonths?: number;
  intervalUsageHours?: number;
  lastPerformedAt?: string;
  lastPerformedAtHours?: number;
  nextDueDate?: string;
  nextDueHours?: number;
  checklistTemplateId: string;
}

export interface ChecklistTemplate {
  id: string;
  categoryId: string;
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  type: 'PASS_FAIL' | 'READING' | 'TEXT';
  unit?: string;
  expectedRange?: [number, number];
}

export interface CalibrationRecord {
  id: string;
  equipmentId: string;
  performedByUserId?: string;
  performedByVendorId?: string;
  performedAt: string;
  validUntil: string;
  passed: boolean;
  accuracyNotes: string;
  certificateDocumentId?: string;
  certificateNumber: string;
}

// ─────────────────────────────────────────────────────────────
// Parts
// ─────────────────────────────────────────────────────────────

export type RemarkChip =
  | 'UNDER_WARRANTY' | 'TEMPORARY_FIX' | 'RECOMMEND_REPLACEMENT'
  | 'PART_NOT_GENUINE' | 'AWAITING_OEM_PART' | 'DAMAGED_BY_USER';

/** Consumables — no ID, no lifecycle. Filters, tubing, electrodes. */
export interface PartUsage {
  id: string;
  workOrderId: string;
  name: string;
  quantity: number;
  unitCost: number;
  remarkChips: RemarkChip[];
  remarkText?: string;
}

/** Component swap — mutates the accessory tree and builds lineage. */
export interface ComponentReplacement {
  id: string;
  workOrderId: string;
  oldAccessoryId: string;
  newAccessoryId: string;
  reason: 'FAILED' | 'WORN' | 'PREVENTIVE' | 'DAMAGED_BY_STAFF';
  disposition: 'SCRAPPED' | 'RETURNED_TO_VENDOR' | 'KEPT_AS_SPARE';
  source: PartSource;
  cost: number;
  remarkChips: RemarkChip[];
  remarkText?: string;
}

// ─────────────────────────────────────────────────────────────
// Movement — move first, approve after
// ─────────────────────────────────────────────────────────────

export type MovementApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AccessoryCheckInState = 'ARRIVED_OK' | 'ARRIVED_DAMAGED' | 'STAYED_BEHIND';

export interface MovementRequest {
  id: string;
  equipmentId: string;
  initiatedByUserId: string;
  fromRoomId: string;
  toRoomId: string;
  initiatedAt: string;
  arrivedAt?: string;
  receivedByUserId?: string;
  approvalStatus: MovementApprovalStatus;
  approvedByUserId?: string;
  approvedAt?: string;
  flaggedUnapproved: boolean;
  accessoryCheckIns: AccessoryCheckIn[];
}

export interface AccessoryCheckIn {
  accessoryId: string;
  state: AccessoryCheckInState;
  damageNote?: string;
}

// ─────────────────────────────────────────────────────────────
// Condemnation — the India model
// ─────────────────────────────────────────────────────────────

export interface CondemnationRecord {
  id: string;
  equipmentId: string;
  requestedByUserId: string;
  justification: string;
  breakdownCountLast12m: number;
  repairCostLast12m: number;
  approvedByUserId?: string;
  approvedAt?: string;
  disposalMethod?: string;
  disposedAt?: string;
}

export type AuthorisationStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

/** Condemned but still in service. Reviewed on a cycle. */
export interface ContinuedUseAuthorisation {
  id: string;
  equipmentId: string;
  authorisedByUserId: string;
  reason: string;
  authorisedAt: string;
  validUntil: string;
  reviewIntervalMonths: number;
  status: AuthorisationStatus;
}

// ─────────────────────────────────────────────────────────────
// Freelance service reports
// ─────────────────────────────────────────────────────────────

export interface SignatureRecord {
  signerName: string;
  signerPhone: string;
  signatureDataUrl: string;
  otpVerifiedAt: string;
  ipAddress: string;
}

export interface ServiceReport {
  id: string;
  workOrderId: string;
  engineerId: string;
  problemReported: string;
  diagnosis: string;
  workPerformed: string;
  recommendation: string;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  totalCost: number;
  hospitalSignature?: SignatureRecord;
  engineerSignature?: SignatureRecord;
  generatedPdfUrl?: string;
  submittedAt?: string;
}

// ─────────────────────────────────────────────────────────────
// Activity log — append-only, powers the audit trail
// ─────────────────────────────────────────────────────────────

export type ActivityEventType =
  | 'SESSION_STARTED' | 'SESSION_ENDED' | 'SESSION_AUTO_CLOSED' | 'SESSION_CORRECTED'
  | 'GATE_ACKNOWLEDGED' | 'BREAKDOWN_FLAGGED'
  | 'STATUS_CHANGED' | 'TICKET_OPENED' | 'TICKET_ASSIGNED' | 'TICKET_RESOLVED' | 'TICKET_CLOSED'
  | 'WORK_ORDER_CREATED' | 'WORK_ORDER_COMPLETED'
  | 'PM_PERFORMED' | 'CALIBRATION_RECORDED' | 'CERTIFICATE_UPLOADED'
  | 'PART_CONSUMED' | 'COMPONENT_REPLACED'
  | 'MOVE_INITIATED' | 'MOVE_ARRIVED' | 'MOVE_APPROVED' | 'MOVE_FLAGGED'
  | 'ACCESSORY_DAMAGED' | 'ACCESSORY_MISSING'
  | 'DOCUMENT_ADDED' | 'CONTRACT_ADDED' | 'CONTRACT_RENEWED'
  | 'CONDEMNATION_REQUESTED' | 'CONDEMNATION_APPROVED'
  | 'CONTINUED_USE_AUTHORISED' | 'CONTINUED_USE_REVIEWED' | 'CONTINUED_USE_REVOKED'
  | 'ENGINEER_INVITED' | 'SERVICE_REPORT_SIGNED'
  | 'RESPONSIBLE_STAFF_CHANGED' | 'HOUR_METER_READ';

export interface ActivityEvent {
  id: string;
  equipmentId: string;
  eventType: ActivityEventType;
  actorUserId?: string;
  actorEngineerId?: string;
  actorSystem: boolean;
  occurredAt: string;
  summary: string;              // human-readable, rendered directly
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────

export type NotificationTier = 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';

export interface AppNotification {
  id: string;
  tier: NotificationTier;
  equipmentId?: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  actionLabel?: string;
  actionHref?: string;
}

// ─────────────────────────────────────────────────────────────
// Notification preferences — Settings > Notifications, one row
// per alert type with its own on/off state and delivery channel.
// ─────────────────────────────────────────────────────────────

export type AlertType =
  | 'BREAKDOWN_FLAGGED' | 'PM_DUE' | 'WARRANTY_EXPIRING' | 'APPROVAL_REQUESTS' | 'UNAPPROVED_USE';

export type NotificationChannel = 'IN_APP' | 'WHATSAPP' | 'EMAIL';

export interface NotificationPreference {
  alertType: AlertType;
  enabled: boolean;
  channel: NotificationChannel;
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEquipment: number;
  operational: number;
  down: number;
  underMaintenance: number;
  uptimePct: number;
  openTickets: number;
  slaBreached: number;
  pmDueThisWeek: number;
  calibrationExpiring30d: number;
  contractsExpiring90d: number;
  unapprovedMoves: number;
  condemnedInUse: number;
}
