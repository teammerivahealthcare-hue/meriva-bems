/**
 * Meriva BEMS — Add-equipment draft shape
 *
 * A draft is the in-progress state of the /equipment/add form before it's
 * submitted. Kept separate from `Equipment` because it's deliberately
 * incomplete — most fields are optional strings until submit time, when the
 * store converts a complete draft into one or more real `Equipment` records.
 */

import type { Criticality } from './types';

export interface EquipmentDraftUnit {
  serialNumber: string;
  assetId: string;
  departmentId: string;
  roomId: string;
}

export interface EquipmentDraftData {
  equipmentModelId: string;
  numberOfUnits: number;
  units: EquipmentDraftUnit[];
  responsibleUserId: string;
  criticality: Criticality | '';
  yearOfManufacture: string;
  dateOfPurchase: string;
  dateOfInstallation: string;
  warrantyExpiryDate: string;
  purchaseCost: string;
  dealerVendorId: string;
  remarks: string;
  photoDataUrl: string;
}

export interface EquipmentDraft extends EquipmentDraftData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function emptyDraftUnit(): EquipmentDraftUnit {
  return { serialNumber: '', assetId: '', departmentId: '', roomId: '' };
}

export function emptyEquipmentDraftData(): EquipmentDraftData {
  return {
    equipmentModelId: '',
    numberOfUnits: 1,
    units: [emptyDraftUnit()],
    responsibleUserId: '',
    criticality: '',
    yearOfManufacture: '',
    dateOfPurchase: '',
    dateOfInstallation: '',
    warrantyExpiryDate: '',
    purchaseCost: '',
    dealerVendorId: '',
    remarks: '',
    photoDataUrl: '',
  };
}

/** Progress toward a complete submission — drives the % shown on draft cards. */
export function draftCompletionPct(d: EquipmentDraftData): number {
  const checks: boolean[] = [
    d.equipmentModelId !== '',
    d.units.length > 0 &&
      d.units.every(
        (u) => u.serialNumber.trim() !== '' && u.assetId.trim() !== '' && u.departmentId !== '' && u.roomId !== ''
      ),
    d.responsibleUserId !== '',
    d.criticality !== '',
    d.yearOfManufacture !== '',
    d.dateOfPurchase !== '',
    d.dateOfInstallation !== '',
    d.purchaseCost !== '',
    d.dealerVendorId !== '',
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function isDraftComplete(d: EquipmentDraftData): boolean {
  return draftCompletionPct(d) === 100;
}
