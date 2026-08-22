import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Machine } from '../types';

const getMachinesRef = (ownerId: string, storeId: string) =>
  collection(db, `owners/${ownerId}/stores/${storeId}/machines`);

export const listMachines = async (ownerId: string, storeId: string): Promise<Machine[]> => {
  const snapshot = await getDocs(getMachinesRef(ownerId, storeId));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Machine));
};

export const saveMachine = async (
  ownerId: string,
  storeId: string,
  machine: Partial<Machine>
): Promise<string> => {
  const id = machine.id || doc(getMachinesRef(ownerId, storeId)).id;
  const ref = doc(db, `owners/${ownerId}/stores/${storeId}/machines`, id);
  const data = {
    machineNumber: machine.machineNumber?.trim() || '',
    name: machine.name?.trim() || '',
    storeId,
    active: machine.active ?? true,
    updatedAt: serverTimestamp(),
    ...(machine.id
      ? {}
      : {
          lastSettledIn: machine.lastSettledIn ?? 0,
          lastSettledOut: machine.lastSettledOut ?? 0,
          baselineVersion: 0,
          lastSubmittedVisitId: null,
          lastSubmittedAt: null,
          createdAt: serverTimestamp(),
        }),
  };
  await setDoc(ref, data, { merge: true });
  return id;
};

export const updateMachine = async (
  ownerId: string,
  storeId: string,
  machineId: string,
  updates: Partial<Machine>
): Promise<void> => {
  const ref = doc(db, `owners/${ownerId}/stores/${storeId}/machines`, machineId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
};

export const setMachineActive = async (
  ownerId: string,
  storeId: string,
  machineId: string,
  active: boolean
): Promise<void> => {
  await updateDoc(doc(db, `owners/${ownerId}/stores/${storeId}/machines`, machineId), {
    active,
    updatedAt: serverTimestamp(),
    ...(active
      ? { reactivatedAt: serverTimestamp() }
      : { deactivatedAt: serverTimestamp() }),
  });
};
