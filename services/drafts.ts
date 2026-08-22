import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Machine, MachineReadingDraft } from '../types';
import { UploadedVisitPhoto } from './visitPhotos';

export type DraftStatus = 'pending' | 'conflict' | 'failed';

export interface VisitDraft {
  id: string; // stable visit ID generated at draft creation time
  ownerId: string;
  storeId: string;
  storeName: string;
  businessDate: string;
  employeeId: string;
  employeeName: string;
  readings: Record<string, MachineReadingDraft>;
  receiptPhotoUri?: string;
  machineBaselines: Record<string, { lastSettledIn: number; lastSettledOut: number }>;
  uploadedPhotos?: Record<string, UploadedVisitPhoto>;
  uploadedReceipt?: UploadedVisitPhoto;
  status: DraftStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const draftsKey = (employeeId: string) => `@skillrout/drafts/${employeeId}`;

const generateVisitId = (): string => doc(collection(db, 'visits')).id;

export const loadDrafts = async (employeeId: string): Promise<VisitDraft[]> => {
  const raw = await AsyncStorage.getItem(draftsKey(employeeId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveDrafts = async (employeeId: string, drafts: VisitDraft[]): Promise<void> => {
  await AsyncStorage.setItem(draftsKey(employeeId), JSON.stringify(drafts));
};

export const createDraft = async (
  ownerId: string,
  storeId: string,
  storeName: string,
  businessDate: string,
  employeeId: string,
  employeeName: string,
  machines: Machine[],
  readings: Record<string, MachineReadingDraft>,
  receiptPhotoUri?: string
): Promise<VisitDraft> => {
  const machineBaselines: VisitDraft['machineBaselines'] = {};
  for (const machine of machines) {
    machineBaselines[machine.id] = {
      lastSettledIn: machine.lastSettledIn,
      lastSettledOut: machine.lastSettledOut,
    };
  }
  const draft: VisitDraft = {
    id: generateVisitId(),
    ownerId,
    storeId,
    storeName,
    businessDate,
    employeeId,
    employeeName,
    readings,
    receiptPhotoUri,
    machineBaselines,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const existing = await loadDrafts(employeeId);
  await saveDrafts(employeeId, [draft, ...existing]);
  return draft;
};

export const updateDraft = async (employeeId: string, draft: VisitDraft): Promise<void> => {
  const drafts = await loadDrafts(employeeId);
  const index = drafts.findIndex(d => d.id === draft.id);
  if (index === -1) return;
  draft.updatedAt = new Date().toISOString();
  drafts[index] = draft;
  await saveDrafts(employeeId, drafts);
};

export const deleteDraft = async (employeeId: string, draftId: string): Promise<void> => {
  const drafts = await loadDrafts(employeeId);
  await saveDrafts(employeeId, drafts.filter(d => d.id !== draftId));
};

export const getDraft = async (employeeId: string, draftId: string): Promise<VisitDraft | null> => {
  const drafts = await loadDrafts(employeeId);
  return drafts.find(d => d.id === draftId) || null;
};

export const markDraftUploadedPhotos = async (
  employeeId: string,
  draftId: string,
  uploadedPhotos: Record<string, UploadedVisitPhoto>,
  uploadedReceipt?: UploadedVisitPhoto
): Promise<void> => {
  const drafts = await loadDrafts(employeeId);
  const draft = drafts.find(d => d.id === draftId);
  if (!draft) return;
  draft.uploadedPhotos = { ...(draft.uploadedPhotos || {}), ...uploadedPhotos };
  if (uploadedReceipt) draft.uploadedReceipt = uploadedReceipt;
  draft.updatedAt = new Date().toISOString();
  await saveDrafts(employeeId, drafts);
};

export const setDraftStatus = async (
  employeeId: string,
  draftId: string,
  status: DraftStatus,
  lastError?: string
): Promise<void> => {
  const drafts = await loadDrafts(employeeId);
  const draft = drafts.find(d => d.id === draftId);
  if (!draft) return;
  draft.status = status;
  draft.lastError = lastError;
  if (status === 'failed') draft.retryCount += 1;
  draft.updatedAt = new Date().toISOString();
  await saveDrafts(employeeId, drafts);
};

export const clearCompletedDrafts = async (employeeId: string): Promise<void> => {
  const drafts = await loadDrafts(employeeId);
  await saveDrafts(employeeId, drafts.filter(d => d.status !== 'failed'));
};
