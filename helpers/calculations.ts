import { VisitMachine } from '../types';

export const round2 = (value: number): number => Math.round(value * 100) / 100;

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
