import type { RefObject } from 'react';
import { View } from 'react-native';
import { Visit } from '../types';
import { type LastClearedInfo } from './receiptTemplate';

// Check if we're on web platform
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

// Dynamic imports based on platform to avoid loading native modules on web
const loadNativeImplementation = async () => {
  if (isWeb) return null;
  return (await import('./shareReceipt.native'));
};

const loadWebImplementation = async () => {
  if (!isWeb) return null;
  return (await import('./shareReceipt.web'));
};

// Platform-aware wrapper for JPEG sharing
export const shareReceiptJpeg = async (
  ownerId: string,
  visit: Visit,
  userId: string,
  receiptRef: RefObject<View | null>,
  lastCleared?: LastClearedInfo | null
) => {
  console.log('shareReceiptJpeg called, isWeb:', isWeb, 'visitId:', visit.id);
  if (isWeb) {
    console.log('Loading web implementation');
    const webImpl = await loadWebImplementation();
    console.log('Web implementation loaded:', !!webImpl);
    if (webImpl) {
      return webImpl.shareReceiptJpeg(ownerId, visit, userId, lastCleared);
    }
  }
  console.log('Loading native implementation');
  const nativeImpl = await loadNativeImplementation();
  console.log('Native implementation loaded:', !!nativeImpl);
  if (nativeImpl) {
    return nativeImpl.shareReceiptJpeg(ownerId, visit, userId, receiptRef, lastCleared);
  }
  throw new Error('No platform implementation available for JPEG sharing');
};

// Platform-aware wrapper for PDF sharing
export const shareReceiptPdf = async (
  ownerId: string,
  visit: Visit,
  userId: string,
  lastCleared?: LastClearedInfo | null
) => {
  console.log('shareReceiptPdf called, isWeb:', isWeb, 'visitId:', visit.id);
  if (isWeb) {
    console.log('Loading web implementation');
    const webImpl = await loadWebImplementation();
    console.log('Web implementation loaded:', !!webImpl);
    if (webImpl) {
      return webImpl.shareReceiptPdf(ownerId, visit, userId, lastCleared);
    }
  }
  console.log('Loading native implementation');
  const nativeImpl = await loadNativeImplementation();
  console.log('Native implementation loaded:', !!nativeImpl);
  if (nativeImpl) {
    return nativeImpl.shareReceiptPdf(ownerId, visit, userId, lastCleared);
  }
  throw new Error('No platform implementation available for PDF sharing');
};
