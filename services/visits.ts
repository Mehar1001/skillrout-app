import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';
import { listStores } from './stores';
import { AdjustmentResult, Machine, MachineReadingDraft, Visit } from '../types';
import { uploadVisitPhoto, uploadVisitReceipt, UploadedVisitPhoto } from './visitPhotos';

const getVisitRef = (ownerId: string, storeId: string, visitId: string) =>
  doc(db, `owners/${ownerId}/stores/${storeId}/visits`, visitId);

const getVisitsRef = (ownerId: string, storeId: string) =>
  collection(db, `owners/${ownerId}/stores/${storeId}/visits`);

export type RunProgress = 'preparing' | 'uploading-photos' | 'uploading-receipt' | 'recording';

export const createVisitId = (ownerId: string, storeId: string): string =>
  doc(getVisitsRef(ownerId, storeId)).id;

export const getVisit = async (
  ownerId: string,
  storeId: string | undefined,
  visitId: string
): Promise<Visit | null> => {
  if (storeId) {
    const snap = await getDoc(getVisitRef(ownerId, storeId, visitId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Visit) : null;
  }
  const fallback = query(
    collectionGroup(db, 'visits'),
    where('ownerId', '==', ownerId),
    where('__name__', '==', visitId)
  );
  const snap = await getDocs(fallback);
  const doc = snap.docs[0];
  return doc ? ({ id: doc.id, ...doc.data() } as Visit) : null;
};

export const listVisits = async (ownerId: string, pageSize = 100): Promise<Visit[]> => {
  const stores = await listStores(ownerId);
  const storeIds = stores.map(s => s.id);
  return listAssignedStoreVisits(ownerId, storeIds, pageSize);
};

export const listAssignedStoreVisits = async (
  ownerId: string,
  assignedStoreIds: string[],
  pageSize = 100
): Promise<Visit[]> => {
  if (assignedStoreIds.length === 0) return [];
  const snapshots = await Promise.all(
    assignedStoreIds.map(storeId =>
      getDocs(query(getVisitsRef(ownerId, storeId), orderBy('timestamp', 'desc'), limit(pageSize)))
    )
  );
  return snapshots
    .flatMap(snapshot => snapshot.docs.map(visit => ({ id: visit.id, ...visit.data() } as Visit)))
    .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
};

export const saveRun = async (
  ownerId: string,
  storeId: string,
  businessDate: string,
  machines: Machine[],
  readings: Record<string, MachineReadingDraft>,
  receiptPhotoUri?: string,
  options?: {
    visitId?: string;
    shiftId?: string;
    preUploadedPhotos?: Record<string, UploadedVisitPhoto>;
    preUploadedReceipt?: UploadedVisitPhoto;
    onProgress?: (progress: RunProgress) => void;
  }
): Promise<string> => {
  const visitId = options?.visitId || createVisitId(ownerId, storeId);
  options?.onProgress?.('preparing');
  const uploadedPhotos = new Map<string, UploadedVisitPhoto>();
  if (options?.preUploadedPhotos) {
    Object.entries(options.preUploadedPhotos).forEach(([machineId, photo]) => {
      uploadedPhotos.set(machineId, photo);
    });
  }
  if (machines.some(machine => readings[machine.id]?.photoUri && !uploadedPhotos.has(machine.id))) {
    options?.onProgress?.('uploading-photos');
  }
  await Promise.all(
    machines.map(async machine => {
      if (uploadedPhotos.has(machine.id)) return;
      const photoUri = readings[machine.id]?.photoUri;
      if (!photoUri) return;
      uploadedPhotos.set(
        machine.id,
        await uploadVisitPhoto(ownerId, storeId, visitId, machine.id, photoUri)
      );
    })
  );
  if (receiptPhotoUri && !options?.preUploadedReceipt) options?.onProgress?.('uploading-receipt');
  const uploadedReceipt = options?.preUploadedReceipt
    ? options.preUploadedReceipt
    : receiptPhotoUri
      ? await uploadVisitReceipt(ownerId, storeId, visitId, receiptPhotoUri)
      : undefined;

  options?.onProgress?.('recording');
  const runVisit = httpsCallable(functions, 'runVisit');
  await runVisit({
    visitId,
    storeId,
    shiftId: options?.shiftId,
    businessDate,
    ...(uploadedReceipt
      ? { receiptPhotoUrl: uploadedReceipt.photoUrl, receiptPhotoPath: uploadedReceipt.photoPath }
      : {}),
    readings: machines.map(machine => ({
      machineId: machine.id,
      presentIn: readings[machine.id]?.presentIn,
      presentOut: readings[machine.id]?.presentOut,
      readingSource: readings[machine.id]?.ocr?.status === 'reviewed' ? 'ocr_reviewed' : 'manual',
      ...(readings[machine.id]?.ocr?.scanId ? { ocrScanId: readings[machine.id].ocr!.scanId } : {}),
      ...uploadedPhotos.get(machine.id),
    })),
  });
  return visitId;
};

export const saveVisitSplit = async (
  ownerId: string,
  storeId: string,
  visitId: string,
  storePercent: number,
  vendorPercent: number
): Promise<void> => {
  const setVisitSplit = httpsCallable(functions, 'setVisitSplit');
  await setVisitSplit({ ownerId, storeId, visitId, storePercent, vendorPercent });
};

export const submitVisit = async (
  ownerId: string,
  storeId: string,
  visitId: string,
  storePercent: number,
  vendorPercent: number,
  shiftId?: string
): Promise<void> => {
  const submitVisitFn = httpsCallable(functions, 'submitVisit');
  await submitVisitFn({ ownerId, storeId, visitId, shiftId, storePercent, vendorPercent });
};

export const markPrinted = async (
  ownerId: string,
  storeId: string,
  visitId: string,
  userId: string
): Promise<void> => {
  await updateDoc(getVisitRef(ownerId, storeId, visitId), {
    printStatus: 'printed',
    printedAt: serverTimestamp(),
    printedBy: userId,
  });
};

// Callable errors surface as "INTERNAL" when the server throws an unexpected
// error, which tells an admin nothing. Translate the code into guidance and
// keep any server-provided message.
const describeAdjustmentError = (error: unknown): string => {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  const detail = typeof message === 'string' ? message.trim() : '';
  const normalizedCode = (code || '').replace('functions/', '');
  const hasUsefulDetail = detail.length > 0 && !/^internal$/i.test(detail);

  switch (normalizedCode) {
    case 'invalid-argument':
    case 'failed-precondition':
    case 'not-found':
      return hasUsefulDetail ? detail : 'The adjustment details could not be accepted. Review the readings and try again.';
    case 'permission-denied':
      return 'Only an owner or admin on this account can adjust a visit.';
    case 'unauthenticated':
      return 'Your session expired. Sign in again and retry the adjustment.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'The server did not respond in time. Check your connection and try again.';
    case 'aborted':
      return 'Another change was saved while you were editing. Refresh the report and retry.';
    case 'internal':
      return hasUsefulDetail
        ? `The server could not save the adjustment: ${detail}`
        : 'The server could not save the adjustment. Please retry, and if it keeps failing report the visit ID to support.';
    default:
      return hasUsefulDetail ? detail : 'The adjustment could not be saved. Please try again.';
  }
};

export const adjustVisit = async (
  ownerId: string,
  storeId: string,
  visitId: string,
  payload: {
    note: string;
    tag: string;
    rewriteBaselines: boolean;
    readings: { machineId: string; presentIn: number; presentOut: number }[];
  }
): Promise<AdjustmentResult> => {
  const adjustVisitFn = httpsCallable<Record<string, unknown>, AdjustmentResult>(functions, 'adjustVisit');
  try {
    const response = await adjustVisitFn({ ownerId, storeId, visitId, ...payload });
    return response.data;
  } catch (error) {
    throw new Error(describeAdjustmentError(error));
  }
};
