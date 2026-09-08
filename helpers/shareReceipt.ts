import { Platform } from 'react-native';
import type { RefObject } from 'react';
import { View } from 'react-native';
import { Visit } from '../types';
import { type LastClearedInfo } from './receiptTemplate';

// Import platform-specific implementations
import { shareReceiptJpeg as nativeShareReceiptJpeg, shareReceiptPdf as nativeShareReceiptPdf } from './shareReceipt.native';
import { shareReceiptJpeg as webShareReceiptJpeg, shareReceiptPdf as webShareReceiptPdf } from './shareReceipt.web';

// Platform-aware wrapper for JPEG sharing
export const shareReceiptJpeg = async (
  ownerId: string,
  visit: Visit,
  userId: string,
  receiptRef: RefObject<View | null>,
  lastCleared?: LastClearedInfo | null
) => {
  if (Platform.OS === 'web') {
    return webShareReceiptJpeg(ownerId, visit, userId, lastCleared);
  }
  return nativeShareReceiptJpeg(ownerId, visit, userId, receiptRef);
};

// Platform-aware wrapper for PDF sharing
export const shareReceiptPdf = async (
  ownerId: string,
  visit: Visit,
  userId: string,
  lastCleared?: LastClearedInfo | null
) => {
  if (Platform.OS === 'web') {
    return webShareReceiptPdf(ownerId, visit, userId, lastCleared);
  }
  return nativeShareReceiptPdf(ownerId, visit, userId, lastCleared);
};
