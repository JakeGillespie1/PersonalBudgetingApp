import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { guestSessionManager } from '../utils/guestSession';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  convertGuestToAccount: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isGuest: false,
  signOut: async () => {},
  convertGuestToAccount: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      
      // Start guest session management if user is anonymous
      if (u?.isAnonymous) {
        guestSessionManager.startSession();
      }
    });
    return () => unsub();
  }, []);

  const isGuest = useMemo(() => {
    return user?.isAnonymous || false;
  }, [user]);

  const convertGuestToAccount = async (email: string, password: string) => {
    if (!user?.isAnonymous) {
      throw new Error('User is not a guest');
    }
    
    // Import the necessary Firebase auth functions
    const { EmailAuthProvider, linkWithCredential } = await import('firebase/auth');
    
    // Create credential for the new account
    const credential = EmailAuthProvider.credential(email, password);
    
    // Link the anonymous account to the email/password account
    await linkWithCredential(user, credential);
  };

  const value = useMemo(() => ({
    user,
    loading,
    isGuest,
    signOut: () => firebaseSignOut(auth),
    convertGuestToAccount,
  }), [user, loading, isGuest]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}


