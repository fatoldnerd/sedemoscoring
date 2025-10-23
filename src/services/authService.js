import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

/**
 * Sign in with Google OAuth
 * @returns {Promise<User>} Firebase user object
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign up with Email/Password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<User>} Firebase user object
 */
export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign in with Email/Password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<User>} Firebase user object
 */
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

/**
 * Get current authenticated user
 * @returns {User|null} Current user or null if not authenticated
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};
