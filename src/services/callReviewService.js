import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';

/**
 * Create a new call review
 * @param {Object} callData - Call review data
 * @param {string} callData.seId - SE's UID
 * @param {string} callData.managerId - Manager's UID
 * @param {string} callData.customerName - Customer name
 * @param {Date} callData.callDate - Call date
 * @param {string} callData.callLink - Link to recording
 * @param {string} callData.transcript - Call transcript
 * @returns {Promise<string>} - New call review ID
 */
export const createCallReview = async (callData) => {
  const callReviewsRef = collection(db, 'callReviews');

  const newCallReview = {
    seId: callData.seId,
    managerId: callData.managerId,
    customerName: callData.customerName,
    callDate: Timestamp.fromDate(callData.callDate),
    callLink: callData.callLink,
    transcript: callData.transcript,
    status: 'Pending Self-Score', // Initial status
    createdAt: Timestamp.now()
  };

  const docRef = await addDoc(callReviewsRef, newCallReview);
  return docRef.id;
};

/**
 * Get call review by ID
 * @param {string} callReviewId - Call review document ID
 * @returns {Promise<Object|null>}
 */
export const getCallReviewById = async (callReviewId) => {
  const callReviewRef = doc(db, 'callReviews', callReviewId);
  const callReviewSnap = await getDoc(callReviewRef);

  if (callReviewSnap.exists()) {
    return { id: callReviewSnap.id, ...callReviewSnap.data() };
  }
  return null;
};

/**
 * Get all call reviews for a specific SE
 * @param {string} seId - SE's UID
 * @returns {Promise<Array>}
 */
export const getCallReviewsForSE = async (seId) => {
  const callReviewsRef = collection(db, 'callReviews');
  const q = query(
    callReviewsRef,
    where('seId', '==', seId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get all call reviews for a manager's team
 * @param {string} managerId - Manager's UID
 * @returns {Promise<Array>}
 */
export const getCallReviewsForManager = async (managerId) => {
  const callReviewsRef = collection(db, 'callReviews');
  const q = query(
    callReviewsRef,
    where('managerId', '==', managerId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get call reviews filtered by SE (for manager view)
 * @param {string} managerId - Manager's UID
 * @param {string} seId - SE's UID to filter by
 * @returns {Promise<Array>}
 */
export const getCallReviewsForManagerBySE = async (managerId, seId) => {
  const callReviewsRef = collection(db, 'callReviews');
  const q = query(
    callReviewsRef,
    where('managerId', '==', managerId),
    where('seId', '==', seId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Update call review status
 * @param {string} callReviewId - Call review document ID
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
export const updateCallReviewStatus = async (callReviewId, status) => {
  const callReviewRef = doc(db, 'callReviews', callReviewId);
  await updateDoc(callReviewRef, { status });
};

/**
 * Calculate and update call review status based on scorecard submissions
 * @param {string} callReviewId - Call review document ID
 * @param {Array} scorecards - Array of scorecards for this call review
 * @returns {Promise<void>}
 */
export const recalculateCallReviewStatus = async (callReviewId, scorecards) => {
  const seScorecard = scorecards.find(sc => sc.scorerType === 'SE');
  const managerScorecard = scorecards.find(sc => sc.scorerType === 'Manager');
  const aiScorecard = scorecards.find(sc => sc.scorerType === 'AI');

  let newStatus = 'Pending Self-Score';

  if (seScorecard?.submittedAt && managerScorecard?.submittedAt && aiScorecard?.submittedAt) {
    newStatus = 'Ready for Coaching';
  } else if (seScorecard?.submittedAt) {
    newStatus = 'Pending Manager Review';
  }

  await updateCallReviewStatus(callReviewId, newStatus);
};
