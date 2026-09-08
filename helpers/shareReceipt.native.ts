import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { View } from 'react-native';
import type { RefObject } from 'react';
import { generateReceiptHtml, type LastClearedInfo } from './receiptTemplate';
import { markPrinted } from '../services/visits';
import { Visit } from '../types';

const shareFile = async (uri: string, mimeType: string, UTI: string) => {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType, UTI });
};

export const shareReceiptPdf = async (
  ownerId: string,
  visit: Visit,
  userId: string,
  lastCleared?: LastClearedInfo | null
) => {
  await markPrinted(ownerId, visit.storeId, visit.id, userId);
  const { uri } = await Print.printToFileAsync({ html: generateReceiptHtml(visit, lastCleared) });
  const pdfUri = `${FileSystem.cacheDirectory}skillrout-receipt-${visit.id}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: pdfUri });
  await shareFile(pdfUri, 'application/pdf', 'com.adobe.pdf');
};

export const shareReceiptJpeg = async (
  ownerId: string,
  visit: Visit,
  userId: string,
  receiptRef: RefObject<View | null>,
  lastCleared?: LastClearedInfo | null
) => {
  await markPrinted(ownerId, visit.storeId, visit.id, userId);
  const uri = await captureRef(receiptRef, { format: 'jpg', quality: 0.92, result: 'tmpfile' });
  await shareFile(uri, 'image/jpeg', 'public.jpeg');
};
