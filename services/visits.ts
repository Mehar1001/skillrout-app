import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';
import { Machine, MachineReadingDraft, Visit } from '../types';
import { uploadVisitPhoto, uploadVisitReceipt } from './visitPhotos';

const getVisitsRef = (ownerId: string) => collection(db, `owners/${ownerId}/visits`);

export const getVisit = async (ownerId: string, visitId: string): Promise<Visit | null> => {
  const snap = await getDoc(doc(db, `owners/${ownerId}/visits`, visitId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Visit) : null;
};

export const listVisits = async (ownerId: string, pageSize = 100): Promise<Visit[]> => {
  const snapshot = await getDocs(
    query(getVisitsRef(ownerId), orderBy('timestamp', 'desc'), limit(pageSize))
  );
  return snapshot.docs.map(visit => ({ id: visit.id, ...visit.data() } as Visit));
};

export const listAssignedStoreVisits = async (
  ownerId: string,
  assignedStoreIds: string[]
): Promise<Visit[]> => {
  if (assignedStoreIds.length === 0) return [];
  const snapshots = await Promise.all(
    assignedStoreIds.map(storeId =>
      getDocs(query(getVisitsRef(ownerId), where('storeId', '==', storeId)))
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
  receiptPhotoUri?: string
): Promise<string> => {
  const visitId = doc(getVisitsRef(ownerId)).id;
  const uploadedPhotos = new Map<string, { photoUrl: string; photoPath: string }>();
  await Promise.all(
    machines.map(async machine => {
      const photoUri = readings[machine.id]?.photoUri;
      if (!photoUri) return;
      uploadedPhotos.set(
        machine.id,
        await uploadVisitPhoto(ownerId, storeId, visitId, machine.id, photoUri)
      );
    })
  );
  const uploadedReceipt = receiptPhotoUri
    ? await uploadVisitReceipt(ownerId, storeId, visitId, receiptPhotoUri)
    : undefined;

  const runVisit = httpsCallable(functions, 'runVisit');
  await runVisit({
    visitId,
    storeId,
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
  visitId: string,
  storePercent: number,
  vendorPercent: number
): Promise<void> => {
  const setVisitSplit = httpsCallable(functions, 'setVisitSplit');
  await setVisitSplit({ ownerId, visitId, storePercent, vendorPercent });
};

export const submitVisit = async (
  ownerId: string,
  visitId: string,
  storePercent: number,
  vendorPercent: number
): Promise<void> => {
  const submitVisitFn = httpsCallable(functions, 'submitVisit');
  await submitVisitFn({ ownerId, visitId, storePercent, vendorPercent });
};

export const markPrinted = async (ownerId: string, visitId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, `owners/${ownerId}/visits`, visitId), {
    printStatus: 'printed',
    printedAt: serverTimestamp(),
    printedBy: userId,
  });
};
