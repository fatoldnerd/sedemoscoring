import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Create a new user document on first login
 * @param {string} uid - User's Firebase Auth UID
 * @param {Object} userData - User data (email, name)
 * @returns {Promise<void>}
 */
export const createUser = async (uid, userData) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    email: userData.email,
    name: userData.displayName || userData.email.split('@')[0],
    role: 'SE', // Default role on first login
    managerId: null, // Will be set by admin when assigning manager
    managedSeIds: [], // Empty for SEs, populated for Managers
    createdAt: new Date()
  });
};

/**
 * Get user document by UID
 * @param {string} uid - User's Firebase Auth UID
 * @returns {Promise<Object|null>}
 */
export const getUserById = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
};

/**
 * Update user role (Admin function)
 * @param {string} uid - User's Firebase Auth UID
 * @param {string} role - 'SE' or 'Manager'
 * @returns {Promise<void>}
 */
export const updateUserRole = async (uid, role) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { role });
};

/**
 * Update manager's list of managed SEs (Admin function)
 * @param {string} managerId - Manager's UID
 * @param {Array<string>} managedSeIds - Array of SE UIDs
 * @returns {Promise<void>}
 */
export const updateManagedSEs = async (managerId, managedSeIds) => {
  const userRef = doc(db, 'users', managerId);
  await updateDoc(userRef, { managedSeIds });
};

/**
 * Get all users with SE role (for Manager dropdown)
 * @returns {Promise<Array>}
 */
export const getAllSEs = async () => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'SE'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get all SEs managed by a specific manager
 * @param {string} managerId - Manager's UID
 * @returns {Promise<Array>}
 */
export const getManagedSEs = async (managerId) => {
  const manager = await getUserById(managerId);
  if (!manager || !manager.managedSeIds || manager.managedSeIds.length === 0) {
    return [];
  }

  // Fetch all managed SEs
  const sePromises = manager.managedSeIds.map(seId => getUserById(seId));
  const ses = await Promise.all(sePromises);

  return ses.filter(se => se !== null);
};
