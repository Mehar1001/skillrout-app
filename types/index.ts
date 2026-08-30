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
    storeAmount: number;
    vendorAmount: number;
  };
  voided?: {
    voidedAt: Timestamp;
    voidedBy: string;
    reason: string;
  };
}
