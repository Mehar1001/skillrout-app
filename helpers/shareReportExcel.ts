import { ShiftMachineDetailRow, ShiftReportSummary, ShiftStoreDetailRow } from './shiftReport';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

const loadNativeImplementation = async () => {
  if (isWeb) return null;
  return (await import('./shareReportExcel.native'));
};

const loadWebImplementation = async () => {
  if (!isWeb) return null;
  return (await import('./shareReportExcel.web'));
};

export const shareReportExcel = async (
  summary: ShiftReportSummary,
  storeDetail: ShiftStoreDetailRow[],
  machineDetail: ShiftMachineDetailRow[],
  startDate: string,
  endDate: string,
  businessName?: string
) => {
  const filename = `${businessName ? `${businessName.replace(/\s+/g, '-')}-` : ''}skillrout-collections-${startDate}-to-${endDate}.xlsx`;
  if (isWeb) {
    const webImpl = await loadWebImplementation();
    if (webImpl) return webImpl.shareReportExcel(summary, storeDetail, machineDetail, filename);
  }
  const nativeImpl = await loadNativeImplementation();
  if (nativeImpl) return nativeImpl.shareReportExcel(summary, storeDetail, machineDetail, filename);
  throw new Error('No platform implementation available for Excel sharing');
};
