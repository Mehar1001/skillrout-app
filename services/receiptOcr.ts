import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { ReceiptOcrResponse } from '../types';

interface ReceiptImageAsset {
  uri: string;
  width: number;
  height: number;
}

interface ExtractReceiptRequest {
  storeId: string;
  imageBase64: string;
  mimeType: 'image/jpeg';
  targetMachineNumber?: string;
}

export interface PreparedReceiptImage {
  uri: string;
  base64: string;
  mimeType: 'image/jpeg';
}

const extractReceiptReadings = httpsCallable<ExtractReceiptRequest, ReceiptOcrResponse>(
  functions,
  'extractReceiptReadings'
);

export const prepareReceiptImage = async (asset: ReceiptImageAsset): Promise<PreparedReceiptImage> => {
  const context = ImageManipulator.manipulate(asset.uri);
  const longestEdge = Math.max(asset.width, asset.height);
  if (longestEdge > 2000) {
    if (asset.width >= asset.height) context.resize({ width: 2000 });
    else context.resize({ height: 2000 });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ base64: true, compress: 0.84, format: SaveFormat.JPEG });
  if (!saved.base64) throw new Error('The receipt image could not be prepared.');
  if (saved.base64.length > 5_600_000) throw new Error('The receipt image is too large. Retake it closer to the receipt.');
  return { uri: saved.uri, base64: saved.base64, mimeType: 'image/jpeg' };
};

export const readReceiptImage = async (
  storeId: string,
  image: PreparedReceiptImage,
  targetMachineNumber?: string
): Promise<ReceiptOcrResponse> => {
  const response = await extractReceiptReadings({
    storeId,
    imageBase64: image.base64,
    mimeType: image.mimeType,
    targetMachineNumber,
  });
  return response.data;
};
