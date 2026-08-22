import { Machine, MachineReadingDraft, VisitMachine } from '../types';

export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const calculateMachine = (
  lastSettledIn: number,
  lastSettledOut: number,
  presentIn: number,
  presentOut: number
): { newIn: number; newOut: number; machineNet: number } => {
  const newIn = round2(presentIn - lastSettledIn);
  const newOut = round2(presentOut - lastSettledOut);
  const machineNet = round2(newIn - newOut);
  return { newIn, newOut, machineNet };
};

export const calculateLiveReadings = (
  machines: Machine[],
  readings: Record<string, MachineReadingDraft>
) => {
  return machines.reduce(
    (totals, machine) => {
      const reading = readings[machine.id];
      if (reading?.presentIn !== null && reading?.presentIn !== undefined) {
        totals.presentIn = round2(totals.presentIn + reading.presentIn);
        totals.newIn = round2(totals.newIn + Math.max(0, reading.presentIn - machine.lastSettledIn));
      }
      if (reading?.presentOut !== null && reading?.presentOut !== undefined) {
        totals.presentOut = round2(totals.presentOut + reading.presentOut);
        totals.newOut = round2(totals.newOut + Math.max(0, reading.presentOut - machine.lastSettledOut));
      }
      totals.presentNet = round2(totals.presentIn - totals.presentOut);
      totals.activityNet = round2(totals.newIn - totals.newOut);
      return totals;
    },
    { presentIn: 0, presentOut: 0, presentNet: 0, newIn: 0, newOut: 0, activityNet: 0 }
  );
};

export const calculateVisit = (
  machines: VisitMachine[],
  storePercent: number
) => {
  const totalNewIn = round2(machines.reduce((s, m) => s + (m.newIn || 0), 0));
  const totalNewOut = round2(machines.reduce((s, m) => s + (m.newOut || 0), 0));
  const totalNet = round2(totalNewIn - totalNewOut);
  const result: 'positive' | 'zero' | 'negative' =
    totalNet > 0 ? 'positive' : totalNet < 0 ? 'negative' : 'zero';

  const storeAmount = round2(totalNet * (storePercent / 100));
  const vendorAmount = round2(totalNet - storeAmount);
  const cashDueLocation = round2(totalNewOut + storeAmount);

  return {
    totalNewIn,
    totalNewOut,
    totalNet,
    result,
    storeAmount,
    vendorAmount,
    cashDueLocation,
  };
};
