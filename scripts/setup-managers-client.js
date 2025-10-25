/**
 * Client-side script to set up manager accounts
 *
 * This script runs in the browser console while you're logged in
 * to update your own account to Manager role.
 *
 * INSTRUCTIONS:
 * 1. Log in to the app as brad.towers@simprogroup.com
 * 2. Open browser dev tools console
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Repeat for bradptowers@gmail.com
 */

import { getFirestore, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();

async function setupCurrentUserAsManager() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('No user logged in! Please log in first.');
    return;
  }

  try {
    const userRef = doc(db, 'users', currentUser.uid);

    await setDoc(userRef, {
      email: currentUser.email,
      displayName: currentUser.displayName || currentUser.email.split('@')[0],
      role: 'Manager',
      managedSeIds: [],
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log(`✓ Successfully set ${currentUser.email} as Manager!`);
    console.log('Please refresh the page to see changes.');

  } catch (error) {
    console.error('Error setting up manager:', error);
  }
}

setupCurrentUserAsManager();
