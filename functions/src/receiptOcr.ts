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

const ocrDigitChars = (value: string) =>
  value
    .replace(/[Oo]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Zz]/g, '2')
    .replace(/[B]/g, '8')
    .replace(/[G]/g, '6')
    .replace(/[q]/g, '9')
    .replace(/[T]/g, '1');

export const normalizeMachineNumber = (value: string) => {
  const fixed = ocrDigitChars(value);
  const normalized = fixed.replace(/[<>\[\](){}\s]/g, '').replace(/^0+(?=\d)/, '');
  return normalized || '0';
};

const parseAmount = (value: string): number | null => {
  let s = ocrDigitChars(value)
    .replace(/[$\s]/g, '')
    .replace(/[^\d.,]/g, '');
  if (!s) return null;

  // Try to find a decimal at the end: the last . or , followed by 1-2 digits
  const decimalMatch = s.match(/^([\d.,]*)([.,])(\d{1,2})$/);
  if (decimalMatch) {
    const int = decimalMatch[1].replace(/[.,]/g, '');
    const dec = decimalMatch[3].padEnd(2, '0');
    const amount = Number(`${int}.${dec}`);
    return Number.isFinite(amount) ? round2(amount) : null;
  }

  // No decimal: treat all delimiters as thousands separators
  if (/^[\d.,]+$/.test(s)) {
    const int = s.replace(/[.,]/g, '');
    const amount = Number(int);
    return Number.isFinite(amount) ? round2(amount) : null;
  }

  return null;
};

// Allow common OCR misreads (O->0, l->1, etc.) inside the amount token.
const AMOUNT_PATTERN = /(?:\$\s*)?\d[\d,.\sOoIlSsZzBgqT]*(?:[.,]\d{1,2})?/g;

const amountFromLabel = (lines: string[], startIndex: number, label: RegExp) => {
  const end = Math.min(lines.length, startIndex + 8);
  for (let index = startIndex; index < end; index += 1) {
    const line = lines[index];
    const searchable = index === startIndex ? line.replace(label, '') : line;
    const matches = Array.from(searchable.matchAll(AMOUNT_PATTERN));
    if (!matches.length) continue;
    // On the label line prefer the last amount (most likely the value after the label);
    // on nearby lines prefer the first amount found.
    const candidates = index === startIndex ? matches.slice().reverse() : matches;
    for (const match of candidates) {
      const amount = parseAmount(match[0]);
      if (amount !== null) return amount;
    }
  }
  return null;
};

const findAmount = (lines: string[], labels: RegExp[]) => {
  for (const label of labels) {
    const index = lines.findIndex(line => label.test(line));
    if (index < 0) continue;
    const amount = amountFromLabel(lines, index, label);
    if (amount !== null) return amount;
  }
  return null;
};

const IN_LABELS = [
  /credits?\s+(?:in|ln)/i,
  /money\s+in/i,
  /total\s+in/i,
  /cash\s+in/i,
  /paid\s+in/i,
  /(?:^|\s)in(?:\s+total)?(?:\s|$)/i,
  /credits?/i,
];

const OUT_LABELS = [
  /total\s+paid/i,
  /money\s+out/i,
  /total\s+out/i,
  /cash\s+out/i,
  /paid\s+out/i,
  /payout/i,
  /(?:^|\s)out(?:\s+total)?(?:\s|$)/i,
  /(?:^|\s)paid(?!\s*in)(?:\s+out)?(?:\s|$)/i,
];

// Match a totals header, but not labels like 'Total Paid', 'Total In', 'Total Out'.
const TOTALS_HEADER_PATTERN = /(?:machine\s+)?(?:totals?|summary)(?!\s+(?:paid|in|out))/i;

const sectionHeader = (line: string) => {
  const patterns = [
    /^\s*(?:machine\s*)?#?\s*(\d{1,8})\s*(?:[:.\-])?\s*$/i,
    /^\s*#?\s*(\d{1,8})\s*(?:[:.\-])?\s*$/,
    /^\s*machine\s+#?\s*(\d{1,8})\b/i,
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
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
    const totalsIndex = lines.findIndex((line, index) => index > header.index && TOTALS_HEADER_PATTERN.test(line));
    const end = totalsIndex >= 0 ? Math.min(nextHeader, totalsIndex) : nextHeader;
    const section = lines.slice(header.index + 1, end);
    const machineNumber = normalizeMachineNumber(header.number);
    const candidateWarnings: string[] = [];
    const presentIn = findAmount(section, IN_LABELS);
    const presentOut = findAmount(section, OUT_LABELS);
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

  if (candidates.length === 0) {
    const totalsIndex = lines.findIndex(line => TOTALS_HEADER_PATTERN.test(line));
    const section = totalsIndex >= 0 ? lines.slice(0, totalsIndex) : lines;
    const presentIn = findAmount(section, IN_LABELS);
    const presentOut = findAmount(section, OUT_LABELS);
    const candidateWarnings: string[] = [];
    if (presentIn === null) candidateWarnings.push('Credits In was not found.');
    if (presentOut === null) candidateWarnings.push('Total Paid was not found.');
    if (confidence > 0 && confidence < 0.65) candidateWarnings.push('Low OCR confidence — verify both values carefully.');
    candidates.push({
      receiptMachineNumber: normalizeMachineNumber(fallbackMachineNumber ?? 'UNKNOWN'),
      presentIn,
      presentOut,
      confidence,
      warnings: candidateWarnings,
    });
  }

  if (candidates.length === 0) warnings.push('No numbered machine sections were found.');

  const totalsStart = lines.findIndex(line => TOTALS_HEADER_PATTERN.test(line));
  const totalsLines = totalsStart >= 0 ? lines.slice(totalsStart + 1) : [];
  const moneyOut = findAmount(totalsLines, OUT_LABELS);
  const moneyIn = findAmount(totalsLines, IN_LABELS);
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
