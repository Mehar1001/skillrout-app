import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: 'Skillrout Collections Report',
  });
};
