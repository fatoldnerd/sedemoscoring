import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timeout - setting loading to false');
      setLoading(false);
    }, 5000); // 5 second timeout

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeoutId); // Clear timeout if auth state changes
      setCurrentUser(user);

      try {
        if (user) {
          console.log('User authenticated:', user.email);
          // Check if user document exists, create if not
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            console.log('Creating new user document');
            // Create new user document with default SE role per PRD
            await setDoc(userDocRef, {
              email: user.email,
              name: user.displayName || user.email.split('@')[0],
              role: 'SE', // Default role on first login per PRD
              managerId: null, // Will be set by admin when assigning manager
              managedSeIds: [], // Empty for SEs
              createdAt: serverTimestamp()
            });
          }

          // Fetch user profile
          const updatedUserDoc = await getDoc(userDocRef);
          setUserProfile(updatedUserDoc.data());
          console.log('User profile loaded:', updatedUserDoc.data());
        } else {
          console.log('No user authenticated');
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Failed to fetch/create user profile:', error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
