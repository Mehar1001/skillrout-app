import * as XLSX from 'xlsx';
import { ShiftMachineDetailRow, ShiftReportSummary, ShiftStoreDetailRow } from './shiftReport';
import { buildShiftReportWorkbook } from './excelExport';

const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ensureXlsxFilename = (filename: string) =>
  filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;

export const shareReportExcel = async (
  summary: ShiftReportSummary,
  storeDetail: ShiftStoreDetailRow[],
  machineDetail: ShiftMachineDetailRow[],
  filename: string
) => {
  const wb = buildShiftReportWorkbook(summary, storeDetail, machineDetail);
  const safeFilename = ensureXlsxFilename(filename);
  const workbook = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([workbook], { type: excelMimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  anchor.type = excelMimeType;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
