import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { listMachines } from '../services/machines';
import {
  createDraft as createDraftInStorage,
  deleteDraft as deleteDraftInStorage,
  loadDrafts,
  markDraftUploadedPhotos,
  setDraftStatus,
  updateDraft,
  VisitDraft,
} from '../services/drafts';
import { saveRun } from '../services/visits';
import { uploadVisitPhoto, uploadVisitReceipt } from '../services/visitPhotos';
import { useAuth } from './AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Machine, MachineReadingDraft } from '../types';

type DraftQueueContextValue = {
  drafts: VisitDraft[];
  pendingCount: number;
  processing: boolean;
  saveDraft: (params: SaveDraftParams) => Promise<VisitDraft>;
  deleteDraft: (draftId: string) => Promise<void>;
  resolveConflict: (draftId: string, readings: Record<string, MachineReadingDraft>) => Promise<void>;
  processQueue: () => Promise<void>;
};

interface SaveDraftParams {
  storeId: string;
  storeName: string;
  businessDate: string;
  machines: Machine[];
  readings: Record<string, MachineReadingDraft>;
  receiptPhotoUri?: string;
}

const DraftQueueContext = createContext<DraftQueueContextValue | null>(null);

export function DraftQueueProvider({ children }: { children: React.ReactNode }) {
  const { user, ownerId } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [drafts, setDrafts] = useState<VisitDraft[]>([]);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);

  const employeeId = user?.uid;
  const employeeName = user?.displayName || 'Employee';

  const refreshDrafts = useCallback(async () => {
    if (!employeeId) return;
    setDrafts(await loadDrafts(employeeId));
  }, [employeeId]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  useEffect(() => {
    if (isOnline && employeeId && ownerId) {
      processQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, employeeId, ownerId]);

  const saveDraft = useCallback(
    async (params: SaveDraftParams): Promise<VisitDraft> => {
      if (!employeeId || !ownerId) throw new Error('Not authenticated');
      const draft = await createDraftInStorage(
        ownerId,
        params.storeId,
        params.storeName,
        params.businessDate,
        employeeId,
        employeeName,
        params.machines,
        params.readings,
        params.receiptPhotoUri
      );
      await refreshDrafts();
      return draft;
    },
    [employeeId, employeeName, ownerId, refreshDrafts]
  );

  const deleteDraft = useCallback(
    async (draftId: string): Promise<void> => {
      if (!employeeId) return;
      await deleteDraftInStorage(employeeId, draftId);
      await refreshDrafts();
    },
    [employeeId, refreshDrafts]
  );

  const resolveConflict = useCallback(
    async (draftId: string, readings: Record<string, MachineReadingDraft>): Promise<void> => {
      if (!employeeId || !ownerId) return;
      const current = drafts.find(d => d.id === draftId);
      if (!current) return;
      const machines = await listMachines(ownerId, current.storeId);
      const activeMachines = machines.filter(m => m.active);
      const machineBaselines: VisitDraft['machineBaselines'] = {};
      for (const machine of activeMachines) {
        machineBaselines[machine.id] = {
          lastSettledIn: machine.lastSettledIn,
          lastSettledOut: machine.lastSettledOut,
        };
      }
      const updated: VisitDraft = {
        ...current,
        readings,
        machineBaselines,
        uploadedPhotos: {},
        uploadedReceipt: undefined,
        status: 'pending',
        retryCount: 0,
        lastError: undefined,
        updatedAt: new Date().toISOString(),
      };
      await updateDraft(employeeId, updated);
      await refreshDrafts();
      if (isOnline) processQueue();
    },
    [drafts, employeeId, isOnline, ownerId, refreshDrafts]
  );

  const processQueue = useCallback(async (): Promise<void> => {
    if (!employeeId || !ownerId || processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      let currentDrafts = await loadDrafts(employeeId);
      const pending = currentDrafts.filter(d => d.status === 'pending' || d.status === 'failed');
      for (const draft of pending) {
        const fresh = await loadDrafts(employeeId);
        const freshDraft = fresh.find(d => d.id === draft.id);
        if (!freshDraft || freshDraft.status === 'conflict') continue;

        try {
          const machines = await listMachines(ownerId, draft.storeId);
          const activeMachines = machines.filter(m => m.active);
          const activeIds = new Set(activeMachines.map(m => m.id));
          const draftIds = Object.keys(draft.readings);

          const baselinesStale = draftIds.some(id => {
            const current = activeMachines.find(m => m.id === id);
            const baseline = draft.machineBaselines[id];
            if (!current || !baseline) return true;
            return (
              current.lastSettledIn !== baseline.lastSettledIn ||
              current.lastSettledOut !== baseline.lastSettledOut
            );
          });

          if (baselinesStale || activeIds.size !== draftIds.length || !draftIds.every(id => activeIds.has(id))) {
            await setDraftStatus(employeeId, draft.id, 'conflict', 'Store or machine baselines changed since this draft was saved.');
            continue;
          }

          // Upload any photos that are still local.
          const uploadedPhotos: Record<string, { photoUrl: string; photoPath: string }> = { ...(draft.uploadedPhotos || {}) };
          for (const machineId of draftIds) {
            const photoUri = draft.readings[machineId]?.photoUri;
            if (photoUri && !uploadedPhotos[machineId]) {
              uploadedPhotos[machineId] = await uploadVisitPhoto(ownerId, draft.storeId, draft.id, machineId, photoUri);
            }
          }
          let uploadedReceipt = draft.uploadedReceipt;
          if (draft.receiptPhotoUri && !uploadedReceipt) {
            uploadedReceipt = await uploadVisitReceipt(ownerId, draft.storeId, draft.id, draft.receiptPhotoUri);
          }
          await markDraftUploadedPhotos(employeeId, draft.id, uploadedPhotos, uploadedReceipt);

          await saveRun(
            ownerId,
            draft.storeId,
            draft.businessDate,
            activeMachines,
            draft.readings,
            undefined,
            { visitId: draft.id, preUploadedPhotos: uploadedPhotos, preUploadedReceipt: uploadedReceipt }
          );

          await deleteDraftInStorage(employeeId, draft.id);
        } catch (error: any) {
          const code = String(error?.code || '');
          const message = error?.message || 'Unknown error';
          if (code === 'functions/already-exists' || message.includes('already-exists')) {
            // Idempotent success: the visit was recorded by a previous attempt.
            await deleteDraftInStorage(employeeId, draft.id);
          } else if (message.includes('last settlement') || message.includes('below the baseline') || message.includes('stale')) {
            await setDraftStatus(employeeId, draft.id, 'conflict', message);
          } else {
            await setDraftStatus(employeeId, draft.id, 'failed', message);
          }
        }
      }
    } finally {
      processingRef.current = false;
      await refreshDrafts();
      setProcessing(false);
    }
  }, [employeeId, ownerId, refreshDrafts]);

  const pendingCount = useMemo(
    () => drafts.filter(d => d.status === 'pending' || d.status === 'failed').length,
    [drafts]
  );

  const value = useMemo(
    () => ({
      drafts,
      pendingCount,
      processing,
      saveDraft,
      deleteDraft,
      resolveConflict,
      processQueue,
    }),
    [drafts, pendingCount, processing, saveDraft, deleteDraft, resolveConflict, processQueue]
  );

  return <DraftQueueContext.Provider value={value}>{children}</DraftQueueContext.Provider>;
}

export function useDraftQueue() {
  const context = useContext(DraftQueueContext);
  if (!context) throw new Error('useDraftQueue must be used within a DraftQueueProvider');
  return context;
}
