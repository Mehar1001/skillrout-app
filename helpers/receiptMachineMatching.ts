import { Machine, ReceiptOcrCandidate } from '../types';

export interface ReceiptReviewRow extends ReceiptOcrCandidate {
  machineId: string | null;
  machineNumber: string | null;
  machineName: string | null;
}

export const normalizeReceiptMachineNumber = (value: string) => {
  const normalized = value.replace(/[<>\[\](){}\s]/g, '').replace(/^0+(?=\d)/, '');
  return normalized || '0';
};

export const matchReceiptCandidates = (
  machines: Machine[],
  candidates: ReceiptOcrCandidate[]
): ReceiptReviewRow[] => {
  return candidates.map(candidate => {
    const target = normalizeReceiptMachineNumber(candidate.receiptMachineNumber);
    const matches = machines.filter(
      machine => normalizeReceiptMachineNumber(machine.machineNumber) === target
    );
    const machine = matches.length === 1 ? matches[0] : null;
    const warnings = [...candidate.warnings];
    if (matches.length === 0) warnings.push(`Machine ${candidate.receiptMachineNumber} is not configured for this store.`);
    if (matches.length > 1) warnings.push(`Machine ${candidate.receiptMachineNumber} matches more than one configured machine.`);
    return {
      ...candidate,
      warnings,
      machineId: machine?.id ?? null,
      machineNumber: machine?.machineNumber ?? null,
      machineName: machine?.name ?? null,
    };
  });
};
