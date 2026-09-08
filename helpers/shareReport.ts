import type { RefObject } from 'react';
import { ScrollView } from 'react-native';
import { Visit } from '../types';
import { ReportSummary } from './reportTemplate';

// Check if we're on web platform
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

// Dynamic imports based on platform to avoid loading native modules on web
const loadNativeImplementation = async () => {
  if (isWeb) return null;
  return (await import('./shareReport.native'));
};

const loadWebImplementation = async () => {
  if (!isWeb) return null;
  return (await import('./shareReport.web'));
};

// Platform-aware wrapper for JPEG sharing
export const shareReportJpeg = async (
  reportRef: RefObject<ScrollView | null>,
  summary?: ReportSummary,
  startDate?: string,
  endDate?: string,
  businessName?: string
) => {
  if (isWeb) {
    if (!summary || !startDate || !endDate) {
      throw new Error('Summary, start date, and end date are required for web JPEG sharing.');
    }
    const webImpl = await loadWebImplementation();
    if (webImpl) {
      return webImpl.shareReportJpeg(summary, startDate, endDate, businessName);
    }
  }
  const nativeImpl = await loadNativeImplementation();
  if (nativeImpl) {
    return nativeImpl.shareReportJpeg(reportRef, summary, startDate, endDate, businessName);
  }
  throw new Error('No platform implementation available for JPEG sharing');
};

// Platform-aware wrapper for PDF sharing
export const shareReportPdf = async (
  summary: ReportSummary,
  startDate: string,
  endDate: string,
  businessName?: string
) => {
  if (isWeb) {
    const webImpl = await loadWebImplementation();
    if (webImpl) {
      return webImpl.shareReportPdf(summary, startDate, endDate, businessName);
    }
  }
  const nativeImpl = await loadNativeImplementation();
  if (nativeImpl) {
    return nativeImpl.shareReportPdf(summary, startDate, endDate, businessName);
  }
  throw new Error('No platform implementation available for PDF sharing');
};
