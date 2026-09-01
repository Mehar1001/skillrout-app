interface MachineOrderValue {
  id?: string;
  machineNumber: string;
  name?: string;
  createdAt?: { toMillis?: () => number } | null;
}

export const numericMachineNumber = (machineNumber: string): number | null => {
  const normalized = machineNumber.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

const createdAtMillis = (value: MachineOrderValue): number => value.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

export const compareMachineNumbers = (left: MachineOrderValue, right: MachineOrderValue): number => {
  const leftNumber = numericMachineNumber(left.machineNumber);
  const rightNumber = numericMachineNumber(right.machineNumber);
  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) return leftNumber - rightNumber;
  if (leftNumber !== null && rightNumber === null) return -1;
  if (leftNumber === null && rightNumber !== null) return 1;

  const numberComparison = left.machineNumber.localeCompare(right.machineNumber, undefined, { numeric: true });
  if (numberComparison !== 0) return numberComparison;
  const createdComparison = createdAtMillis(left) - createdAtMillis(right);
  if (createdComparison !== 0) return createdComparison;
  const nameComparison = (left.name ?? '').localeCompare(right.name ?? '');
  if (nameComparison !== 0) return nameComparison;
  return (left.id ?? '').localeCompare(right.id ?? '');
};

export const sortMachinesByNumber = <T extends MachineOrderValue>(machines: readonly T[]): T[] =>
  [...machines].sort(compareMachineNumbers);
