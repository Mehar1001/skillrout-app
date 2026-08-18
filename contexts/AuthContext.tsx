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
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  ownerId: null,
  businessName: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
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
        } else {
          const empSnap = await getDoc(doc(db, 'employees', u.uid));
          if (empSnap.exists()) {
            setRole('employee');
            setOwnerId(empSnap.data().ownerId || null);
            setBusinessName(empSnap.data().businessName || null);
          } else {
            setRole(null);
            setOwnerId(null);
            setBusinessName(null);
          }
        }
      } else {
        setRole(null);
        setOwnerId(null);
        setBusinessName(null);
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
  };

  return (
    <AuthContext.Provider value={{ user, role, ownerId, businessName, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
