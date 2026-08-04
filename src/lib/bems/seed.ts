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
  Facility, Building, Floor, Department, Room, FacilityContact, NotificationPreference,
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
  address: '14 Wardha Road, Dhantoli, Nagpur, Maharashtra 440012',
  bedCount: 260,
  city: 'Nagpur',
  state: 'Maharashtra',
  nabhAccredited: true,
};

export const buildings: Building[] = [
  { id: 'bld-main', facilityId: 'fac-smh', name: 'Main Block', floors: 6 },
];

export const floors: Floor[] = [
  { id: 'floor-0', buildingId: 'bld-main', number: 0, name: 'Ground Floor' },
  { id: 'floor-1', buildingId: 'bld-main', number: 1, name: '1st Floor' },
  { id: 'floor-2', buildingId: 'bld-main', number: 2, name: '2nd Floor' },
  { id: 'floor-3', buildingId: 'bld-main', number: 3, name: '3rd Floor' },
  { id: 'floor-4', buildingId: 'bld-main', number: 4, name: '4th Floor' },
  { id: 'floor-5', buildingId: 'bld-main', number: 5, name: '5th Floor' },
];

export const departments: Department[] = [
  { id: 'dept-rad', facilityId: 'fac-smh', name: 'Radiology', buildingId: 'bld-main', floor: 1 },
  { id: 'dept-icu', facilityId: 'fac-smh', name: 'ICU', buildingId: 'bld-main', floor: 3 },
  { id: 'dept-er', facilityId: 'fac-smh', name: 'Emergency', buildingId: 'bld-main', floor: 0 },
  { id: 'dept-dial', facilityId: 'fac-smh', name: 'Dialysis', buildingId: 'bld-main', floor: 2 },
  { id: 'dept-cardio', facilityId: 'fac-smh', name: 'Cardiology', buildingId: 'bld-main', floor: 4 },
  { id: 'dept-ot', facilityId: 'fac-smh', name: 'OT', buildingId: 'bld-main', floor: 5 },
  { id: 'dept-cssd', facilityId: 'fac-smh', name: 'CSSD', buildingId: 'bld-main', floor: 0 },
  { id: 'dept-nicu', facilityId: 'fac-smh', name: 'NICU', buildingId: 'bld-main', floor: 2 },
  { id: 'dept-lab', facilityId: 'fac-smh', name: 'Laboratory', buildingId: 'bld-main', floor: 0 },
];

export const rooms: Room[] = [
  { id: 'room-rad1', departmentId: 'dept-rad', name: 'Ultrasound Room 1', floor: 1 },
  { id: 'room-rad2', departmentId: 'dept-rad', name: 'X-Ray Room', floor: 1 },
  { id: 'room-rad3', departmentId: 'dept-rad', name: 'CT Suite', floor: 1 },
  { id: 'room-icu1', departmentId: 'dept-icu', name: 'ICU Bay 3', floor: 3 },
  { id: 'room-icu2', departmentId: 'dept-icu', name: 'ICU Bay 4', floor: 3 },
  { id: 'room-er1', departmentId: 'dept-er', name: 'Resus Bay', floor: 0 },
  { id: 'room-dial1', departmentId: 'dept-dial', name: 'Dialysis Unit 1', floor: 2 },
  { id: 'room-cardio1', departmentId: 'dept-cardio', name: 'ECG Room', floor: 4 },
  { id: 'room-ot1', departmentId: 'dept-ot', name: 'OT 1', floor: 5 },
  { id: 'room-ot2', departmentId: 'dept-ot', name: 'OT 2', floor: 5 },
  { id: 'room-cssd1', departmentId: 'dept-cssd', name: 'Sterilization Bay', floor: 0 },
  { id: 'room-nicu1', departmentId: 'dept-nicu', name: 'NICU Bay 1', floor: 2 },
  { id: 'room-lab1', departmentId: 'dept-lab', name: 'Analyzer Bay', floor: 0 },
];

/** Defaults to the admin — same "same as admin" behaviour as the signup flow's contact step. */
export const facilityContact: FacilityContact = {
  sameAsAdmin: true,
  role: 'Biomedical Admin',
};

export const notificationPreferences: NotificationPreference[] = [
  { alertType: 'BREAKDOWN_FLAGGED', enabled: true, channel: 'IN_APP' },
  { alertType: 'PM_DUE', enabled: true, channel: 'EMAIL' },
  { alertType: 'WARRANTY_EXPIRING', enabled: true, channel: 'EMAIL' },
  { alertType: 'APPROVAL_REQUESTS', enabled: true, channel: 'IN_APP' },
  { alertType: 'UNAPPROVED_USE', enabled: true, channel: 'WHATSAPP' },
];

// ─────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────

export const users: User[] = [
  { id: 'usr-admin', facilityId: 'fac-smh', name: 'Priya Deshmukh', role: 'ADMIN', designation: 'Biomedical Admin', phone: '+91 98230 11111', email: 'priya.deshmukh@smh.example' },
  { id: 'usr-eng', facilityId: 'fac-smh', name: 'Ramesh Kulkarni', role: 'ENGINEER', designation: 'Biomedical Engineer', phone: '+91 98230 22222', email: 'ramesh.kulkarni@smh.example' },
  { id: 'usr-staff1', facilityId: 'fac-smh', name: 'Ananya Rao', role: 'STAFF', designation: 'Staff Nurse', departmentId: 'dept-icu', phone: '+91 98230 33333', email: 'ananya.rao@smh.example' },
  { id: 'usr-staff2', facilityId: 'fac-smh', name: 'Vikram Shah', role: 'STAFF', designation: 'Staff Nurse', departmentId: 'dept-rad', phone: '+91 98230 44444', email: 'vikram.shah@smh.example' },
  { id: 'usr-eng2', facilityId: 'fac-smh', name: 'Sanjay Patil', role: 'ENGINEER', designation: 'Junior Biomedical Engineer', phone: '+91 98230 55556', email: 'sanjay.patil@smh.example' },
  { id: 'usr-staff3', facilityId: 'fac-smh', name: 'Meera Joshi', role: 'STAFF', designation: 'Staff Nurse', departmentId: 'dept-ot', phone: '+91 98230 66667', email: 'meera.joshi@smh.example' },
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
  { id: 'mfr-braun', name: 'B. Braun', country: 'Germany', supportPhone: '1800 103 5678' },
  { id: 'mfr-nihon', name: 'Nihon Kohden', country: 'Japan', supportPhone: '1800 419 2244' },
  { id: 'mfr-skanray', name: 'Skanray Technologies', country: 'India', supportPhone: '1800 425 7890' },
  { id: 'mfr-getinge', name: 'Getinge', country: 'Sweden', supportPhone: '1800 425 3201' },
  { id: 'mfr-radiometer', name: 'Radiometer', country: 'Denmark', supportPhone: '1800 419 6620' },
];

export const categories: EquipmentCategory[] = [
  { id: 'cat-ultrasound', name: 'Ultrasound', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 4 },
  { id: 'cat-ventilator', name: 'Ventilator', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 3, calibrationRequired: true, maxSessionHours: 72 },
  { id: 'cat-defib', name: 'Defibrillator', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 3, calibrationRequired: true, maxSessionHours: 1 },
  { id: 'cat-dialysis', name: 'Dialysis Machine', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 1, calibrationRequired: true, maxSessionHours: 6 },
  { id: 'cat-monitor', name: 'Patient Monitor', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'NONE', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 24 },
  { id: 'cat-xray', name: 'X-Ray Machine', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 2 },
  { id: 'cat-infusion', name: 'Infusion Pump', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 168 },
  { id: 'cat-ecg', name: 'ECG Machine', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 1 },
  { id: 'cat-anesthesia', name: 'Anesthesia Workstation', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 3, calibrationRequired: true, maxSessionHours: 12 },
  { id: 'cat-otlight', name: 'OT Light', defaultCriticality: 'NON_CRITICAL', defaultUsageTrackingMode: 'NONE', defaultPmIntervalMonths: 12, calibrationRequired: false, maxSessionHours: 24 },
  { id: 'cat-ct', name: 'CT Scanner', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 2 },
  { id: 'cat-autoclave', name: 'Autoclave/Sterilizer', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'NONE', defaultPmIntervalMonths: 3, calibrationRequired: true, maxSessionHours: 4 },
  { id: 'cat-incubator', name: 'Neonatal Incubator', defaultCriticality: 'CRITICAL', defaultUsageTrackingMode: 'NONE', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 720 },
  { id: 'cat-carm', name: 'C-Arm Fluoroscopy', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'SESSION_TIMER', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 2 },
  { id: 'cat-bga', name: 'Blood Gas Analyzer', defaultCriticality: 'SEMI_CRITICAL', defaultUsageTrackingMode: 'NONE', defaultPmIntervalMonths: 6, calibrationRequired: true, maxSessionHours: 24 },
  { id: 'cat-suction', name: 'Suction Machine', defaultCriticality: 'NON_CRITICAL', defaultUsageTrackingMode: 'NONE', defaultPmIntervalMonths: 12, calibrationRequired: false, maxSessionHours: 24 },
];

export const models: EquipmentModel[] = [
  { id: 'model-ultrasound-ge', manufacturerId: 'mfr-ge', categoryId: 'cat-ultrasound', modelName: 'Voluson E10', expectedServiceLifeYears: 10, typicalAccessories: ['Convex probe', 'Linear probe'] },
  { id: 'model-vent-drager', manufacturerId: 'mfr-drager', categoryId: 'cat-ventilator', modelName: 'Evita V500', expectedServiceLifeYears: 12, typicalAccessories: ['Breathing circuit', 'Flow sensor'] },
  { id: 'model-defib-philips', manufacturerId: 'mfr-philips', categoryId: 'cat-defib', modelName: 'HeartStart XL+', expectedServiceLifeYears: 10, typicalAccessories: ['Paddles', 'ECG cable'] },
  { id: 'model-dialysis-bpl', manufacturerId: 'mfr-bpl', categoryId: 'cat-dialysis', modelName: 'Nephro 9000', expectedServiceLifeYears: 8, typicalAccessories: ['Dialyzer holder', 'Blood tubing set'] },
  { id: 'model-monitor-philips', manufacturerId: 'mfr-philips', categoryId: 'cat-monitor', modelName: 'IntelliVue MX450', expectedServiceLifeYears: 7, typicalAccessories: ['SpO2 sensor', 'NIBP cuff'] },
  { id: 'model-xray-ge', manufacturerId: 'mfr-ge', categoryId: 'cat-xray', modelName: 'Optima XR220', expectedServiceLifeYears: 12, typicalAccessories: ['Detector panel'] },
  { id: 'model-infusion-braun', manufacturerId: 'mfr-braun', categoryId: 'cat-infusion', modelName: 'Perfusor Space', expectedServiceLifeYears: 8, typicalAccessories: ['Syringe holder', 'Battery pack'] },
  { id: 'model-ecg-nihon', manufacturerId: 'mfr-nihon', categoryId: 'cat-ecg', modelName: 'ECG-2550', expectedServiceLifeYears: 8, typicalAccessories: ['Lead cable set', 'Chest electrodes'] },
  { id: 'model-anesthesia-drager', manufacturerId: 'mfr-drager', categoryId: 'cat-anesthesia', modelName: 'Perseus A500', expectedServiceLifeYears: 12, typicalAccessories: ['Breathing circuit', 'Vaporizer'] },
  { id: 'model-otlight-skanray', manufacturerId: 'mfr-skanray', categoryId: 'cat-otlight', modelName: 'Solitaire 500', expectedServiceLifeYears: 15, typicalAccessories: ['Handle grip', 'Bulb module'] },
  { id: 'model-ct-ge', manufacturerId: 'mfr-ge', categoryId: 'cat-ct', modelName: 'Revolution ACT', expectedServiceLifeYears: 10, typicalAccessories: ['Table pad', 'Contrast injector'] },
  { id: 'model-autoclave-getinge', manufacturerId: 'mfr-getinge', categoryId: 'cat-autoclave', modelName: 'GSS67H', expectedServiceLifeYears: 15, typicalAccessories: ['Sterilization tray', 'Door gasket'] },
  { id: 'model-incubator-drager', manufacturerId: 'mfr-drager', categoryId: 'cat-incubator', modelName: 'Caleo', expectedServiceLifeYears: 10, typicalAccessories: ['Mattress', 'Humidity sensor'] },
  { id: 'model-carm-ge', manufacturerId: 'mfr-ge', categoryId: 'cat-carm', modelName: 'OEC 9900 Elite', expectedServiceLifeYears: 10, typicalAccessories: ['Image intensifier', 'Foot pedal'] },
  { id: 'model-bga-radiometer', manufacturerId: 'mfr-radiometer', categoryId: 'cat-bga', modelName: 'ABL800 Flex', expectedServiceLifeYears: 8, typicalAccessories: ['Sensor cassette', 'Calibration gas pack'] },
  { id: 'model-suction-skanray', manufacturerId: 'mfr-skanray', categoryId: 'cat-suction', modelName: 'Suction Pro 30', expectedServiceLifeYears: 8, typicalAccessories: ['Collection jar', 'Suction tubing'] },
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
  {
    id: 'eq-infusion-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/ICU/0031',
    qrToken: 'MRV-7C55A9',
    equipmentModelId: 'model-infusion-braun',
    serialNumber: 'BRIP-2024-11029',
    yearOfManufacture: 2024,
    dateOfPurchase: '2024-02-10',
    dateOfInstallation: '2024-02-14',
    dateOfAcceptance: '2024-02-15',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 260000,
    departmentId: 'dept-icu',
    roomId: 'room-icu2',
    responsibleUserId: 'usr-staff1',
    criticality: 'CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 2640,
    createdAt: '2024-02-10T09:00:00+05:30',
  },
  {
    id: 'eq-ecg-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/CARD/0009',
    qrToken: 'MRV-2F91D6',
    equipmentModelId: 'model-ecg-nihon',
    serialNumber: 'NKECG-2022-56110',
    yearOfManufacture: 2022,
    dateOfPurchase: '2022-08-18',
    dateOfInstallation: '2022-08-20',
    dateOfAcceptance: '2022-08-22',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 210000,
    departmentId: 'dept-cardio',
    roomId: 'room-cardio1',
    responsibleUserId: 'usr-eng',
    criticality: 'SEMI_CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 980,
    createdAt: '2022-08-18T09:00:00+05:30',
  },
  {
    id: 'eq-anesthesia-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/OT/0004',
    qrToken: 'MRV-4A83C1',
    equipmentModelId: 'model-anesthesia-drager',
    serialNumber: 'DRAW-2021-88750',
    yearOfManufacture: 2021,
    dateOfPurchase: '2021-09-05',
    dateOfInstallation: '2021-09-10',
    dateOfAcceptance: '2021-09-12',
    dealerVendorId: 'ven-oem-ge',
    purchaseCost: 1800000,
    departmentId: 'dept-ot',
    roomId: 'room-ot1',
    responsibleUserId: 'usr-eng',
    criticality: 'CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 1210,
    createdAt: '2021-09-05T09:00:00+05:30',
  },
  {
    id: 'eq-otlight-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/OT/0011',
    qrToken: 'MRV-8D24E7',
    equipmentModelId: 'model-otlight-skanray',
    serialNumber: 'SKOL-2020-30456',
    yearOfManufacture: 2020,
    dateOfPurchase: '2020-11-02',
    dateOfInstallation: '2020-11-06',
    dateOfAcceptance: '2020-11-08',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 480000,
    departmentId: 'dept-ot',
    roomId: 'room-ot1',
    responsibleUserId: 'usr-eng',
    criticality: 'NON_CRITICAL',
    usageTrackingMode: 'NONE',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 0,
    createdAt: '2020-11-02T09:00:00+05:30',
  },
  // The additions below broaden fleet coverage across imaging, sterile
  // services, neonatal, and lab equipment categories.
  {
    id: 'eq-ct-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/RAD/0018',
    qrToken: 'MRV-9F02C8',
    equipmentModelId: 'model-ct-ge',
    serialNumber: 'GECT-2023-77410',
    yearOfManufacture: 2023,
    dateOfPurchase: '2023-05-10',
    dateOfInstallation: '2023-05-25',
    dateOfAcceptance: '2023-05-28',
    dealerVendorId: 'ven-oem-ge',
    purchaseCost: 9500000,
    departmentId: 'dept-rad',
    roomId: 'room-rad3',
    responsibleUserId: 'usr-eng',
    criticality: 'CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 3120,
    createdAt: '2023-05-10T09:00:00+05:30',
  },
  {
    id: 'eq-autoclave-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/CSSD/0001',
    qrToken: 'MRV-3D71A0',
    equipmentModelId: 'model-autoclave-getinge',
    serialNumber: 'GTA-2022-19004',
    yearOfManufacture: 2022,
    dateOfPurchase: '2022-03-01',
    dateOfInstallation: '2022-03-08',
    dateOfAcceptance: '2022-03-10',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 1250000,
    departmentId: 'dept-cssd',
    roomId: 'room-cssd1',
    responsibleUserId: 'usr-eng2',
    criticality: 'SEMI_CRITICAL',
    usageTrackingMode: 'NONE',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 0,
    createdAt: '2022-03-01T09:00:00+05:30',
  },
  {
    id: 'eq-incubator-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/NICU/0002',
    qrToken: 'MRV-6A48E2',
    equipmentModelId: 'model-incubator-drager',
    serialNumber: 'DRIC-2023-50281',
    yearOfManufacture: 2023,
    dateOfPurchase: '2023-08-15',
    dateOfInstallation: '2023-08-20',
    dateOfAcceptance: '2023-08-22',
    dealerVendorId: 'ven-oem-ge',
    purchaseCost: 850000,
    departmentId: 'dept-nicu',
    roomId: 'room-nicu1',
    responsibleUserId: 'usr-eng',
    criticality: 'CRITICAL',
    usageTrackingMode: 'NONE',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 0,
    createdAt: '2023-08-15T09:00:00+05:30',
  },
  {
    id: 'eq-carm-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/OT/0015',
    qrToken: 'MRV-7B39D4',
    equipmentModelId: 'model-carm-ge',
    serialNumber: 'GEOEC-2020-60193',
    yearOfManufacture: 2020,
    dateOfPurchase: '2020-06-01',
    dateOfInstallation: '2020-06-10',
    dateOfAcceptance: '2020-06-12',
    dealerVendorId: 'ven-oem-ge',
    purchaseCost: 4200000,
    departmentId: 'dept-ot',
    roomId: 'room-ot2',
    responsibleUserId: 'usr-eng',
    criticality: 'SEMI_CRITICAL',
    usageTrackingMode: 'SESSION_TIMER',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 1560,
    createdAt: '2020-06-01T09:00:00+05:30',
  },
  {
    id: 'eq-bga-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/LAB/0006',
    qrToken: 'MRV-5C84F1',
    equipmentModelId: 'model-bga-radiometer',
    serialNumber: 'RADBGA-2024-30077',
    yearOfManufacture: 2024,
    dateOfPurchase: '2024-01-10',
    dateOfInstallation: '2024-01-15',
    dateOfAcceptance: '2024-01-16',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 1650000,
    departmentId: 'dept-lab',
    roomId: 'room-lab1',
    responsibleUserId: 'usr-eng2',
    criticality: 'SEMI_CRITICAL',
    usageTrackingMode: 'NONE',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 0,
    createdAt: '2024-01-10T09:00:00+05:30',
  },
  {
    id: 'eq-suction-001',
    facilityId: 'fac-smh',
    assetId: 'SMH/ER/0010',
    qrToken: 'MRV-1F26B8',
    equipmentModelId: 'model-suction-skanray',
    serialNumber: 'SKSC-2021-40033',
    yearOfManufacture: 2021,
    dateOfPurchase: '2021-04-05',
    dateOfInstallation: '2021-04-08',
    dateOfAcceptance: '2021-04-10',
    dealerVendorId: 'ven-dealer-medisales',
    purchaseCost: 95000,
    departmentId: 'dept-er',
    roomId: 'room-er1',
    responsibleUserId: 'usr-eng',
    criticality: 'NON_CRITICAL',
    usageTrackingMode: 'NONE',
    financialStatus: 'ACTIVE_ASSET',
    operationalStatus: 'IN_SERVICE',
    cumulativeUsageHours: 0,
    createdAt: '2021-04-05T09:00:00+05:30',
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
  {
    id: 'acc-defib-paddles', equipmentId: 'eq-defib-001', accessoryId: 'SMH/ER/0003-A1',
    name: 'Paddles', serialNumber: 'PHDP-2021-114', status: 'IN_USE', source: 'OEM',
    partWarrantyUntil: '2026-08-05', installedAt: '2021-06-12',
  },
  {
    id: 'acc-vent-circuit', equipmentId: 'eq-vent-001', accessoryId: 'SMH/ICU/0012-A1',
    name: 'Breathing circuit', serialNumber: 'DRBC-2023-902', status: 'IN_USE', source: 'OEM',
    installedAt: '2023-11-05',
  },
  {
    id: 'acc-anesthesia-circuit', equipmentId: 'eq-anesthesia-001', accessoryId: 'SMH/OT/0004-A1',
    name: 'Breathing circuit', serialNumber: 'DRAC-2021-330', status: 'REPLACED', source: 'OEM',
    installedAt: '2021-09-10', removedAt: '2025-01-20', removalReason: 'Perished tubing on inspection',
  },
  {
    id: 'acc-anesthesia-circuit-2', equipmentId: 'eq-anesthesia-001', accessoryId: 'SMH/OT/0004-A2',
    name: 'Breathing circuit', serialNumber: 'DRAC-2025-055', status: 'IN_USE', source: 'OEM',
    replacedAccessoryId: 'acc-anesthesia-circuit', installedAt: '2025-01-22',
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
  { id: 'doc-vent-004', equipmentId: 'eq-vent-001', type: 'INSURANCE', label: 'Equipment insurance policy', fileName: 'insurance-policy-vent-001.pdf', fileSizeKb: 145, uploadedByUserId: 'usr-eng', uploadedAt: '2026-05-01', expiryDate: '2027-05-01' },

  { id: 'doc-defib-001', equipmentId: 'eq-defib-001', type: 'MANUAL', fileName: 'HeartStart-XL-manual.pdf', fileSizeKb: 3340, uploadedByUserId: 'usr-eng', uploadedAt: '2021-06-14' },
  { id: 'doc-defib-002', equipmentId: 'eq-defib-001', type: 'INVOICE', fileName: 'invoice-PHD-2021-77012.pdf', fileSizeKb: 175, uploadedByUserId: 'usr-eng', uploadedAt: '2021-06-10' },
  { id: 'doc-defib-003', equipmentId: 'eq-defib-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-defib-001.pdf', fileSizeKb: 160, uploadedByUserId: 'usr-eng', uploadedAt: '2021-06-14' },

  { id: 'doc-dialysis-001', equipmentId: 'eq-dialysis-001', type: 'INVOICE', fileName: 'invoice-BPLD-2022-10044.pdf', fileSizeKb: 205, uploadedByUserId: 'usr-eng', uploadedAt: '2022-05-20' },
  { id: 'doc-dialysis-002', equipmentId: 'eq-dialysis-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-dialysis-001.pdf', fileSizeKb: 170, uploadedByUserId: 'usr-eng', uploadedAt: '2022-05-28' },
  { id: 'doc-dialysis-003', equipmentId: 'eq-dialysis-001', type: 'INSURANCE', label: 'Equipment insurance policy', fileName: 'insurance-policy-dialysis-001.pdf', fileSizeKb: 140, uploadedByUserId: 'usr-eng', uploadedAt: '2025-09-02', expiryDate: '2026-09-02' },

  { id: 'doc-monitor-001', equipmentId: 'eq-monitor-001', type: 'INVOICE', fileName: 'invoice-PHM-2020-55871.pdf', fileSizeKb: 190, uploadedByUserId: 'usr-eng', uploadedAt: '2020-09-01' },

  { id: 'doc-xray-001', equipmentId: 'eq-xray-001', type: 'MANUAL', fileName: 'Optima-XR220-manual.pdf', fileSizeKb: 5510, uploadedByUserId: 'usr-eng', uploadedAt: '2017-08-12' },
  { id: 'doc-xray-002', equipmentId: 'eq-xray-001', type: 'INVOICE', fileName: 'invoice-GEXR-2017-33009.pdf', fileSizeKb: 220, uploadedByUserId: 'usr-eng', uploadedAt: '2017-08-01' },
  { id: 'doc-xray-003', equipmentId: 'eq-xray-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-xray-001.pdf', fileSizeKb: 165, uploadedByUserId: 'usr-eng', uploadedAt: '2017-08-12' },
  { id: 'doc-xray-004', equipmentId: 'eq-xray-001', type: 'CERTIFICATION', label: 'AERB Radiological Safety Certification', fileName: 'aerb-certificate-xray-001.pdf', fileSizeKb: 210, uploadedByUserId: 'usr-eng', uploadedAt: '2021-07-04', expiryDate: '2026-07-04' },

  { id: 'doc-infusion-001', equipmentId: 'eq-infusion-001', type: 'MANUAL', fileName: 'Perfusor-Space-manual.pdf', fileSizeKb: 2980, uploadedByUserId: 'usr-eng', uploadedAt: '2024-02-15' },
  { id: 'doc-infusion-002', equipmentId: 'eq-infusion-001', type: 'INVOICE', fileName: 'invoice-BRIP-2024-11029.pdf', fileSizeKb: 150, uploadedByUserId: 'usr-eng', uploadedAt: '2024-02-10' },
  { id: 'doc-infusion-003', equipmentId: 'eq-infusion-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-infusion-001.pdf', fileSizeKb: 140, uploadedByUserId: 'usr-eng', uploadedAt: '2024-02-15' },

  { id: 'doc-ecg-001', equipmentId: 'eq-ecg-001', type: 'INVOICE', fileName: 'invoice-NKECG-2022-56110.pdf', fileSizeKb: 165, uploadedByUserId: 'usr-eng', uploadedAt: '2022-08-18' },

  { id: 'doc-anesthesia-001', equipmentId: 'eq-anesthesia-001', type: 'MANUAL', fileName: 'Perseus-A500-manual.pdf', fileSizeKb: 7340, uploadedByUserId: 'usr-eng', uploadedAt: '2021-09-12' },
  { id: 'doc-anesthesia-002', equipmentId: 'eq-anesthesia-001', type: 'INVOICE', fileName: 'invoice-DRAW-2021-88750.pdf', fileSizeKb: 230, uploadedByUserId: 'usr-eng', uploadedAt: '2021-09-05' },
  { id: 'doc-anesthesia-003', equipmentId: 'eq-anesthesia-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-anesthesia-001.pdf', fileSizeKb: 175, uploadedByUserId: 'usr-eng', uploadedAt: '2021-09-12' },
  { id: 'doc-anesthesia-004', equipmentId: 'eq-anesthesia-001', type: 'INSURANCE', label: 'Equipment insurance policy', fileName: 'insurance-policy-anesthesia-001.pdf', fileSizeKb: 150, uploadedByUserId: 'usr-eng', uploadedAt: '2026-05-31', expiryDate: '2027-05-31' },
  // OT Light deliberately has no documents on file yet — keeps the Docs column's red/amber spread realistic.

  // New fleet additions — certification/insurance tracking examples
  { id: 'doc-ct-001', equipmentId: 'eq-ct-001', type: 'MANUAL', fileName: 'Revolution-ACT-manual.pdf', fileSizeKb: 8420, uploadedByUserId: 'usr-eng', uploadedAt: '2023-05-28' },
  { id: 'doc-ct-002', equipmentId: 'eq-ct-001', type: 'INVOICE', fileName: 'invoice-GECT-2023-77410.pdf', fileSizeKb: 240, uploadedByUserId: 'usr-eng', uploadedAt: '2023-05-10' },
  { id: 'doc-ct-003', equipmentId: 'eq-ct-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-ct-001.pdf', fileSizeKb: 185, uploadedByUserId: 'usr-eng', uploadedAt: '2023-05-28' },
  { id: 'doc-ct-004', equipmentId: 'eq-ct-001', type: 'CERTIFICATION', label: 'AERB Radiological Safety Certification', fileName: 'aerb-certificate-ct-001.pdf', fileSizeKb: 220, uploadedByUserId: 'usr-eng', uploadedAt: '2023-09-15', expiryDate: '2026-09-15' },
  { id: 'doc-ct-005', equipmentId: 'eq-ct-001', type: 'INSURANCE', label: 'Equipment insurance policy', fileName: 'insurance-policy-ct-001.pdf', fileSizeKb: 155, uploadedByUserId: 'usr-eng', uploadedAt: '2026-03-01', expiryDate: '2027-03-01' },

  { id: 'doc-autoclave-001', equipmentId: 'eq-autoclave-001', type: 'MANUAL', fileName: 'GSS67H-manual.pdf', fileSizeKb: 3120, uploadedByUserId: 'usr-eng2', uploadedAt: '2022-03-10' },
  { id: 'doc-autoclave-002', equipmentId: 'eq-autoclave-001', type: 'INVOICE', fileName: 'invoice-GTA-2022-19004.pdf', fileSizeKb: 175, uploadedByUserId: 'usr-eng2', uploadedAt: '2022-03-01' },
  { id: 'doc-autoclave-003', equipmentId: 'eq-autoclave-001', type: 'CERTIFICATION', label: 'IBR Pressure Vessel Safety Certificate', fileName: 'ibr-certificate-autoclave-001.pdf', fileSizeKb: 190, uploadedByUserId: 'usr-eng2', uploadedAt: '2026-01-15', expiryDate: '2027-01-15' },

  { id: 'doc-incubator-001', equipmentId: 'eq-incubator-001', type: 'MANUAL', fileName: 'Caleo-manual.pdf', fileSizeKb: 4210, uploadedByUserId: 'usr-eng', uploadedAt: '2023-08-22' },
  { id: 'doc-incubator-002', equipmentId: 'eq-incubator-001', type: 'INVOICE', fileName: 'invoice-DRIC-2023-50281.pdf', fileSizeKb: 200, uploadedByUserId: 'usr-eng', uploadedAt: '2023-08-15' },
  { id: 'doc-incubator-003', equipmentId: 'eq-incubator-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-incubator-001.pdf', fileSizeKb: 160, uploadedByUserId: 'usr-eng', uploadedAt: '2023-08-22' },
  // No certification/insurance on file yet — keeps the Certifications column's "—" case realistic.

  { id: 'doc-carm-001', equipmentId: 'eq-carm-001', type: 'MANUAL', fileName: 'OEC-9900-Elite-manual.pdf', fileSizeKb: 5340, uploadedByUserId: 'usr-eng', uploadedAt: '2020-06-12' },
  { id: 'doc-carm-002', equipmentId: 'eq-carm-001', type: 'INVOICE', fileName: 'invoice-GEOEC-2020-60193.pdf', fileSizeKb: 225, uploadedByUserId: 'usr-eng', uploadedAt: '2020-06-01' },
  { id: 'doc-carm-003', equipmentId: 'eq-carm-001', type: 'WARRANTY_CARD', fileName: 'warranty-card-carm-001.pdf', fileSizeKb: 170, uploadedByUserId: 'usr-eng', uploadedAt: '2020-06-12' },
  { id: 'doc-carm-004', equipmentId: 'eq-carm-001', type: 'CERTIFICATION', label: 'AERB Radiological Safety Certification', fileName: 'aerb-certificate-carm-001.pdf', fileSizeKb: 205, uploadedByUserId: 'usr-eng', uploadedAt: '2021-07-19', expiryDate: '2026-07-19' },

  { id: 'doc-bga-001', equipmentId: 'eq-bga-001', type: 'MANUAL', fileName: 'ABL800-Flex-manual.pdf', fileSizeKb: 2860, uploadedByUserId: 'usr-eng2', uploadedAt: '2024-01-16' },
  { id: 'doc-bga-002', equipmentId: 'eq-bga-001', type: 'INVOICE', fileName: 'invoice-RADBGA-2024-30077.pdf', fileSizeKb: 180, uploadedByUserId: 'usr-eng2', uploadedAt: '2024-01-10' },
  { id: 'doc-bga-003', equipmentId: 'eq-bga-001', type: 'INSURANCE', label: 'Equipment insurance policy', fileName: 'insurance-policy-bga-001.pdf', fileSizeKb: 135, uploadedByUserId: 'usr-eng2', uploadedAt: '2026-03-31', expiryDate: '2027-03-31' },

  { id: 'doc-suction-001', equipmentId: 'eq-suction-001', type: 'INVOICE', fileName: 'invoice-SKSC-2021-40033.pdf', fileSizeKb: 110, uploadedByUserId: 'usr-eng', uploadedAt: '2021-04-05' },
  // No certification/insurance on file yet.
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
  {
    id: 'ctr-infusion-warranty', facilityId: 'fac-smh', vendorId: 'ven-dealer-medisales', type: 'WARRANTY',
    contractNumber: 'WAR-2024-3301', startDate: '2024-02-10', endDate: '2027-02-10',
    annualCost: 0, coverageNotes: 'OEM standard warranty', responseSlaHours: 24,
    resolutionSlaHours: 72, coveredEquipmentIds: ['eq-infusion-001'],
  },
  {
    id: 'ctr-anesthesia-amc', facilityId: 'fac-smh', vendorId: 'ven-amc-carewell', type: 'AMC',
    contractNumber: 'AMC-2026-0072', startDate: '2026-01-01', endDate: '2026-12-31',
    annualCost: 240000, coverageNotes: 'Comprehensive — parts and labour', responseSlaHours: 4,
    resolutionSlaHours: 24, coveredEquipmentIds: ['eq-anesthesia-001'],
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
  { id: 'pm-infusion-001', equipmentId: 'eq-infusion-001', triggerType: 'WHICHEVER_FIRST', intervalMonths: 6, intervalUsageHours: 3000, lastPerformedAt: '2026-05-01', lastPerformedAtHours: 2200, nextDueDate: '2026-11-01', nextDueHours: 3000, checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-ecg-001', equipmentId: 'eq-ecg-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-05-10', nextDueDate: '2026-11-10', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-anesthesia-001', equipmentId: 'eq-anesthesia-001', triggerType: 'CALENDAR', intervalMonths: 3, lastPerformedAt: '2026-03-01', nextDueDate: '2026-06-01', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-otlight-001', equipmentId: 'eq-otlight-001', triggerType: 'CALENDAR', intervalMonths: 12, lastPerformedAt: '2026-01-01', nextDueDate: '2027-01-01', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-ct-001', equipmentId: 'eq-ct-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-02-10', nextDueDate: '2026-08-10', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-autoclave-001', equipmentId: 'eq-autoclave-001', triggerType: 'CALENDAR', intervalMonths: 3, lastPerformedAt: '2026-05-01', nextDueDate: '2026-08-01', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-incubator-001', equipmentId: 'eq-incubator-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-03-20', nextDueDate: '2026-09-20', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-carm-001', equipmentId: 'eq-carm-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-04-15', nextDueDate: '2026-10-15', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-bga-001', equipmentId: 'eq-bga-001', triggerType: 'CALENDAR', intervalMonths: 6, lastPerformedAt: '2026-04-01', nextDueDate: '2026-10-01', checklistTemplateId: 'chk-generic-pm' },
  { id: 'pm-suction-001', equipmentId: 'eq-suction-001', triggerType: 'CALENDAR', intervalMonths: 12, lastPerformedAt: '2026-01-10', nextDueDate: '2027-01-10', checklistTemplateId: 'chk-generic-pm' },
];

export const calibrationRecords: CalibrationRecord[] = [
  { id: 'cal-us-001', equipmentId: 'eq-us-001', performedByUserId: 'usr-eng', performedAt: '2026-06-01', validUntil: '2027-06-01', passed: true, accuracyNotes: 'Within tolerance', certificateNumber: 'CAL-2026-0091' },
  { id: 'cal-vent-001', equipmentId: 'eq-vent-001', performedByVendorId: 'ven-amc-carewell', performedAt: '2026-01-10', validUntil: '2027-01-10', passed: true, accuracyNotes: 'Flow and pressure sensors within spec', certificateNumber: 'CAL-2026-0014' },
  { id: 'cal-defib-001', equipmentId: 'eq-defib-001', performedByUserId: 'usr-eng', performedAt: '2025-08-05', validUntil: '2026-08-05', passed: true, accuracyNotes: 'Energy delivery accurate', certificateNumber: 'CAL-2025-0203' },
  { id: 'cal-monitor-001', equipmentId: 'eq-monitor-001', performedByVendorId: 'ven-oem-ge', performedAt: '2025-08-15', validUntil: '2026-08-15', passed: true, accuracyNotes: 'NIBP and SpO2 within spec', certificateNumber: 'CAL-2025-0219' },
  { id: 'cal-xray-001', equipmentId: 'eq-xray-001', performedByVendorId: 'ven-oem-ge', performedAt: '2025-07-01', validUntil: '2026-07-01', passed: true, accuracyNotes: 'Detector output within spec at time of test', certificateNumber: 'CAL-2025-0177' },
  { id: 'cal-ecg-001', equipmentId: 'eq-ecg-001', performedByUserId: 'usr-eng', performedAt: '2026-02-15', validUntil: '2027-02-15', passed: true, accuracyNotes: 'Lead signal accuracy within spec', certificateNumber: 'CAL-2026-0032' },
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
  {
    // Pending — populates the Approvals page's "Condemnation approvals" queue.
    id: 'cnd-xray-001', equipmentId: 'eq-xray-001', requestedByUserId: 'usr-eng',
    justification: '9-year-old detector panel repeatedly failing calibration; repair cost this year alone exceeds replacement threshold.',
    breakdownCountLast12m: 2, repairCostLast12m: 410000,
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
    id: 'tkt-infusion-001', ticketNumber: 'TKT-2026-0071', equipmentId: 'eq-infusion-001', raisedByUserId: 'usr-staff1',
    source: 'SCAN_BREAKDOWN', issueType: 'Occlusion alarm stuck', description: 'Alarm keeps firing even after the line is cleared.',
    priority: 'HIGH', status: 'CLOSED', runtimeHoursAtFailure: 2600,
    openedAt: '2026-06-10T10:00:00+05:30', assignedAt: '2026-06-10T11:00:00+05:30',
    resolvedAt: '2026-06-10T14:30:00+05:30', closedAt: '2026-06-11T09:00:00+05:30',
    slaDueAt: '2026-06-11T10:00:00+05:30', slaBreached: false, downtimeHours: 4.5,
    acknowledgedByUserId: 'usr-staff1',
  },
  {
    id: 'tkt-ecg-001', ticketNumber: 'TKT-2026-0098', equipmentId: 'eq-ecg-001', raisedByUserId: 'usr-eng',
    source: 'MANUAL', issueType: 'Chest lead intermittent', description: 'One chest lead drops signal during longer traces.',
    priority: 'NORMAL', status: 'ASSIGNED',
    openedAt: '2026-07-24T09:00:00+05:30', assignedAt: '2026-07-24T09:30:00+05:30',
    slaDueAt: '2026-07-26T09:00:00+05:30', slaBreached: false,
  },
  {
    id: 'tkt-anesthesia-001', ticketNumber: 'TKT-2026-0099', equipmentId: 'eq-anesthesia-001', raisedByUserId: 'usr-eng',
    source: 'MANUAL', issueType: 'Vaporizer reading drift', description: 'Vaporizer output reading drifting outside expected range; vendor called in.',
    priority: 'HIGH', status: 'PENDING_VENDOR',
    openedAt: '2026-07-21T12:00:00+05:30', assignedAt: '2026-07-21T13:00:00+05:30',
    slaDueAt: '2026-07-22T12:00:00+05:30', slaBreached: true,
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
  {
    id: 'wo-009', workOrderNumber: 'WO-2025-0142', equipmentId: 'eq-us-001', ticketId: 'tkt-us-001',
    type: 'CORRECTIVE', performedByUserId: 'usr-eng',
    startedAt: '2025-10-02T13:00:00+05:30', completedAt: '2025-10-04T16:00:00+05:30',
    findings: 'Display cable reseated, intermittent screen fault resolved.', labourCost: 1200, partsCost: 0,
  },
  {
    id: 'wo-010', workOrderNumber: 'WO-2026-0033', equipmentId: 'eq-us-001', ticketId: 'tkt-us-002',
    type: 'CORRECTIVE', performedByUserId: 'usr-eng',
    startedAt: '2026-02-08T14:00:00+05:30', completedAt: '2026-02-09T12:00:00+05:30',
    findings: 'Probe connector cleaned and reseated, detection restored.', labourCost: 900, partsCost: 0,
  },
  {
    id: 'wo-011', workOrderNumber: 'WO-2026-0072', equipmentId: 'eq-infusion-001', ticketId: 'tkt-infusion-001',
    type: 'CORRECTIVE', performedByUserId: 'usr-eng',
    startedAt: '2026-06-10T11:00:00+05:30', completedAt: '2026-06-10T14:30:00+05:30',
    findings: 'Occlusion sensor recalibrated, false alarms stopped.', labourCost: 600, partsCost: 0,
  },
  {
    id: 'wo-012', workOrderNumber: 'WO-2026-0100', equipmentId: 'eq-ecg-001', ticketId: 'tkt-ecg-001',
    type: 'CORRECTIVE', performedByUserId: 'usr-eng2',
    startedAt: '2026-07-24T09:30:00+05:30', findings: 'Checking chest lead cable continuity.',
    labourCost: 0, partsCost: 0,
  },
  {
    id: 'wo-013', workOrderNumber: 'WO-2026-0101', equipmentId: 'eq-anesthesia-001', ticketId: 'tkt-anesthesia-001',
    type: 'CORRECTIVE', vendorId: 'ven-amc-carewell',
    startedAt: '2026-07-21T13:00:00+05:30', findings: 'Vendor engineer scheduled to recalibrate vaporizer.',
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
  { id: 'ses-infusion-001', equipmentId: 'eq-infusion-001', userId: 'usr-staff1', sessionType: 'CLINICAL_USE', startedAt: '2026-06-15T08:00:00+05:30', endedAt: '2026-06-17T08:00:00+05:30', durationSeconds: 172800, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'GREEN', gateAcknowledged: false },
  { id: 'ses-infusion-002', equipmentId: 'eq-infusion-001', userId: 'usr-staff1', sessionType: 'CLINICAL_USE', startedAt: '2026-07-20T09:00:00+05:30', endedAt: '2026-07-20T21:00:00+05:30', durationSeconds: 43200, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'GREEN', gateAcknowledged: false },
  { id: 'ses-ecg-001', equipmentId: 'eq-ecg-001', userId: 'usr-staff1', sessionType: 'CLINICAL_USE', startedAt: '2026-07-24T09:35:00+05:30', endedAt: '2026-07-24T09:40:00+05:30', durationSeconds: 300, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'GREEN', gateAcknowledged: false },
  { id: 'ses-defib-001', equipmentId: 'eq-defib-001', userId: 'usr-staff2', sessionType: 'CLINICAL_USE', startedAt: '2026-07-15T11:00:00+05:30', endedAt: '2026-07-15T11:03:00+05:30', durationSeconds: 180, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'GREEN', gateAcknowledged: false },
  { id: 'ses-anesthesia-001', equipmentId: 'eq-anesthesia-001', userId: 'usr-eng', sessionType: 'CLINICAL_USE', startedAt: '2026-07-18T09:00:00+05:30', endedAt: '2026-07-18T13:00:00+05:30', durationSeconds: 14400, endReason: 'NORMAL', dataQuality: 'CONFIRMED', gateStateAtStart: 'AMBER', gateAcknowledged: true },
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
  { id: 'act-monitor-001', equipmentId: 'eq-monitor-001', eventType: 'MOVE_APPROVED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-23T16:00:00+05:30', summary: 'Philips Healthcare IntelliVue MX450 moved to Resus Bay, confirmed by Priya Deshmukh' },
  { id: 'act-monitor-002', equipmentId: 'eq-monitor-001', eventType: 'WORK_ORDER_CREATED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-23T15:05:00+05:30', summary: 'Ramesh Kulkarni assigned to WO-2026-0148 — SpO2 cable replacement' },
  { id: 'act-vent-001', equipmentId: 'eq-vent-001', eventType: 'WORK_ORDER_CREATED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-24T09:45:00+05:30', summary: 'Ramesh Kulkarni assigned to WO-2026-0150 — routine calibration' },
  { id: 'act-defib-001', equipmentId: 'eq-defib-001', eventType: 'PM_PERFORMED', actorUserId: 'usr-eng', actorSystem: false, occurredAt: '2026-07-24T10:10:00+05:30', summary: 'Routine PM check completed — all pass' },
  { id: 'act-dialysis-001', equipmentId: 'eq-dialysis-001', eventType: 'TICKET_OPENED', actorUserId: 'usr-staff1', actorSystem: false, occurredAt: '2026-07-24T08:00:00+05:30', summary: 'TKT-2026-0091 opened — unusual noise during cycle' },
  { id: 'act-infusion-001', equipmentId: 'eq-infusion-001', eventType: 'WORK_ORDER_CREATED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-06-10T11:00:00+05:30', summary: 'Ramesh Kulkarni assigned to WO-2026-0072 — occlusion alarm stuck' },
  { id: 'act-infusion-002', equipmentId: 'eq-infusion-001', eventType: 'TICKET_CLOSED', actorUserId: 'usr-staff1', actorSystem: false, occurredAt: '2026-06-11T09:00:00+05:30', summary: 'TKT-2026-0071 closed — occlusion sensor recalibrated' },
  { id: 'act-ecg-001', equipmentId: 'eq-ecg-001', eventType: 'WORK_ORDER_CREATED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-24T09:30:00+05:30', summary: 'Sanjay Patil assigned to WO-2026-0100 — chest lead intermittent' },
  { id: 'act-anesthesia-001', equipmentId: 'eq-anesthesia-001', eventType: 'WORK_ORDER_CREATED', actorUserId: 'usr-admin', actorSystem: false, occurredAt: '2026-07-21T13:00:00+05:30', summary: 'CareWell Biomedical Services assigned to WO-2026-0101 — vaporizer reading drift' },
];

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────

export const notifications: AppNotification[] = [
  { id: 'ntf-001', tier: 'IMMEDIATE', equipmentId: 'eq-xray-001', title: 'X-Ray Machine down — X-Ray Room', body: 'Flagged by Vikram Shah 25m into a session. Detector panel error.', createdAt: '2026-07-22T08:40:00+05:30', actionLabel: 'View ticket', actionHref: '/tickets/tkt-xray-001' },
  { id: 'ntf-002', tier: 'DAILY_DIGEST', title: 'PM due this week', body: '2 units have preventive maintenance due within 7 days.', createdAt: '2026-07-24T06:00:00+05:30' },
  { id: 'ntf-003', tier: 'IMMEDIATE', equipmentId: 'eq-anesthesia-001', title: 'Anesthesia Workstation — vaporizer drift flagged', body: 'CareWell Biomedical Services called in after the vaporizer reading drifted outside range.', createdAt: '2026-07-21T13:00:00+05:30', actionLabel: 'View ticket', actionHref: '/tickets/tkt-anesthesia-001' },
  { id: 'ntf-004', tier: 'IMMEDIATE', equipmentId: 'eq-xray-001', title: 'Condemnation request awaiting approval', body: 'Ramesh Kulkarni requested condemnation for the X-Ray Machine — 2 breakdowns and ₹4.1L repair cost this year.', createdAt: '2026-07-24T09:00:00+05:30', actionLabel: 'Review request', actionHref: '/jobs?tab=approvals' },
  { id: 'ntf-005', tier: 'DAILY_DIGEST', title: 'Movement flagged unapproved', body: 'The Infusion Pump move to ICU Bay 3 is still awaiting sign-off.', createdAt: '2026-07-23T18:00:00+05:30', actionLabel: 'Review move', actionHref: '/jobs?tab=approvals' },
  { id: 'ntf-006', tier: 'WEEKLY_DIGEST', title: 'Warranty expiring this month', body: '3 contracts expire within 90 days — review renewals.', createdAt: '2026-07-20T06:00:00+05:30' },
];

export const movementRequests: MovementRequest[] = [
  {
    id: 'mv-monitor-001', equipmentId: 'eq-monitor-001', initiatedByUserId: 'usr-staff1',
    fromRoomId: 'room-icu1', toRoomId: 'room-er1',
    initiatedAt: '2026-07-23T10:00:00+05:30', arrivedAt: '2026-07-23T10:20:00+05:30',
    receivedByUserId: 'usr-staff2', approvalStatus: 'APPROVED', approvedByUserId: 'usr-admin',
    approvedAt: '2026-07-23T16:00:00+05:30', flaggedUnapproved: false, accessoryCheckIns: [],
  },
  {
    // Still in transit — no arrivedAt yet, so this is the Schedule page's "moving" example.
    id: 'mv-ecg-001', equipmentId: 'eq-ecg-001', initiatedByUserId: 'usr-staff1',
    fromRoomId: 'room-cardio1', toRoomId: 'room-icu1',
    initiatedAt: '2026-07-24T08:30:00+05:30',
    approvalStatus: 'PENDING', flaggedUnapproved: false, accessoryCheckIns: [],
  },
  {
    // Arrived but never routed through the approval flow — the "Unapproved" case.
    id: 'mv-infusion-001', equipmentId: 'eq-infusion-001', initiatedByUserId: 'usr-staff1',
    fromRoomId: 'room-icu2', toRoomId: 'room-icu1',
    initiatedAt: '2026-07-23T14:00:00+05:30', arrivedAt: '2026-07-23T14:15:00+05:30',
    receivedByUserId: 'usr-staff2', approvalStatus: 'PENDING', flaggedUnapproved: true, accessoryCheckIns: [],
  },
  {
    id: 'mv-defib-001', equipmentId: 'eq-defib-001', initiatedByUserId: 'usr-staff1',
    fromRoomId: 'room-er1', toRoomId: 'room-icu1',
    initiatedAt: '2026-07-19T10:00:00+05:30', arrivedAt: '2026-07-19T10:15:00+05:30',
    receivedByUserId: 'usr-staff1', approvalStatus: 'APPROVED', approvedByUserId: 'usr-admin',
    approvedAt: '2026-07-19T14:00:00+05:30', flaggedUnapproved: false,
    accessoryCheckIns: [{ accessoryId: 'SMH/ER/0003-A1', state: 'ARRIVED_OK' }],
  },
  {
    // Physically moved, then rejected on review — gives the "Recently settled"
    // history its Rejected example. Has arrivedAt so it doesn't also show as
    // still in transit on the Schedule page.
    id: 'mv-xray-001', equipmentId: 'eq-xray-001', initiatedByUserId: 'usr-staff2',
    fromRoomId: 'room-rad2', toRoomId: 'room-er1',
    initiatedAt: '2026-07-20T09:00:00+05:30', arrivedAt: '2026-07-20T09:15:00+05:30',
    receivedByUserId: 'usr-staff2',
    approvalStatus: 'REJECTED', approvedByUserId: 'usr-admin', approvedAt: '2026-07-20T14:00:00+05:30',
    flaggedUnapproved: false, accessoryCheckIns: [],
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
