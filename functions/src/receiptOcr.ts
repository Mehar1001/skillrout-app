export interface ReceiptReadingCandidate {
  receiptMachineNumber: string;
  presentIn: number | null;
  presentOut: number | null;
  confidence: number;
  warnings: string[];
}

export interface ReceiptTotals {
  moneyIn: number | null;
  moneyOut: number | null;
  extractedIn: number;
  extractedOut: number;
  inMatches: boolean | null;
  outMatches: boolean | null;
}

export interface ReceiptOcrResult {
  candidates: ReceiptReadingCandidate[];
  totals: ReceiptTotals;
  confidence: number;
  warnings: string[];
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const normalizeMachineNumber = (value: string) => {
  const normalized = value.replace(/[<>\[\](){}\s]/g, '').replace(/^0+(?=\d)/, '');
  return normalized || '0';
};

const parseAmount = (value: string): number | null => {
  const normalized = value
    .replace(/[Oo](?=\d|[.,])/g, '0')
    .replace(/(?<=\d)[Oo]/g, '0')
    .replace(/\s/g, '')
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? round2(amount) : null;
};

const amountFromLabel = (lines: string[], startIndex: number, label: RegExp) => {
  for (let index = startIndex; index < Math.min(lines.length, startIndex + 3); index += 1) {
    const line = lines[index];
    const searchable = index === startIndex ? line.replace(label, '') : line;
    const matches = searchable.match(/(?:\$\s*)?\d[\d,\s]*(?:[.]\d{1,2})/g);
    if (!matches?.length) continue;
    const amount = parseAmount(matches[matches.length - 1]);
    if (amount !== null) return amount;
  }
  return null;
};

const sectionHeader = (line: string) => {
  const match = line.match(/^\s*[<\[({]?\s*(\d{1,8})\s*[>\])}]?\s*$/);
  return match?.[1] ?? null;
};

const findAmount = (lines: string[], label: RegExp) => {
  const index = lines.findIndex(line => label.test(line));
  if (index < 0) return null;
  return amountFromLabel(lines, index, label);
};

export const parseReceiptText = (text: string, confidence = 0, fallbackMachineNumber?: string): ReceiptOcrResult => {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const headers = lines
    .map((line, index) => ({ index, number: sectionHeader(line) }))
    .filter((header): header is { index: number; number: string } => Boolean(header.number));
  const candidates: ReceiptReadingCandidate[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  headers.forEach((header, position) => {
    const nextHeader = headers[position + 1]?.index ?? lines.length;
    const totalsIndex = lines.findIndex((line, index) => index > header.index && /machine\s+totals/i.test(line));
    const end = totalsIndex >= 0 ? Math.min(nextHeader, totalsIndex) : nextHeader;
    const section = lines.slice(header.index + 1, end);
    const machineNumber = normalizeMachineNumber(header.number);
    const candidateWarnings: string[] = [];
    const presentIn = findAmount(section, /credits\s+(?:in|ln)/i);
    const presentOut = findAmount(section, /total\s+paid/i);
    if (seen.has(machineNumber)) candidateWarnings.push('Duplicate machine section found.');
    if (presentIn === null) candidateWarnings.push('Credits In was not found.');
    if (presentOut === null) candidateWarnings.push('Total Paid was not found.');
    if (confidence > 0 && confidence < 0.65) candidateWarnings.push('Low OCR confidence — verify both values carefully.');
    seen.add(machineNumber);
    candidates.push({
      receiptMachineNumber: machineNumber,
      presentIn,
      presentOut,
      confidence,
      warnings: candidateWarnings,
    });
  });

  if (candidates.length === 0 && fallbackMachineNumber) {
    const totalsIndex = lines.findIndex(line => /machine\s+totals/i.test(line));
    const section = totalsIndex >= 0 ? lines.slice(0, totalsIndex) : lines;
    const presentIn = findAmount(section, /credits\s+(?:in|ln)/i);
    const presentOut = findAmount(section, /total\s+paid/i);
    const candidateWarnings: string[] = [];
    if (presentIn === null) candidateWarnings.push('Credits In was not found.');
    if (presentOut === null) candidateWarnings.push('Total Paid was not found.');
    if (confidence > 0 && confidence < 0.65) candidateWarnings.push('Low OCR confidence — verify both values carefully.');
    candidates.push({
      receiptMachineNumber: normalizeMachineNumber(fallbackMachineNumber),
      presentIn,
      presentOut,
      confidence,
      warnings: candidateWarnings,
    });
  }
  if (candidates.length === 0) warnings.push('No numbered machine sections were found.');
  const totalsStart = lines.findIndex(line => /machine\s+totals/i.test(line));
  const totalsLines = totalsStart >= 0 ? lines.slice(totalsStart + 1) : [];
  const moneyOut = findAmount(totalsLines, /money\s+out/i);
  const moneyIn = findAmount(totalsLines, /money\s+in/i);
  const extractedIn = round2(candidates.reduce((sum, candidate) => sum + (candidate.presentIn ?? 0), 0));
  const extractedOut = round2(candidates.reduce((sum, candidate) => sum + (candidate.presentOut ?? 0), 0));
  const inMatches = moneyIn === null ? null : Math.abs(moneyIn - extractedIn) < 0.01;
  const outMatches = moneyOut === null ? null : Math.abs(moneyOut - extractedOut) < 0.01;

  if (moneyIn === null || moneyOut === null) warnings.push('Machine totals could not be fully verified.');
  if (inMatches === false) warnings.push('Credits In rows do not match receipt Money In.');
  if (outMatches === false) warnings.push('Total Paid rows do not match receipt Money Out.');

  return {
    candidates,
    totals: { moneyIn, moneyOut, extractedIn, extractedOut, inMatches, outMatches },
    confidence,
    warnings,
  };
};
