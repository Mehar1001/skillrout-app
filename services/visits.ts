import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import dayjs from 'dayjs';
import { db, functions } from '../firebaseConfig';
import { Visit, VisitMachine, Machine } from '../types';
import { calculateMachine, calculateVisit, round2 } from '../helpers/calculations';

const getVisitsRef = (ownerId: string) => collection(db, `owners/${ownerId}/visits`);

export const getVisit = async (ownerId: string, visitId: string): Promise<Visit | null> => {
  const snap = await getDoc(doc(db, `owners/${ownerId}/visits`, visitId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Visit) : null;
};

export const saveRun = async (
  ownerId: string,
  storeId: string,
  storeName: string,
  employeeId: string,
  employeeName: string,
  machines: Machine[],
  presentReadings: { [machineId: string]: { in: number; out: number } },
  storePercent: number,
  vendorPercent: number
): Promise<string> => {
  const visitMachines: VisitMachine[] = machines.map(machine => {
    const presentIn = presentReadings[machine.id]?.in || 0;
    const presentOut = presentReadings[machine.id]?.out || 0;
    const { newIn, newOut, machineNet } = calculateMachine(
      machine.lastSettledIn,
      machine.lastSettledOut,
      presentIn,
      presentOut
    );
    return {
      machineId: machine.id,
      machineNumber: machine.machineNumber,
      name: machine.name,
      lastSettledIn: machine.lastSettledIn,
      lastSettledOut: machine.lastSettledOut,
      presentIn,
      presentOut,
      newIn,
      newOut,
      machineNet,
    };
  });

  const calc = calculateVisit(visitMachines, storePercent);

  const visit: Omit<Visit, 'id'> = {
    storeId,
    storeName,
    employeeId,
    employeeName,
    businessDate: dayjs().format('YYYY-MM-DD'),
    timestamp: serverTimestamp() as any,
    machines: visitMachines,
    ...calc,
    storePercent,
    vendorPercent,
    cashDueLocation: round2(calc.totalNewOut + calc.storeAmount),
    visitStatus: 'completed',
    settlementStatus: 'not_submitted',
    printStatus: 'not_printed',
  };

  const visitRef = doc(getVisitsRef(ownerId));
  await setDoc(visitRef, visit);
  return visitRef.id;
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
