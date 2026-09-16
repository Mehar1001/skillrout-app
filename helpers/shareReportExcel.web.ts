import * as XLSX from 'xlsx';
import { ShiftMachineDetailRow, ShiftReportSummary, ShiftStoreDetailRow } from './shiftReport';
import { buildShiftReportWorkbook } from './excelExport';

export const shareReportExcel = async (
  summary: ShiftReportSummary,
  storeDetail: ShiftStoreDetailRow[],
  machineDetail: ShiftMachineDetailRow[],
  filename: string
) => {
  const wb = buildShiftReportWorkbook(summary, storeDetail, machineDetail);
  XLSX.writeFile(wb, filename);
};
