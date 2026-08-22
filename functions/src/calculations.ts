export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

interface MachineLike {
  lastSettledIn: number;
  lastSettledOut: number;
  presentIn: number;
  presentOut: number;
}

interface VisitMachineLike {
  newIn: number;
  newOut: number;
}

export const calculateMachine = (machine: MachineLike, presentIn: number, presentOut: number) => {
  const newIn = round2(presentIn - machine.lastSettledIn);
  const newOut = round2(presentOut - machine.lastSettledOut);
  const machineNet = round2(newIn - newOut);
  return { newIn, newOut, machineNet };
};

export const calculateVisit = (machines: VisitMachineLike[], storePercent: number) => {
  const totalNewIn = round2(machines.reduce((sum, machine) => sum + machine.newIn, 0));
  const totalNewOut = round2(machines.reduce((sum, machine) => sum + machine.newOut, 0));
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
