import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Activity } from '../types';

const getActivitiesRef = (ownerId: string) =>
  collection(db, `owners/${ownerId}/activities`);

export const listActivities = async (
  ownerId: string,
  options?: {
    pageSize?: number;
    storeId?: string;
    visitId?: string;
    machineId?: string;
    action?: string;
  }
): Promise<Activity[]> => {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (options?.storeId) constraints.push(where('storeId', '==', options.storeId));
  if (options?.visitId) constraints.push(where('visitId', '==', options.visitId));
  if (options?.machineId) constraints.push(where('machineId', '==', options.machineId));
  if (options?.action) constraints.push(where('action', '==', options.action));
  constraints.push(limit(options?.pageSize ?? 200));

  const snapshot = await getDocs(query(getActivitiesRef(ownerId), ...constraints));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
};