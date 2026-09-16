import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';
import { CollectionShift, ShiftReconciliation, Visit } from '../types';

const getShiftsRef = (ownerId: string) =>
  collection(db, `owners/${ownerId}/shifts`);

const getReconciliationsRef = (ownerId: string, shiftId: string) =>
  collection(db, `owners/${ownerId}/shifts/${shiftId}/reconciliations`);

export const getShift = async (
  ownerId: string,
  shiftId: string
): Promise<CollectionShift | null> => {
  const snap = await getDoc(doc(db, `owners/${ownerId}/shifts/${shiftId}`));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CollectionShift) : null;
};

export const listShifts = async (
  ownerId: string,
  employeeId?: string,
  pageSize = 100
): Promise<CollectionShift[]> => {
  const base = getShiftsRef(ownerId);
  const q = employeeId
    ? query(base, where('employeeId', '==', employeeId), orderBy('startedAt', 'desc'), limit(pageSize))
    : query(base, orderBy('startedAt', 'desc'), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CollectionShift));
};

export const getActiveShift = async (): Promise<CollectionShift | null> => {
  const fn = httpsCallable<Record<string, unknown>, { shift: CollectionShift | null }>(functions, 'getActiveShift');
  const { data } = await fn({});
  return data?.shift ?? null;
};

export const startShift = async (
  ownerId: string,
  storeIds?: string[]
): Promise<{ shiftId: string }> => {
  const fn = httpsCallable<{ ownerId: string; storeIds?: string[] }, { shiftId: string }>(
    functions,
    'startShift'
  );
  const { data } = await fn({ ownerId, storeIds });
  return data;
};

export const finishShift = async (shiftId: string): Promise<void> => {
  const fn = httpsCallable<{ shiftId: string }, { success: true }>(functions, 'finishShift');
  await fn({ shiftId });
};

export const reconcileStore = async (
  shiftId: string,
  storeId: string,
  payload: {
    actualCashReceived: number;
    discrepancyReason?: string;
    receiptVerified?: boolean;
    reconciliationNote?: string;
    receiptPhotoUrl?: string;
    lineItems: Array<{
      machineId: string;
      actualAmount: number;
      note?: string;
      status?: 'reconciled' | 'discrepancy' | 'pending';
    }>;
  }
): Promise<void> => {
  const fn = httpsCallable<typeof payload & { shiftId: string; storeId: string }, { success: true }>(
    functions,
    'reconcileStore'
  );
  await fn({ shiftId, storeId, ...payload });
};

export const closeShift = async (shiftId: string): Promise<void> => {
  const fn = httpsCallable<{ shiftId: string }, { success: true }>(functions, 'closeShift');
  await fn({ shiftId });
};

export const listShiftReconciliations = async (
  ownerId: string,
  shiftId: string
): Promise<ShiftReconciliation[]> => {
  const snap = await getDocs(
    query(getReconciliationsRef(ownerId, shiftId), orderBy('storeName'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftReconciliation));
};

export const listShiftVisits = async (
  ownerId: string,
  shiftId: string
): Promise<Visit[]> => {
  const snap = await getDocs(
    query(
      collectionGroup(db, 'visits'),
      where('ownerId', '==', ownerId),
      where('shiftId', '==', shiftId),
      orderBy('timestamp', 'desc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Visit));
};
