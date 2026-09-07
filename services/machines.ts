import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
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

export const validateMachineNumberFormat = (machineNumber: string): { valid: boolean; error?: string } => {
  const trimmed = machineNumber.trim();
  if (!trimmed) {
    return { valid: false, error: 'Machine number is required.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Machine number must be a positive integer.' };
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { valid: false, error: 'Machine number must be a positive integer.' };
  }
  return { valid: true };
};

export const validateMachineNumberUnique = async (
  ownerId: string,
  storeId: string,
  machineNumber: string,
  excludeMachineId?: string
): Promise<{ valid: boolean; error?: string }> => {
  const formatCheck = validateMachineNumberFormat(machineNumber);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  const machines = await listMachines(ownerId, storeId);
  const trimmedNumber = machineNumber.trim();
  const duplicate = machines.find(
    m => m.machineNumber === trimmedNumber && m.id !== excludeMachineId
  );

  if (duplicate) {
    return { valid: false, error: `Machine number ${trimmedNumber} is already in use.` };
  }

  return { valid: true };
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

  const machineNumber = machine.machineNumber?.trim() || '';
  const uniquenessCheck = await validateMachineNumberUnique(
    ownerId,
    storeId,
    machineNumber,
    machine.id
  );
  if (!uniquenessCheck.valid) {
    throw new Error(uniquenessCheck.error);
  }

  if (!machine.id) {
    const result = await employeeAddMachine(ownerId, storeId, {
      machineNumber,
      name,
      lastSettledIn: machine.lastSettledIn ?? 0,
      lastSettledOut: machine.lastSettledOut ?? 0,
    });
    return result.machineId;
  }

  const ref = doc(db, `owners/${ownerId}/stores/${storeId}/machines`, machine.id);
  await setDoc(ref, {
    machineNumber,
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

export const deleteMachine = async (
  ownerId: string,
  storeId: string,
  machineId: string
): Promise<void> => {
  const ref = doc(db, `owners/${ownerId}/stores/${storeId}/machines`, machineId);
  await deleteDoc(ref);
};
