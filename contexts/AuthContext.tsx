import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  ownerId: string | null;
  businessName: string | null;
  assignedStoreIds: string[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  ownerId: null,
  businessName: null,
  assignedStoreIds: [],
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [assignedStoreIds, setAssignedStoreIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ownerSnap = await getDoc(doc(db, 'owners', u.uid));
        if (ownerSnap.exists()) {
          setRole('owner');
          setOwnerId(u.uid);
          setBusinessName(ownerSnap.data().businessName || null);
          setAssignedStoreIds([]);
        } else {
          const empSnap = await getDoc(doc(db, 'employees', u.uid));
          if (empSnap.exists()) {
            setRole('employee');
            setOwnerId(empSnap.data().ownerId || null);
            setBusinessName(empSnap.data().businessName || null);
            setAssignedStoreIds(empSnap.data().assignedStoreIds || []);
          } else {
            setRole(null);
            setOwnerId(null);
            setBusinessName(null);
            setAssignedStoreIds([]);
          }
        }
      } else {
        setRole(null);
        setOwnerId(null);
        setBusinessName(null);
        setAssignedStoreIds([]);
      }
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
    setOwnerId(null);
    setBusinessName(null);
    setAssignedStoreIds([]);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, ownerId, businessName, assignedStoreIds, loading, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
