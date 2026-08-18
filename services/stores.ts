import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Store } from '../types';

const getStoresRef = (ownerId: string) => collection(db, `owners/${ownerId}/stores`);

export const getStore = async (ownerId: string, storeId: string): Promise<Store | null> => {
  const snap = await getDoc(doc(db, `owners/${ownerId}/stores`, storeId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Store) : null;
};

export const listStores = async (ownerId: string): Promise<Store[]> => {
  const snapshot = await getDocs(getStoresRef(ownerId));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Store));
};

export const saveStore = async (
  ownerId: string,
  store: Partial<Store>
): Promise<string> => {
  const id = store.id || doc(getStoresRef(ownerId)).id;
  const ref = doc(db, `owners/${ownerId}/stores`, id);
  const data = {
    name: store.name || '',
    address: store.address || '',
    active: store.active ?? true,
    defaultStorePercent: store.defaultStorePercent ?? 50,
    defaultVendorPercent: store.defaultVendorPercent ?? 50,
    updatedAt: serverTimestamp(),
    ...(store.id ? {} : { createdAt: serverTimestamp() }),
  };
  await setDoc(ref, data, { merge: true });
  return id;
};

export const updateStore = async (
  ownerId: string,
  storeId: string,
  updates: Partial<Store>
): Promise<void> => {
  const ref = doc(db, `owners/${ownerId}/stores`, storeId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteStore = async (ownerId: string, storeId: string): Promise<void> => {
  await deleteDoc(doc(db, `owners/${ownerId}/stores`, storeId));
};
