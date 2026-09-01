import { onIdTokenChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc, getDocs, onSnapshot, query, where, type DocumentSnapshot } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  ownerId: string | null;
  businessName: string | null;
  employeeName: string | null;
  email: string | null;
  assignedStoreIds: string[];
  mustChangePassword: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  ownerId: null,
  businessName: null,
  employeeName: null,
  email: null,
  assignedStoreIds: [],
  mustChangePassword: false,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [assignedStoreIds, setAssignedStoreIds] = useState<string[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;
    const clearProfile = () => {
      setRole(null);
      setOwnerId(null);
      setBusinessName(null);
      setEmployeeName(null);
      setEmail(null);
      setAssignedStoreIds([]);
      setMustChangePassword(false);
    };
    loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const unsubscribeAuth = onIdTokenChanged(auth, async u => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setUser(u);
      setLoading(true);
      clearTimeout(loadingTimeout);
      if (!u) {
        clearProfile();
        setLoading(false);
        return;
      }
      const getDocOrNull = async (collection: string, id: string): Promise<DocumentSnapshot | null> => {
        try {
          return await getDoc(doc(db, collection, id));
        } catch (error: any) {
          if (error.code === 'permission-denied') return null;
          throw error;
        }
      };
      try {
        await u.reload();
        const idToken = await u.getIdTokenResult(true);
        if (!idToken.claims.email_verified) {
          clearProfile();
          return;
        }
        const ownerRef = doc(db, 'owners', u.uid);
        const ownerSnap = await getDocOrNull('owners', u.uid);
        if (ownerSnap?.exists()) {
          const owner = ownerSnap.data();
          if (!u.emailVerified || owner.subscriptionStatus === 'inactive' || owner.status === 'inactive') {
            clearProfile();
            await firebaseSignOut(auth);
            return;
          }
          setRole('owner');
          setOwnerId(u.uid);
          setBusinessName(owner?.businessName || null);
          setEmail(u.email);
          setAssignedStoreIds([]);
          unsubscribeProfile = onSnapshot(ownerRef, snapshot => {
            const data = snapshot.data();
            if (!snapshot.exists() || data?.subscriptionStatus === 'inactive' || data?.status === 'inactive') {
              clearProfile();
              firebaseSignOut(auth);
              return;
            }
            setBusinessName(data?.businessName || null);
            setEmail(u.email);
          });
          return;
        }

        const pendingSnap = await getDocOrNull('pendingOwners', u.uid);
        if (pendingSnap?.exists()) {
          clearProfile();
          await firebaseSignOut(auth);
          return;
        }

        const employeeRef = doc(db, 'employees', u.uid);
        const employeeSnap = await getDoc(employeeRef);
        const employee = employeeSnap.data();
        if (!employeeSnap.exists() || employee?.active !== true || !employee.ownerId) {
          clearProfile();
          await firebaseSignOut(auth);
          return;
        }
        setRole('employee');
        setOwnerId(employee.ownerId);
        setBusinessName(employee.businessName || null);
        setEmployeeName(employee.name || null);
        setEmail(u.email);
        setAssignedStoreIds(employee.assignedStoreIds || []);
        setMustChangePassword(employee.mustChangePassword === true);
        unsubscribeProfile = onSnapshot(employeeRef, snapshot => {
          const data = snapshot.data();
          if (!snapshot.exists() || data?.active !== true || !data.ownerId) {
            clearProfile();
            firebaseSignOut(auth);
            return;
          }
          setOwnerId(data.ownerId);
          setBusinessName(data.businessName || null);
          setEmployeeName(data.name || null);
          setEmail(u.email);
          setAssignedStoreIds(data.assignedStoreIds || []);
          setMustChangePassword(data.mustChangePassword === true);
        });
      } catch {
        clearProfile();
      } finally {
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    });
    return () => {
      clearTimeout(loadingTimeout);
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
    setOwnerId(null);
    setBusinessName(null);
    setEmployeeName(null);
    setAssignedStoreIds([]);
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, ownerId, businessName, employeeName, email, assignedStoreIds, mustChangePassword, loading, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
