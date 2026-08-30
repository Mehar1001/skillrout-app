import { Machine, ReceiptOcrCandidate } from '../types';

export interface ReceiptReviewRow extends ReceiptOcrCandidate {
  machineId: string | null;
  machineNumber: string | null;
  machineName: string | null;
}

const ocrDigitFix = (value: string) =>
  value
    .replace(/[Oo]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Zz]/g, '2')
    .replace(/[B]/g, '8')
    .replace(/[G]/g, '6')
    .replace(/[q]/g, '9')
    .replace(/[T]/g, '1');

export const normalizeReceiptMachineNumber = (value: string) => {
  const fixed = ocrDigitFix(value);
  const normalized = fixed.replace(/[<>\[\](){}\s]/g, '').replace(/^0+(?=\d)/, '');
  return normalized || '0';
};

const levenshtein = (a: string, b: string) => {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

export const matchReceiptCandidates = (
  machines: Machine[],
  candidates: ReceiptOcrCandidate[]
): ReceiptReviewRow[] => {
  return candidates.map(candidate => {
    const target = normalizeReceiptMachineNumber(candidate.receiptMachineNumber);
    const exactMatches = machines.filter(
      machine => normalizeReceiptMachineNumber(machine.machineNumber) === target
    );
    const warnings = [...candidate.warnings];

    if (exactMatches.length === 1) {
      return {
        ...candidate,
        warnings,
        machineId: exactMatches[0].id,
        machineNumber: exactMatches[0].machineNumber,
        machineName: exactMatches[0].name,
      };
    }

    if (exactMatches.length === 0) {
      const maxDistance = Math.max(1, Math.floor(target.length / 3));
      const matches = machines
        .map(machine => ({
          machine,
          distance: levenshtein(target, normalizeReceiptMachineNumber(machine.machineNumber)),
        }))
        .filter(item => item.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);

      if (matches.length === 0) {
        warnings.push(`Machine ${candidate.receiptMachineNumber} is not configured for this store.`);
      } else if (matches.length === 1) {
        warnings.push(`Fuzzy match used for ${candidate.receiptMachineNumber} → ${matches[0].machine.machineNumber}.`);
        return {
          ...candidate,
          warnings,
          machineId: matches[0].machine.id,
          machineNumber: matches[0].machine.machineNumber,
          machineName: matches[0].machine.name,
        };
      } else {
        warnings.push(`Machine ${candidate.receiptMachineNumber} matches more than one configured machine.`);
      }
    } else {
      warnings.push(`Machine ${candidate.receiptMachineNumber} matches more than one configured machine.`);
    }

    return {
      ...candidate,
      warnings,
      machineId: null,
      machineNumber: null,
      machineName: null,
    };
  });
};
