import { collection, doc, documentId, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
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

export const listAssignedStores = async (
  ownerId: string,
  assignedStoreIds: string[]
): Promise<Store[]> => {
  if (assignedStoreIds.length === 0) return [];
  const snapshots = await Promise.all(
    Array.from({ length: Math.ceil(assignedStoreIds.length / 10) }, (_, index) =>
      getDocs(
        query(
          getStoresRef(ownerId),
          where(documentId(), 'in', assignedStoreIds.slice(index * 10, index * 10 + 10))
        )
      )
    )
  );
  return snapshots.flatMap(snapshot =>
    snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Store))
  );
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
    phone: store.phone?.trim() || null,
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

export const setStoreActive = async (
  ownerId: string,
  storeId: string,
  active: boolean
): Promise<void> => {
  await updateDoc(doc(db, `owners/${ownerId}/stores`, storeId), {
    active,
    updatedAt: serverTimestamp(),
    ...(active
      ? { reactivatedAt: serverTimestamp() }
      : { deactivatedAt: serverTimestamp() }),
  });
};
