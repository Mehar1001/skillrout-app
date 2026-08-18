import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ownerSnap = await getDoc(doc(db, 'owners', u.uid));
        if (ownerSnap.exists()) {
          setRole('owner');
        } else {
          // Check if this auth uid exists as an employee under some owner
          // Employee uid is the auth uid; doc id = uid in employees/{employeeId}
          const empSnap = await getDoc(doc(db, 'employees', u.uid));
          if (empSnap.exists()) {
            setRole('employee');
          } else {
            setRole(null);
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
