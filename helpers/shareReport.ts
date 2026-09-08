import { Platform } from 'react-native';
import type { RefObject } from 'react';
import { ScrollView } from 'react-native';
import { Visit } from '../types';
import { ReportSummary } from './reportTemplate';

// Import platform-specific implementations
import { shareReportJpeg as nativeShareReportJpeg, shareReportPdf as nativeShareReportPdf } from './shareReport.native';
import { shareReportJpeg as webShareReportJpeg, shareReportPdf as webShareReportPdf } from './shareReport.web';

// Platform-aware wrapper for JPEG sharing
export const shareReportJpeg = async (
  reportRef: RefObject<ScrollView | null>,
  summary?: ReportSummary,
  startDate?: string,
  endDate?: string,
  businessName?: string
) => {
  if (Platform.OS === 'web') {
    if (!summary || !startDate || !endDate) {
      throw new Error('Summary, start date, and end date are required for web JPEG sharing.');
    }
    return webShareReportJpeg(summary, startDate, endDate, businessName);
  }
  return nativeShareReportJpeg(reportRef);
};

// Platform-aware wrapper for PDF sharing
export const shareReportPdf = async (
  summary: ReportSummary,
  startDate: string,
  endDate: string,
  businessName?: string
) => {
  if (Platform.OS === 'web') {
    return webShareReportPdf(summary, startDate, endDate, businessName);
  }
  return nativeShareReportPdf(summary, startDate, endDate, businessName);
};
