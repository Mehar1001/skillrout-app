import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { ScrollView } from 'react-native';
import type { RefObject } from 'react';
import { generateReportHtml, ReportSummary } from './reportTemplate';

const shareFile = async (uri: string, mimeType: string, UTI: string, title: string) => {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle: title });
};

export const shareReportPdf = async (summary: ReportSummary, startDate: string, endDate: string, businessName?: string) => {
  const { uri } = await Print.printToFileAsync({ html: generateReportHtml(summary, startDate, endDate, businessName) });
  const pdfUri = `${FileSystem.cacheDirectory}skillrout-report-${startDate}-to-${endDate}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: pdfUri });
  await shareFile(pdfUri, 'application/pdf', 'com.adobe.pdf', 'Skillrout Report');
};

export const shareReportJpeg = async (
  reportRef: RefObject<ScrollView | null>,
  summary?: ReportSummary,
  startDate?: string,
  endDate?: string,
  businessName?: string
) => {
  const uri = await captureRef(reportRef, {
    format: 'jpg',
    quality: 0.92,
    result: 'tmpfile',
    snapshotContentContainer: true,
  });
  await shareFile(uri, 'image/jpeg', 'public.jpeg', 'Skillrout Report');
};
