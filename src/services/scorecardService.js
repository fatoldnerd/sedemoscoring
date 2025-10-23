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
  Timestamp
} from 'firebase/firestore';

/**
 * Create three blank scorecards for a new call review
 * @param {string} callReviewId - Call review document ID
 * @param {string} seId - SE's UID
 * @returns {Promise<Array<string>>} - Array of created scorecard IDs
 */
export const createBlankScorecards = async (callReviewId, seId) => {
  const scorecardsRef = collection(db, 'scorecards');

  const blankScores = {
    introduction: { credibility: 0, priorities: 0, roadmap: 0 },
    consultative: { story: 0, featureTour: 0, terminology: 0, functionality: 0, tailoring: 0 },
    workflows: { confirmValue: 0, connectDots: 0, painResolved: 0 },
    close: { priorityTopics: 0, valuePillar: 0, deliverables: 0 }
  };

  const blankComments = {
    introduction: '',
    consultative: '',
    workflows: '',
    close: ''
  };

  const scorecardTypes = ['SE', 'Manager', 'AI'];
  const createdIds = [];

  for (const scorerType of scorecardTypes) {
    const scorecard = {
      callReviewId,
      seId,
      scorerType,
      totalScore: 0,
      submittedAt: null,
      scores: blankScores,
      comments: blankComments
    };

    const docRef = await addDoc(scorecardsRef, scorecard);
    createdIds.push(docRef.id);
  }

  return createdIds;
};

/**
 * Get scorecard by ID
 * @param {string} scorecardId - Scorecard document ID
 * @returns {Promise<Object|null>}
 */
export const getScorecardById = async (scorecardId) => {
  const scorecardRef = doc(db, 'scorecards', scorecardId);
  const scorecardSnap = await getDoc(scorecardRef);

  if (scorecardSnap.exists()) {
    return { id: scorecardSnap.id, ...scorecardSnap.data() };
  }
  return null;
};

/**
 * Get all scorecards for a specific call review
 * @param {string} callReviewId - Call review document ID
 * @returns {Promise<Array>}
 */
export const getScorecardsForCallReview = async (callReviewId) => {
  const scorecardsRef = collection(db, 'scorecards');
  const q = query(scorecardsRef, where('callReviewId', '==', callReviewId));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get a specific scorecard for a call review by scorer type
 * @param {string} callReviewId - Call review document ID
 * @param {string} scorerType - 'SE', 'Manager', or 'AI'
 * @returns {Promise<Object|null>}
 */
export const getScorecardByType = async (callReviewId, scorerType) => {
  const scorecardsRef = collection(db, 'scorecards');
  const q = query(
    scorecardsRef,
    where('callReviewId', '==', callReviewId),
    where('scorerType', '==', scorerType)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;

  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Calculate total score from scorecard scores
 * @param {Object} scores - Scores object
 * @returns {number} - Total score out of 100
 */
export const calculateTotalScore = (scores) => {
  let total = 0;

  // Introduction (10 pts)
  total += scores.introduction.credibility || 0;
  total += scores.introduction.priorities || 0;
  total += scores.introduction.roadmap || 0;

  // Consultative (40 pts)
  total += scores.consultative.story || 0;
  total += scores.consultative.featureTour || 0;
  total += scores.consultative.terminology || 0;
  total += scores.consultative.functionality || 0;
  total += scores.consultative.tailoring || 0;

  // Workflows (40 pts)
  total += scores.workflows.confirmValue || 0;
  total += scores.workflows.connectDots || 0;
  total += scores.workflows.painResolved || 0;

  // Close (10 pts)
  total += scores.close.priorityTopics || 0;
  total += scores.close.valuePillar || 0;
  total += scores.close.deliverables || 0;

  return total;
};

/**
 * Update scorecard with new scores and comments
 * @param {string} scorecardId - Scorecard document ID
 * @param {Object} scores - Scores object
 * @param {Object} comments - Comments object
 * @returns {Promise<void>}
 */
export const updateScorecard = async (scorecardId, scores, comments) => {
  const scorecardRef = doc(db, 'scorecards', scorecardId);
  const totalScore = calculateTotalScore(scores);

  await updateDoc(scorecardRef, {
    scores,
    comments,
    totalScore,
    submittedAt: Timestamp.now()
  });
};

/**
 * Update AI scorecard (called by Firebase Function)
 * @param {string} scorecardId - Scorecard document ID
 * @param {Object} aiResponse - AI response with scores and comments
 * @returns {Promise<void>}
 */
export const updateAIScorecard = async (scorecardId, aiResponse) => {
  const scorecardRef = doc(db, 'scorecards', scorecardId);

  await updateDoc(scorecardRef, {
    scores: aiResponse.scores,
    comments: aiResponse.comments,
    totalScore: aiResponse.totalScore,
    submittedAt: Timestamp.now()
  });
};

/**
 * Get all scorecards for a specific SE (for analytics)
 * @param {string} seId - SE's UID
 * @returns {Promise<Array>}
 */
export const getScorecardsForSE = async (seId) => {
  const scorecardsRef = collection(db, 'scorecards');
  const q = query(scorecardsRef, where('seId', '==', seId));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
