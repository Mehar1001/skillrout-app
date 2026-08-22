import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebaseConfig';

export interface UploadedVisitPhoto {
  photoUrl: string;
  photoPath: string;
}

const uploadPhoto = async (photoPath: string, uri: string): Promise<UploadedVisitPhoto> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const photoRef = ref(storage, photoPath);
  await uploadBytes(photoRef, blob, { contentType: blob.type || 'image/jpeg' });
  return { photoUrl: await getDownloadURL(photoRef), photoPath };
};

export const uploadVisitPhoto = async (
  ownerId: string,
  storeId: string,
  visitId: string,
  machineId: string,
  uri: string
): Promise<UploadedVisitPhoto> =>
  uploadPhoto(`owners/${ownerId}/stores/${storeId}/visits/${visitId}/machines/${machineId}/reading.jpg`, uri);

export const uploadVisitReceipt = async (
  ownerId: string,
  storeId: string,
  visitId: string,
  uri: string
): Promise<UploadedVisitPhoto> =>
  uploadPhoto(`owners/${ownerId}/stores/${storeId}/visits/${visitId}/receipt/source.jpg`, uri);
