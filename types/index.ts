import { Timestamp } from 'firebase/firestore';

export type UserRole = 'owner' | 'employee';

export interface Owner {
  id: string;
  email: string;
  name?: string;
  subscriptionStatus: 'active' | 'inactive';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Employee {
  id: string; // Auth UID
  email: string;
  name: string;
  active: boolean;
  role: 'employee';
  ownerId: string;
  businessName?: string;
  assignedStoreIds: string[];
  mustChangePassword?: boolean;
  deactivatedAt?: Timestamp;
  reactivatedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone?: string;
  active: boolean;
  defaultStorePercent: number;
  defaultVendorPercent: number;
  deactivatedAt?: Timestamp;
  reactivatedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Machine {
  id: string;
  machineNumber: string;
  legacyMachineNumbers?: string[];
  name: string;
  storeId: string;
  lastSettledIn: number;
  lastSettledOut: number;
  lastSubmittedVisitId: string | null;
  lastSubmittedAt: Timestamp | null;
  baselineVersion?: number;
  active: boolean;
  deactivatedAt?: Timestamp;
  reactivatedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  machineNumberRenumberedAt?: Timestamp;
}

export type OcrReadingStatus = 'suggested' | 'reviewed' | 'warning';

export interface OcrReadingMetadata {
  source: 'receipt' | 'machine-photo';
  status: OcrReadingStatus;
  presentIn?: number;
  presentOut?: number;
  confidence?: number;
  scanId: string;
}

export interface MachineReadingDraft {
  presentIn: number | null;
  presentOut: number | null;
  photoUri?: string;
  ocr?: OcrReadingMetadata;
}

export interface ReceiptOcrCandidate {
  receiptMachineNumber: string;
  presentIn: number | null;
  presentOut: number | null;
  confidence: number;
  warnings: string[];
}

export interface ReceiptOcrTotals {
  moneyIn: number | null;
  moneyOut: number | null;
  extractedIn: number;
  extractedOut: number;
  inMatches: boolean | null;
  outMatches: boolean | null;
}

export interface ReceiptOcrResponse {
  candidates: ReceiptOcrCandidate[];
  totals: ReceiptOcrTotals;
  confidence: number;
  warnings: string[];
  scanId: string;
  cached: boolean;
}

export interface VisitMachine {
  machineId: string;
  machineNumber: string;
  name: string;
  lastSettledIn: number;
  lastSettledOut: number;
  presentIn: number;
  presentOut: number;
  newIn: number;
  newOut: number;
  machineNet: number;
  photoUrl?: string;
  photoPath?: string;
  readingSource?: 'manual' | 'ocr_reviewed';
  ocrScanId?: string;
}

export interface Visit {
  id: string;
  ownerId: string;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  employeeId: string;
  employeeName: string;
  businessDate: string; // YYYY-MM-DD
  timestamp: Timestamp;
  machines: VisitMachine[];
  totalNewIn: number;
  totalNewOut: number;
  totalNet: number;
  result: 'positive' | 'zero' | 'negative';
  storePercent: number;
  vendorPercent: number;
  storeAmount: number;
  vendorAmount: number;
  cashDueLocation: number;
  visitStatus: 'completed';
  settlementStatus: 'not_submitted' | 'submitted';
  printStatus: 'not_printed' | 'printed';
  receiptPhotoUrl?: string;
  receiptPhotoPath?: string;
  printedAt?: Timestamp;
  printedBy?: string;
  settlement?: {
    submittedAt: Timestamp;
    submittedBy: string;
    storePercent: number;
    vendorPercent: number;
    totalNewIn: number;
    totalNewOut: number;
    totalNet: number;
    result: 'positive' | 'zero' | 'negative';
    storeAmount: number;
    vendorAmount: number;
    cashDueLocation: number;
  };
  voided?: {
    voidedAt: Timestamp;
    voidedBy: string;
    reason: string;
  };
  adjustments?: Adjustment[];
  originalMachines?: VisitMachine[];
  originalTotals?: {
    totalNewIn: number;
    totalNewOut: number;
    totalNet: number;
    storeAmount: number;
    vendorAmount: number;
  };
  lastAdjustedAt?: Timestamp;
  lastAdjustedBy?: string;
}

export interface AdjustmentResult {
  success: true;
  totalNewIn: number;
  totalNewOut: number;
  totalNet: number;
  storeAmount: number;
  vendorAmount: number;
  netDifference: number;
  rewroteBaselines: boolean;
  baselineSkipped: { machineNumber: string; reason: string }[];
  adjustedMachineCount: number;
}

export interface Adjustment {
  adjustedAt: Timestamp;
  adjustedBy: string;
  adjustedByName?: string;
  tag: string;
  note: string;
  rewriteBaselinesRequested?: boolean;
  rewroteBaselines: boolean;
  storePercent?: number;
  vendorPercent?: number;
  submittedTotalNewIn: number;
  submittedTotalNewOut: number;
  submittedTotalNet: number;
  submittedStoreAmount: number;
  submittedVendorAmount: number;
  machineChanges: {
    machineId: string;
    machineNumber: string;
    oldPresentIn: number;
    oldPresentOut: number;
    newPresentIn: number;
    newPresentOut: number;
    oldLastSettledIn: number;
    oldLastSettledOut: number;
    oldNewIn?: number;
    oldNewOut?: number;
    adjustedNewIn?: number;
    adjustedNewOut?: number;
    baselineRewritten?: boolean;
    baselineSkippedReason?: string;
    newLastSettledIn?: number;
    newLastSettledOut?: number;
  }[];
}

export type ActivityAction =
  | 'store_created'
  | 'store_updated'
  | 'store_deleted'
  | 'store_activated'
  | 'store_deactivated'
  | 'machine_created'
  | 'machine_updated'
  | 'machine_deleted'
  | 'machine_moved'
  | 'machine_activated'
  | 'machine_deactivated'
  | 'machine_number_changed'
  | 'machine_baseline_rewritten'
  | 'visit_run'
  | 'visit_submitted'
  | 'visit_printed'
  | 'visit_adjusted'
  | 'visit_voided'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_assigned'
  | 'employee_removed'
  | 'percentage_changed';

export interface Activity {
  id: string;
  ownerId: string;
  action: ActivityAction;
  actorId: string;
  actorName?: string;
  actorRole: string;
  storeId?: string;
  storeName?: string;
  machineId?: string;
  machineNumber?: string;
  visitId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  note?: string;
  createdAt: Timestamp;
}
