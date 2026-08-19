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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  active: boolean;
  defaultStorePercent: number;
  defaultVendorPercent: number;
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
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MachineReadingDraft {
  presentIn: number | null;
  presentOut: number | null;
  photoUri?: string;
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
}

export interface Visit {
  id: string;
  storeId: string;
  storeName: string;
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
