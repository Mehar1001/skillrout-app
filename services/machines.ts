import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';
import { Machine } from '../types';
import { sortMachinesByNumber } from '../helpers/machineOrdering';

const getMachinesRef = (ownerId: string, storeId: string) =>
  collection(db, `owners/${ownerId}/stores/${storeId}/machines`);

export const listMachines = async (ownerId: string, storeId: string): Promise<Machine[]> => {
  const snapshot = await getDocs(getMachinesRef(ownerId, storeId));
  return sortMachinesByNumber(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Machine)));
};

export const getNextMachineNumber = async (
  ownerId: string,
  storeId: string
): Promise<string> => {
  const machines = await listMachines(ownerId, storeId);
  const numbers = machines
    .map(m => Number(m.machineNumber))
    .filter(n => Number.isFinite(n) && n > 0);
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(max + 1);
};

export const saveMachine = async (
  ownerId: string,
  storeId: string,
  machine: Partial<Machine>
): Promise<string> => {
  const name = machine.name?.trim();
  if (!name) throw new Error('Machine name is required.');
  if (!machine.id && (Number(machine.lastSettledIn) <= 0 || Number(machine.lastSettledOut) <= 0)) {
    throw new Error('Initial IN and OUT must be greater than 0.');
  }
  if (!machine.id) {
    const result = await employeeAddMachine(ownerId, storeId, {
      machineNumber: machine.machineNumber?.trim() || '',
      name,
      lastSettledIn: machine.lastSettledIn ?? 0,
      lastSettledOut: machine.lastSettledOut ?? 0,
    });
    return result.machineId;
  }

  const ref = doc(db, `owners/${ownerId}/stores/${storeId}/machines`, machine.id);
  await setDoc(ref, {
    machineNumber: machine.machineNumber?.trim(),
    name,
    storeId,
    active: machine.active ?? true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return machine.id;
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

export const employeeAddMachine = async (
  ownerId: string,
  storeId: string,
  payload: { machineNumber: string; name: string; lastSettledIn: number; lastSettledOut: number }
): Promise<{ machineId: string; machineNumber: string }> => {
  const addMachine = httpsCallable(functions, 'employeeAddMachine');
  const response = await addMachine({ ownerId, storeId, ...payload });
  return response.data as { machineId: string; machineNumber: string };
};
