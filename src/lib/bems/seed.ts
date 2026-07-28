/**
 * Meriva BEMS — Seed data
 *
 * Fictional single hospital (Sunrise Multi-specialty Hospital, Nagpur) used
 * to drive every screen against realistic shapes. Dates are chosen relative
 * to DEMO_TODAY (2026-07-24, see derive.ts) so flags compute meaningfully —
 * some units are clean, some carry PM/calibration/contract flags, one is the
 * condemned-but-in-service ultrasound that's the whole pitch.
 */

import type {
  Facility, Building, Department, Room,
  User, Manufacturer, EquipmentCategory, EquipmentModel, Vendor,
  Equipment, Accessory, EquipmentDocument, Contract, UsageSession, Ticket, WorkOrder, PmSchedule,
  ChecklistTemplate, CalibrationRecord, MovementRequest,
  CondemnationRecord, ContinuedUseAuthorisation, ActivityEvent, AppNotification,
} from './types';

// ─────────────────────────────────────────────────────────────
// Tenancy
// ─────────────────────────────────────────────────────────────

export const facility: Facility = {
  id: 'fac-smh',
  organizationId: 'org-meriva-demo',
  name: 'Sunrise Multi-specialty Hospital',
  bedCount: 260,
  city: 'Nagpur',
  state: 'Maharashtra',
  nabhAccredited: true,
};

export const buildings: Building[] = [
  { id: 'bld-main', facilityId: 'fac-smh', name: 'Main Block', floors: 6 },
];

export const departments: Department[] = [
  { id: 'dept-rad', facilityId: 'fac-smh', name: 'Radiology', buildingId: 'bld-main', floor: 1 },
  { id: 'dept-icu', facilityId: 'fac-smh', name: 'ICU', buildingId: 'bld-main', floor: 3 },
  { id: 'dept-er', facilityId: 'fac-smh', name: 'Emergency', buildingId: 'bld-main', floor: 0 },
  { id: 'dept-dial', facilityId: 'fac-smh', name: 'Dialysis', buildingId: 'bld-main', floor: 2 },
];

export const rooms: Room[] = [
  { id: 'room-rad1', departmentId: 'dept-rad', name: 'Ultrasound Room 1', floor: 1 },
  { id: 'room-rad2', departmentId: 'dept-rad', name: 'X-Ray Room', floor: 1 },
  { id: 'room-icu1', departmentId: 'dept-icu', name: 'ICU Bay 3', floor: 3 },
  { id: 'room-er1', departmentId: 'dept-er', name: 'Resus Bay', floor: 0 },
  { id: 'room-dial1', departmentId: 'dept-dial', name: 'Dialysis Unit 1', floor: 2 },
];

// ─────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────

export const users: User[] = [
  { id: 'usr-admin', facilityId: 'fac-smh', name: 'Priya Deshmukh', role: 'ADMIN', designation: 'Biomedical Admin', phone: '+91 98230 11111', email: 'priya.deshmukh@smh.example' },
  { id: 'usr-eng', facilityId: 'fac-smh', name: 'Ramesh Kulkarni', role: 'ENGINEER', designation: 'Biomedical Engineer', phone: '+91 98230 22222', email: 'ramesh.kulkarni@smh.example' },
  { id: 'usr-staff1', facilityId: 'fac-smh', name: 'Ananya Rao', role: 'STAFF', designation: 'Staff Nurse', departmentId: 'dept-icu', phone: '+91 98230 33333', email: 'ananya.rao@smh.example' },
  { id: 'usr-staff2', facilityId: 'fac-smh', name: 'Vikram Shah', role: 'STAFF', designation: 'Staff Nurse', departmentId: 'dept-rad', phone: '+91 98230 44444', email: 'vikram.shah@smh.example' },
];

/** Whoever is "logged in" for this demo build — drives session-start attribution. */
export const currentUser: User = users[2];

// ─────────────────────────────────────────────────────────────
// Platform catalog
// ─────────────────────────────────────────────────────────────

export const manufacturers: Manufacturer[] = [
  { id: 'mfr-ge', name: 'GE Healthcare', country: 'USA', supportPhone: '1800 209 0330' },
  { id: 'mfr-drager', name: 'Dräger', country: 'Germany', supportPhone: '1800 103 3336' },
  { id: 'mfr-philips', name: 'Philips Healthcare', country: 'Netherlands', supportPhone: '1800 419 5850' },
  { id: 'mfr-bpl', name: 'BPL Medical Technologies', country: 'India', supportPhone: '1800 425 1965' },
];

export const categories: EquipmentCategory[] = [
  { id: 'cat-ultrasound', name: 'Ultrasound', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 4 },
  { id: 'cat-ventilator', name: 'Ventilator', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 3, calibrationRequired: true, maxSessionHours: 72 },
  { id: 'cat-defib', name: 'Defibrillator', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 3, calibrationRequired: true, maxSessionHours: 1 },
  { id: 'cat-dialysis', name: 'Dialysis Machine', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 1, calibrationRequired: true, maxSessionHours: 6 },
  { id: 'cat-monitor', name: 'Patient Monitor', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'NONE', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 24 },
  { id: 'cat-xray', name: 'X-Ray Machine', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 2 },
];

export const models: EquipmentModel[] = [
  { id: 'model-ultrasound-ge', manufacturerId: 'mfr-ge', categoryId: 'cat-ultrasound', modelName: 'Voluson E10', expectedServiceLifeYears: 10, typicalAccessories: ['Convex probe', 'Linear probe'] },
  { id: 'model-vent-drager', manufacturerId: 'mfr-drager', categoryId: 'cat-ventilator', modelName: 'Evita V500', expectedServiceLifeYears: 12, typicalAccessories: ['Breathing circuit', 'Flow sensor'] },
  { id: 'model-defib-philips', manufacturerId: 'mfr-philips', categoryId: 'cat-defib', modelName: 'HeartStart XL+', expectedServiceLifeYears: 10, typicalAccessories: ['Paddles', 'ECG cable'] },
  { id: 'model-dialysis-bpl', manufacturerId: 'mfr-bpl', categoryId: 'cat-dialysis', modelName: 'Nephro 9000', expectedServiceLifeYears: 8, typicalAccessories: ['Dialyzer holder', 'Blood tubing set'] },
  { id: 'model-monitor-philips', manufacturerId: 'mfr-philips', categoryId: 'cat-monitor', modelName: 'IntelliVue MX450', expectedServiceLifeYears: 7, typicalAccessories: ['SpO2 sensor', 'NIBP cuff'] },
  { id: 'model-xray-ge', manufacturerId: 'mfr-ge', categoryId: 'cat-xray', modelName: 'Optima XR220', expectedServiceLifeYears: 12, typicalAccessories: ['Detector panel'] },
];

export const vendors: Vendor[] = [
  { id: 'ven-oem-ge', facilityId: 'fac-smh', name: 'GE Healthcare India', type: 'OEM', contactPerson: 'Suresh Nair', phone: '+91 98200 55555', gstin: '27AAACG1234M1Z5', responseSlaHours: 24 },
  { id: 'ven-dealer-medisales', facilityId: 'fac-smh', name: 'MediSales Distributors', type: 'DEALER', contactPerson: 'Anil Bhosale', phone: '+91 98220 66666', gstin: '27AAACM5678N1Z2' },
  { id: 'ven-amc-carewell', facilityId: 'fac-smh', name: 'CareWell Biomedical Services', type: 'AMC_VENDOR', contactPerson: 'Meena Iyer', phone: '+91 98230 77777', gstin: '27AAACC9012P1Z8', responseSlaHours: 8 },
];

// ─────────────────────────────────────────────────────────────
// Equipment
// ─────────────────────────────────────────────────────────────

export const equipment: Equipment[] = [
  // The flagship: condemned but still treating patients — §12 of the foundation doc.
  {
    id: 'eq-us-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/RAD/0007',
    qrToken: 'MRV-9C21F4',
    equipmentModelId: 'model-ultrasound-ge',
    serialNumber: 'GEUS-2018-88213',
    yearOfManufacture: 2018,
    dateOfPurchase: '2019-03-15',
    dateOfInstallation: '2019-03-22',
    dateOfAcceptance: '2019-03-25',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 1450000,
    departmentId: 'dept-rad',
    roomId: 'room-rad1',
    responsibleUserId: 'usr-eng',
    criticality: 'SEMI_CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'CONDEMNED',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 9214,
    createdAt: '2019-03-15T09:00:00+05:30',
  },
  // The happy-path unit for the live scan demo.
  {
    id: 'eq-vent-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/ICU/0012',
    qrToken: 'MRV-8F3A21',
    equipmentModelId: 'model-vent-drager',
    serialNumber: 'DRV-2023-40217',
    yearOfManufacture: 2023,
    dateOfPurchase: '2023-11-01',
    dateOfInstallation: '2023-11-05',
    dateOfAcceptance: '2023-11-06',
    dealerVendorId: 'ven-oem-ge',
    purchaseCost: 2200000,
    departmentId: 'dept-icu',
    roomId: 'room-icu1',
    responsibleUserId: 'usr-staff1',
    criticality: 'CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 1840,
    createdAt: '2023-11-01T09:00:00+05:30',
  },
  {
    id: 'eq-defib-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/ER/0003',
    qrToken: 'MRV-6B10D2',
    equipmentModelId: 'model-defib-philips',
    serialNumber: 'PHD-2021-77012',
    yearOfManufacture: 2021,
    dateOfPurchase: '2021-06-10',
    dateOfInstallation: '2021-06-12',
    dateOfAcceptance: '2021-06-14',
    dealerVendorId: 'ven-oem-ge',
    purchaseCost: 890000,
    departmentId: 'dept-er',
    roomId: 'room-er1',
    responsibleUserId: 'usr-eng',
    criticality: 'CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 312,
    createdAt: '2021-06-10T09:00:00+05:30',
  },
  {
    id: 'eq-dialysis-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/DIA/0005',
    qrToken: 'MRV-3A98E7',
    equipmentModelId: 'model-dialysis-bpl',
    serialNumber: 'BPLD-2022-10044',
    yearOfManufacture: 2022,
    dateOfPurchase: '2022-05-20',
    dateOfInstallation: '2022-05-25',
    dateOfAcceptance: '2022-05-28',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 650000,
    departmentId: 'dept-dial',
    roomId: 'room-dial1',
    responsibleUserId: 'usr-eng',
    criticality: 'CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 4120,
    createdAt: '2022-05-20T09:00:00+05:30',
  },
  {
    id: 'eq-monitor-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/ICU/0020',
    qrToken: 'MRV-5D44C9',
    equipmentModelId: 'model-monitor-philips',
    serialNumber: 'PHM-2020-55871',
    yearOfManufacture: 2020,
    dateOfPurchase: '2020-09-01',
    dateOfInstallation: '2020-09-03',
    dateOfAcceptance: '2020-09-05',
    dealerVendorId: 'ven-oem-ge',
    purchaseCost: 410000,
    departmentId: 'dept-icu',
    roomId: 'room-icu1',
    responsibleUserId: 'usr-staff1',
    criticality: 'SEMI_CRITICAL',
    usageTrackingMode: 'NONE',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 0,
    createdAt: '2020-09-01T09:00:00+05:30',
  },
  {
    id: 'eq-xray-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/RAD/0002',
    qrToken: 'MRV-1E67B3',
    equipmentModelId: 'model-xray-ge',
    serialNumber: 'GEXR-2017-33009',
    yearOfManufacture: 2017,
    dateOfPurchase: '2017-08-01',
    dateOfInstallation: '2017-08-10',
    dateOfAcceptance: '2017-08-12',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 3100000,
    departmentId: 'dept-rad',
    roomId: 'room-rad2',
    responsibleUserId: 'usr-eng',
    criticality: 'SEMI_CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'DOWN',
    cumulativeUsageHours: 15870,
    createdAt: '2017-08-01T09:00:00+05:30',
  },
];

// ─────────────────────────────────────────────────────────────
// Accessories — the ultrasound probe lineage (§9)
// ─────────────────────────────────────────────────────────────

export const accessories: Accessory[] = [
  {
    id: 'acc-probe-orig', equipmentId: 'eq-us-001', accessoryId: 'SMH/RAD/0007-A1',
    name: 'Convex probe', serialNumber: 'GEPB-2019-001', status: 'REPLACED', source: 'OEM',
    installedAt: '2019-03-22', removedAt: '2023-10-05', removalReason: 'FAILED',
  },
  {
    id: 'acc-probe-local', equipmentId: 'eq-us-001', accessoryId: 'SMH/RAD/0007-A2',
    name: 'Convex probe', serialNumber: 'LOC-2023-447', status: 'REPLACED', source: 'LOCAL',
    replacedAccessoryId: 'acc-probe-orig',
    installedAt: '2023-10-08', removedAt: '2024-07-15', removalReason: 'FAILED',
  },
  {
    id: 'acc-probe-current', equipmentId: 'eq-us-001', accessoryId: 'SMH/RAD/0007-A3',
    name: 'Convex probe', serialNumber: 'GEPB-2024-902', status: 'IN_USE', source: 'OEM',
    replacedAccessoryId: 'acc-probe-local', partWarrantyUntil: '2027-07-15',
    installedAt: '2024-07-18',
  },
];

// ─────────────────────────────────────────────────────────────
// Documents — completeness feeds the Equipment list's "Docs" column.
// Baseline expected set per unit is MANUAL + INVOICE + WARRANTY_CARD;
// deliberately uneven here so the column has real green/amber/red spread.
// ─────────────────────────────────────────────────────────────

export const equipmentDocuments: EquipmentDocument[] = [
  { id: 'doc-us-001', equipmentId: 'eq-us-001', type: 'MANUAL', fileName: 'Voluson-E10-manual.pdf', fileSizeKb: 4820, uploadedByUserId: 'usr-eng', uploadedAt: '2019-03-25' },
  { id: 'doc-us-002', equipmentId: 'eq-us-001', type: 'INVOICE', fileName: 'invoice-GEUS-2018-88213.pdf', fileSizeKb: 210, uploadedByUserId: 'usr-eng', uploadedAt: '2019-03-15' },
  { id: 'doc-us-003', equipmentId: 'eq-us-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-us-001.pdf', fileSizeKb: 180, uploadedByUserId: 'usr-eng', uploadedAt: '2019-03-25' },

  { id: 'doc-vent-001', equipmentId: 'eq-vent-001', type: 'MANUAL', fileName: 'Evita-V500-manual.pdf', fileSizeKb: 6120, uploadedByUserId: 'usr-eng', uploadedAt: '2023-11-06' },
  { id: 'doc-vent-002', equipmentId: 'eq-vent-001', type: 'INVOICE', fileName: 'invoice-DRV-2023-40217.pdf', fileSizeKb: 195, uploadedByUserId: 'usr-eng', uploadedAt: '2023-11-01' },

  { id: 'doc-defib-001', equipmentId: 'eq-defib-001', type: 'MANUAL', fileName: 'HeartStart-XL-manual.pdf', fileSizeKb: 3340, uploadedByUserId: 'usr-eng', uploadedAt: '2021-06-14' },
  { id: 'doc-defib-002', equipmentId: 'eq-defib-001', type: 'INVOICE', fileName: 'invoice-PHD-2021-77012.pdf', fileSizeKb: 175, uploadedByUserId: 'usr-eng', uploadedAt: '2021-06-10' },
  { id: 'doc-defib-003', equipmentId: 'eq-defib-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-defib-001.pdf', fileSizeKb: 160, uploadedByUserId: 'usr-eng', uploadedAt: '2021-06-14' },

  { id: 'doc-dialysis-001', equipmentId: 'eq-dialysis-001', type: 'INVOICE', fileName: 'invoice-BPLD-2022-10044.pdf', fileSizeKb: 205, uploadedByUserId: 'usr-eng', uploadedAt: '2022-05-20' },
  { id: 'doc-dialysis-002', equipmentId: 'eq-dialysis-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-dialysis-001.pdf', fileSizeKb: 170, uploadedByUserId: 'usr-eng', uploadedAt: '2022-05-28' },

  { id: 'doc-monitor-001', equipmentId: 'eq-monitor-001', type: 'INVOICE', fileName: 'invoice-PHM-2020-55871.pdf', fileSizeKb: 190, uploadedByUserId: 'usr-eng', uploadedAt: '2020-09-01' },

  { id: 'doc-xray-001', equipmentId: 'eq-xray-001', type: 'MANUAL', fileName: 'Optima-XR220-manual.pdf', fileSizeKb: 5510, uploadedByUserId: 'usr-eng', uploadedAt: '2017-08-12' },
  { id: 'doc-xray-002', equipmentId: 'eq-xray-001', type: 'INVOICE', fileName: 'invoice-GEXR-2017-33009.pdf', fileSizeKb: 220, uploadedByUserId: 'usr-eng', uploadedAt: '2017-08-01' },
  { id: 'doc-xray-003', equipmentId: 'eq-xray-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-xray-001.pdf', fileSizeKb: 165, uploadedByUserId: 'usr-eng', uploadedAt: '2017-08-12' },
];

// ─────────────────────────────────────────────────────────────
// Commercial
// ─────────────────────────────────────────────────────────────

export const contracts: Contract[] = [
  {
    id: 'ctr-vent-amc', facilityId: 'fac-smh', vendorId: 'ven-amc-carewell', type: 'AMC',
    contractNumber: 'AMC-2025-0041', startDate: '2025-11-01', endDate: '2026-10-31',
    annualCost: 180000, coverageNotes: 'Comprehensive — parts and labour', responseSlaHours: 4,
    resolutionSlaHours: 24, coveredEquipmentIds: ['eq-vent-001'],
  },
  {
    id: 'ctr-dialysis-amc', facilityId: 'fac-smh', vendorId: 'ven-amc-carewell', type: 'AMC',
    contractNumber: 'AMC-2025-0058', startDate: '2025-09-10', endDate: '2026-09-10',
    annualCost: 95000, coverageNotes: 'Comprehensive', responseSlaHours: 6,
    resolutionSlaHours: 48, coveredEquipmentIds: ['eq-dialysis-001'],
  },
  {
    // endDate kept within the dashboard's warranty-alert window (relative to DEMO_TODAY)
    // so the "Equipment alerts" panel always has a real example to show.
    id: 'ctr-defib-warranty', facilityId: 'fac-smh', vendorId: 'ven-oem-ge', type: 'WARRANTY',
    contractNumber: 'WAR-2021-1187', startDate: '2021-06-10', endDate: '2026-08-05',
    annualCost: 0, coverageNotes: 'OEM standard warranty', responseSlaHours: 24,
    resolutionSlaHours: 72, coveredEquipmentIds: ['eq-defib-001'],
  },
  // The three below exist so the dashboard's "Equipment alerts" panel has
  // five real, staggered warranty-expiry examples to show (relative to DEMO_TODAY).
  {
    id: 'ctr-monitor-warranty', facilityId: 'fac-smh', vendorId: 'ven-oem-ge', type: 'WARRANTY',
    contractNumber: 'WAR-2020-0940', startDate: '2020-09-01', endDate: '2026-08-01',
    annualCost: 0, coverageNotes: 'OEM extended warranty', responseSlaHours: 24,
    resolutionSlaHours: 72, coveredEquipmentIds: ['eq-monitor-001'],
  },
  {
    id: 'ctr-vent-warranty', facilityId: 'fac-smh', vendorId: 'ven-oem-ge', type: 'WARRANTY',
    contractNumber: 'WAR-2023-2211', startDate: '2023-11-01', endDate: '2026-08-27',
    annualCost: 0, coverageNotes: 'OEM standard warranty', responseSlaHours: 12,
    resolutionSlaHours: 48, coveredEquipmentIds: ['eq-vent-001'],
  },
  {
    id: 'ctr-xray-warranty', facilityId: 'fac-smh', vendorId: 'ven-oem-ge', type: 'WARRANTY',
    contractNumber: 'WAR-2017-0755', startDate: '2017-08-01', endDate: '2026-09-29',
    annualCost: 0, coverageNotes: 'OEM extended warranty', responseSlaHours: 24,
    resolutionSlaHours: 96, coveredEquipmentIds: ['eq-xray-001'],
  },
];

// ─────────────────────────────────────────────────────────────
// Maintenance
// ─────────────────────────────────────────────────────────────

export const checklistTemplates: ChecklistTemplate[] = [
  {
    id: 'chk-generic-pm', categoryId: 'cat-ultrasound', name: 'Standard PM checklist',
    items: [
      { id: 'chk-item-visual', label: 'Visual inspection — casing, cables, connectors', type: 'PASS_FAIL' },
      { id: 'chk-item-power', label: 'Power-on self-test', type: 'PASS_FAIL' },
      { id: 'chk-item-leakage', label: 'Leakage current', type: 'READING', unit: 'µA', expectedRange: [0, 100] },
    ],
  },
];

export const pmSchedules: PmSchedule[] = [
  { id: 'pm-us-001', equipmentId: 'eq-us-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-02-01', nextDueDate: '2026-08-01', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-vent-001', equipmentId: 'eq-vent-001', triggerType: 'WHICHEVER_FIRST', intervalMonths: 3, intervalUsageHours: 2000, lastPerformedAt: '2026-06-15', lastPerformedAtHours: 1600, nextDueDate: '2026-09-15', nextDueHours: 2000, checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-defib-001', equipmentId: 'eq-defib-001', triggerType: 'CALENDAR', intervalMonths: 3, lastPerformedAt: '2026-04-01', nextDueDate: '2026-07-01', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-dialysis-001', equipmentId: 'eq-dialysis-001', triggerType: 'CALENDAR', intervalMonths: 1, lastPerformedAt: '2026-06-28', nextDueDate: '2026-07-28', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-monitor-001', equipmentId: 'eq-monitor-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-03-01', nextDueDate: '2026-09-01', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-xray-001', equipmentId: 'eq-xray-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-01-15', nextDueDate: '2026-07-15', checklistTemplateId: 'chk-generic-pm' },
];

export const calibrationRecords: CalibrationRecord[] = [
  { id: 'cal-us-001', equipmentId: 'eq-us-001', performedByUserId: 'usr-eng', performedAt: '2026-06-01', validUntil: '2027-06-01', passed: true, accuracyNotes: 'Within tolerance', certificateNumber: 'CAL-2026-0091' },
  { id: 'cal-vent-001', equipmentId: 'eq-vent-001', performedByVendorId: 'ven-amc-carewell', performedAt: '2026-01-10', validUntil: '2027-01-10', passed: true, accuracyNotes: 'Flow and pressure sensors within spec', certificateNumber: 'CAL-2026-0014' },
  { id: 'cal-defib-001', equipmentId: 'eq-defib-001', performedByUserId: 'usr-eng', performedAt: '2025-08-05', validUntil: '2026-08-05', passed: true, accuracyNotes: 'Energy delivery accurate', certificateNumber: 'CAL-2025-0203' },
  { id: 'cal-monitor-001', equipmentId: 'eq-monitor-001', performedByVendorId: 'ven-oem-ge', performedAt: '2025-08-15', validUntil: '2026-08-15', passed: true, accuracyNotes: 'NIBP and SpO2 within spec', certificateNumber: 'CAL-2025-0219' },
];

// ─────────────────────────────────────────────────────────────
// Condemnation — the India model (§12)
// ─────────────────────────────────────────────────────────────

export const condemnationRecords: CondemnationRecord[] = [
  {
    id: 'cnd-us-001', equipmentId: 'eq-us-001', requestedByUserId: 'usr-eng',
    justification: '3 breakdowns in 12 months; cumulative repair cost exceeds 40% of replacement value.',
    breakdownCountLast12m: 3, repairCostLast12m: 380000,
    approvedByUserId: 'usr-admin', approvedAt: '2025-11-15',
  },
];

export const continuedUseAuthorisations: ContinuedUseAuthorisation[] = [
  {
    id: 'cua-us-001', equipmentId: 'eq-us-001', authorisedByUserId: 'usr-admin',
    reason: 'Replacement budgeted for Q4 2026; unit remains clinically serviceable under freelance support.',
    authorisedAt: '2026-01-30', validUntil: '2026-08-30', reviewIntervalMonths: 6, status: 'ACTIVE',
  },
];

// ─────────────────────────────────────────────────────────────
// Tickets — breakdown history
// ─────────────────────────────────────────────────────────────

export const tickets: Ticket[] = [
  {
    id: 'tkt-us-001', ticketNumber: 'TKT-2025-0142', equipmentId: 'eq-us-001', raisedByUserId: 'usr-staff2',
    source: 'SCAN_BREAKDOWN', issueType: 'No image on display', description: 'Screen goes black mid-scan intermittently.',
    priority: 'HIGH', status: 'CLOSED', runtimeHoursAtFailure: 7480,
    openedAt: '2025-10-02T11:15:00+05:30', assignedAt: '2025-10-02T13:00:00+05:30',
    resolvedAt: '2025-10-04T16:00:00+05:30', closedAt: '2025-10-05T09:00:00+05:30',
    slaDueAt: '2025-10-03T11:15:00+05:30', slaBreached: false, downtimeHours: 52.75,
    acknowledgedByUserId: 'usr-staff2',
  },
  {
    id: 'tkt-us-002', ticketNumber: 'TKT-2026-0033', equipmentId: 'eq-us-001', raisedByUserId: 'usr-staff2',
    source: 'SCAN_BREAKDOWN', issueType: 'Probe not detected', description: 'System does not recognise the connected probe.',
    priority: 'HIGH', status: 'CLOSED', runtimeHoursAtFailure: 8760,
    openedAt: '2026-02-08T09:30:00+05:30', assignedAt: '2026-02-08T14:00:00+05:30',
    resolvedAt: '2026-02-09T12:00:00+05:30', closedAt: '2026-02-09T15:00:00+05:30',
    slaDueAt: '2026-02-09T09:30:00+05:30', slaBreached: false, downtimeHours: 26.5,
    acknowledgedByUserId: 'usr-staff2',
  },
  {
    id: 'tkt-xray-001', ticketNumber: 'TKT-2026-0089', equipmentId: 'eq-xray-001', raisedByUserId: 'usr-staff2',
    source: 'SCAN_BREAKDOWN', issueType: 'Detector panel error', description: 'Panel throws calibration error on boot, exposures blocked.',
    priority: 'CRITICAL', status: 'IN_PROGRESS', runtimeHoursAtFailure: 15870,
    openedAt: '2026-07-22T08:40:00+05:30', assignedAt: '2026-07-22T09:10:00+05:30',
    slaDueAt: '2026-07-22T12:40:00+05:30', slaBreached: true,
  },
  {
    id: 'tkt-dialysis-001', ticketNumber: 'TKT-2026-0091', equipmentId: 'eq-dialysis-001', raisedByUserId: 'usr-staff1',
    source: 'MANUAL', issueType: 'Unusual noise during cycle', description: 'Grinding noise from pump reported during a dialysis cycle.',
    priority: 'NORMAL', status: 'OPEN',
    openedAt: '2026-07-24T08:00:00+05:30',
    slaDueAt: '2026-07-25T08:00:00+05:30', slaBreached: false,
  },
  {
    id: 'tkt-monitor-001', ticketNumber: 'TKT-2026-0095', equipmentId: 'eq-monitor-001', raisedByUserId: 'usr-staff1',
    source: 'MANUAL', issueType: 'SpO2 sensor cable frayed', description: 'Cable insulation cracked near connector; replacement ordered.',
    priority: 'HIGH', status: 'PENDING_PARTS',
    openedAt: '2026-07-23T14:00:00+05:30', assignedAt: '2026-07-23T15:00:00+05:30',
    slaDueAt: '2026-07-24T14:00:00+05:30', slaBreached: false,
  },
];

// ─────────────────────────────────────────────────────────────
// Work orders — which internal engineer is on which job
// ─────────────────────────────────────────────────────────────

export const workOrders: WorkOrder[] = [
  {
    id: 'wo-001', workOrderNumber: 'WO-2026-0141', equipmentId: 'eq-xray-001', ticketId: 'tkt-xray-001',
    type: 'CORRECTIVE', performedByUserId: 'usr-eng',
    startedAt: '2026-07-22T09:10:00+05:30', findings: 'Diagnosing detector panel fault.',
    labourCost: 0, partsCost: 0,
  },
  {
    id: 'wo-002', workOrderNumber: 'WO-2026-0144', equipmentId: 'eq-us-001',
    type: 'PREVENTIVE', performedByUserId: 'usr-eng',
    startedAt: '2026-08-01T09:00:00+05:30',
    labourCost: 0, partsCost: 0,
  },
  {
    id: 'wo-003', workOrderNumber: 'WO-2026-0145', equipmentId: 'eq-dialysis-001',
    type: 'PREVENTIVE', performedByUserId: 'usr-eng',
    startedAt: '2026-07-28T09:00:00+05:30',
    labourCost: 0, partsCost: 0,
  },
  {
    id: 'wo-004', workOrderNumber: 'WO-2026-0128', equipmentId: 'eq-defib-001',
    type: 'CALIBRATION', performedByUserId: 'usr-eng',
    startedAt: '2026-07-10T09:00:00+05:30', completedAt: '2026-07-10T12:30:00+05:30',
    findings: 'Energy delivery within spec.', labourCost: 1500, partsCost: 0,
  },
  {
    id: 'wo-005', workOrderNumber: 'WO-2026-0148', equipmentId: 'eq-monitor-001', ticketId: 'tkt-monitor-001',
    type: 'CORRECTIVE', performedByUserId: 'usr-eng',
    startedAt: '2026-07-23T15:00:00+05:30', findings: 'Awaiting replacement SpO2 cable from vendor.',
    labourCost: 0, partsCost: 0,
  },
  // The three below are scheduled for DEMO_TODAY (2026-07-24) at staggered
  // times so the dashboard's "Today's schedule" panel has a real Completed /
  // In progress / Upcoming example of each.
  {
    id: 'wo-006', workOrderNumber: 'WO-2026-0149', equipmentId: 'eq-defib-001',
    type: 'PREVENTIVE', performedByUserId: 'usr-eng',
    startedAt: '2026-07-24T09:30:00+05:30', completedAt: '2026-07-24T10:10:00+05:30',
    findings: 'Routine PM check — all pass.', labourCost: 800, partsCost: 0,
  },
  {
    id: 'wo-007', workOrderNumber: 'WO-2026-0150', equipmentId: 'eq-vent-001',
    type: 'CALIBRATION', performedByUserId: 'usr-eng',
    startedAt: '2026-07-24T09:45:00+05:30',
    labourCost: 0, partsCost: 0,
  },
  {
    id: 'wo-008', workOrderNumber: 'WO-2026-0151', equipmentId: 'eq-xray-001',
    type: 'INSPECTION', performedByUserId: 'usr-eng',
    startedAt: '2026-07-24T15:30:00+05:30',
    labourCost: 0, partsCost: 0,
  },
];

// ─────────────────────────────────────────────────────────────
// Usage sessions
// ─────────────────────────────────────────────────────────────

export const usageSessions: UsageSession[] = [
  { id: 'ses-us-001', equipmentId: 'eq-us-001', userId: 'usr-staff2', sessionType: 'CLINICAL_USE', startedAt: '2026-07-23T10:00:00+05:30', endedAt: '2026-07-23T10:22:00+05:30', durationSeconds: 1320, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'AMBER', gateAcknowledged: true },
  { id: 'ses-us-002', equipmentId: 'eq-us-001', userId: 'usr-staff2', sessionType: 'CLINICAL_USE', startedAt: '2026-07-24T09:15:00+05:30', endedAt: '2026-07-24T09:40:00+05:30', durationSeconds: 1500, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'AMBER', gateAcknowledged: true },
  { id: 'ses-vent-001', equipmentId: 'eq-vent-001', userId: 'usr-staff1', sessionType: 'CLINICAL_USE', startedAt: '2026-07-20T08:00:00+05:30', endedAt: '2026-07-23T08:00:00+05:30', durationSeconds: 259200, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'GREEN', gateAcknowledged: false },
  { id: 'ses-xray-001', equipmentId: 'eq-xray-001', userId: 'usr-staff2', sessionType: 'CLINICAL_USE', startedAt: '2026-07-22T08:15:00+05:30', endedAt: '2026-07-22T08:40:00+05:30', durationSeconds: 1500, endReason: 'BREAKDOWN', dataQuality: 'CONFIRMED', gateStateAtStart: 'GREEN', gateAcknowledged: false, breakdownAtSeconds: 1500 },
];

// ─────────────────────────────────────────────────────────────
// Activity log
// ─────────────────────────────────────────────────────────────

export const activityEvents: ActivityEvent[] = [
  { id: 'act-us-001', equipmentId: 'eq-us-001', eventType: 'CONDEMNATION_REQUESTED', actorUserId: 'usr-eng', actorSystem: false, occurredAt: '2025-11-01T10:00:00+05:30', summary: 'Ramesh Kulkarni requested condemnation — 3 breakdowns in 12 months' },
  { id: 'act-us-002', equipmentId: 'eq-us-001', eventType: 'CONDEMNATION_APPROVED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2025-11-15T15:00:00+05:30', summary: 'Priya Deshmukh approved condemnation — written off books' },
  { id: 'act-us-003', equipmentId: 'eq-us-001', eventType: 'CONTINUED_USE_AUTHORISED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-01-30T11:00:00+05:30', summary: 'Continued use authorised until 30 Aug 2026 — replacement budgeted Q4 2026' },
  { id: 'act-us-004', equipmentId: 'eq-us-001', eventType: 'COMPONENT_REPLACED', actorUserId: 'usr-eng', actorSystem: false, occurredAt: '2024-07-18T12:00:00+05:30', summary: 'Convex probe replaced — OEM, prior local probe failed after 9 months' },
  { id: 'act-us-005', equipmentId: 'eq-us-001', eventType: 'GATE_ACKNOWLEDGED', actorUserId: 'usr-staff2', actorSystem: false, occurredAt: '2026-07-24T09:15:00+05:30', summary: 'Vikram Shah acknowledged the amber advisory and proceeded' },
  { id: 'act-us-006', equipmentId: 'eq-us-001', eventType: 'SESSION_STARTED', actorUserId: 'usr-staff2', actorSystem: false, occurredAt: '2026-07-24T09:15:00+05:30', summary: 'Session started by Vikram Shah' },
  { id: 'act-us-007', equipmentId: 'eq-us-001', eventType: 'SESSION_ENDED', actorUserId: 'usr-staff2', actorSystem: false, occurredAt: '2026-07-24T09:40:00+05:30', summary: 'Session ended after 25m 0s — confirmed' },
  { id: 'act-xray-001', equipmentId: 'eq-xray-001', eventType: 'BREAKDOWN_FLAGGED', actorUserId: 'usr-staff2', actorSystem: false, occurredAt: '2026-07-22T08:40:00+05:30', summary: 'Breakdown flagged 25m 0s into session — detector panel error' },
  { id: 'act-xray-002', equipmentId: 'eq-xray-001', eventType: 'TICKET_OPENED', actorSystem: true, occurredAt: '2026-07-22T08:40:00+05:30', summary: 'TKT-2026-0089 created automatically from breakdown flag' },
  { id: 'act-xray-003', equipmentId: 'eq-xray-001', eventType: 'STATUS_CHANGED', actorSystem: true, occurredAt: '2026-07-22T08:40:00+05:30', summary: 'Status changed to Down, downtime clock started', before: { operationalStatus: 'IN_SERVICE' }, after: { operationalStatus: 'DOWN' } },
  { id: 'act-xray-004', equipmentId: 'eq-xray-001', eventType: 'WORK_ORDER_CREATED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-22T09:15:00+05:30', summary: 'Ramesh Kulkarni assigned to WO-2026-0141 — detector panel fault' },
  { id: 'act-monitor-001', equipmentId: 'eq-monitor-001', eventType: 'MOVE_APPROVED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-23T16:00:00+05:30', summary: 'Move to Resus Bay approved by Priya Deshmukh' },
  { id: 'act-monitor-002', equipmentId: 'eq-monitor-001', eventType: 'WORK_ORDER_CREATED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-23T15:05:00+05:30', summary: 'Ramesh Kulkarni assigned to WO-2026-0148 — SpO2 cable replacement' },
];

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────

export const notifications: AppNotification[] = [
  { id: 'ntf-001', tier: 'IMMEDIATE', equipmentId: 'eq-xray-001', title: 'X-Ray Machine down — X-Ray Room', body: 'Flagged by Vikram Shah 25m into a session. Detector panel error.', createdAt: '2026-07-22T08:40:00+05:30', actionLabel: 'View ticket', actionHref: '/tickets/tkt-xray-001' },
  { id: 'ntf-002', tier: 'DAILY_DIGEST', title: 'PM due this week', body: '2 units have preventive maintenance due within 7 days.', createdAt: '2026-07-24T06:00:00+05:30' },
];

export const movementRequests: MovementRequest[] = [
  {
    id: 'mv-monitor-001', equipmentId: 'eq-monitor-001', initiatedByUserId: 'usr-staff1',
    fromRoomId: 'room-icu1', toRoomId: 'room-er1',
    initiatedAt: '2026-07-23T10:00:00+05:30', arrivedAt: '2026-07-23T10:20:00+05:30',
    receivedByUserId: 'usr-staff2', approvalStatus: 'APPROVED', approvedByUserId: 'usr-admin',
    approvedAt: '2026-07-23T16:00:00+05:30', flaggedUnapproved: false, accessoryCheckIns: [],
  },
];

// ─────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────

export const getEquipmentById = (id: string) => equipment.find((e) => e.id === id);
export const getFacility = (id: string) => (id === facility.id ? facility : undefined);
export const getBuilding = (id: string) => buildings.find((b) => b.id === id);
export const getDepartment = (id: string) => departments.find((d) => d.id === id);
export const getRoom = (id: string) => rooms.find((r) => r.id === id);
export const getUser = (id?: string) => (id ? users.find((u) => u.id === id) : undefined);
export const getManufacturer = (id: string) => manufacturers.find((m) => m.id === id);
export const getCategory = (id: string) => categories.find((c) => c.id === id);
export const getModel = (id: string) => models.find((m) => m.id === id);
export const getVendor = (id?: string) => (id ? vendors.find((v) => v.id === id) : undefined);

export const modelFor = (eq: Equipment) => getModel(eq.equipmentModelId);
export const categoryFor = (eq: Equipment) => {
  const model = modelFor(eq);
  return model ? getCategory(model.categoryId) : undefined;
};

/** "GE Healthcare Voluson E10" — manufacturer + model name. */
export function equipmentName(eq: Equipment): string {
  const model = modelFor(eq);
  if (!model) return eq.serialNumber;
  const mfr = getManufacturer(model.manufacturerId);
  return mfr ? `${mfr.name} ${model.modelName}` : model.modelName;
}

export function categoryName(eq: Equipment): string {
  return categoryFor(eq)?.name ?? 'Uncategorised';
}

export const contractsFor = (equipmentId: string) =>
  contracts.filter((c) => c.coveredEquipmentIds.includes(equipmentId));

export const pmScheduleFor = (equipmentId: string) =>
  pmSchedules.find((p) => p.equipmentId === equipmentId);

export const calibrationsFor = (equipmentId: string) =>
  calibrationRecords
    .filter((c) => c.equipmentId === equipmentId)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

export const authorisationFor = (equipmentId: string) =>
  continuedUseAuthorisations.find((a) => a.equipmentId === equipmentId);

export const condemnationFor = (equipmentId: string) =>
  condemnationRecords.find((c) => c.equipmentId === equipmentId);

export const sessionsFor = (equipmentId: string) =>
  usageSessions
    .filter((s) => s.equipmentId === equipmentId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

export const ticketsFor = (equipmentId: string) =>
  tickets
    .filter((t) => t.equipmentId === equipmentId)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

export const workOrdersFor = (equipmentId: string) =>
  workOrders
    .filter((w) => w.equipmentId === equipmentId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

export const documentsFor = (equipmentId: string) =>
  equipmentDocuments.filter((d) => d.equipmentId === equipmentId);

export const accessoriesFor = (equipmentId: string) =>
  accessories
    .filter((a) => a.equipmentId === equipmentId)
    .sort((a, b) => a.installedAt.localeCompare(b.installedAt));

export const activityFor = (equipmentId: string) =>
  activityEvents
    .filter((a) => a.equipmentId === equipmentId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
