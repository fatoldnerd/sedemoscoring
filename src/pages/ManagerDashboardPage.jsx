import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import Navbar from '../components/Navbar';

export default function ManagerDashboardPage() {
  const { currentUser, userProfile } = useAuth();
  const [pendingReviews, setPendingReviews] = useState([]);
  const [readyForCoaching, setReadyForCoaching] = useState([]);
  const [allSEs, setAllSEs] = useState([]);
  const [managedSEs, setManagedSEs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'team'

  useEffect(() => {
    if (userProfile?.role === 'Manager') {
      fetchDashboardData();
    }
  }, [userProfile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all call reviews
      const callReviewsRef = collection(db, 'callReviews');
      const callReviewsSnapshot = await getDocs(callReviewsRef);
      const allReviews = callReviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all scorecards
      const scorecardsRef = collection(db, 'scorecards');
      const scorecardsSnapshot = await getDocs(scorecardsRef);
      const allScorecards = scorecardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all users (SEs)
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAllSEs(users.filter(u => u.role !== 'Manager'));
      setManagedSEs(users.filter(u => userProfile.managedSeIds?.includes(u.id)));

      // Process reviews for my managed SEs
      const myManagedSeIds = userProfile.managedSeIds || [];
      const reviewsFromManagedSEs = allReviews.filter(review =>
        myManagedSeIds.includes(review.seId)
      );

      // Get reviews pending manager score
      const pending = [];
      const readyCoaching = [];

      for (const review of reviewsFromManagedSEs) {
        const reviewScorecards = allScorecards.filter(sc => sc.callReviewId === review.id);
        const seScorecard = reviewScorecards.find(sc => sc.scorerType === 'SE');
        const managerScorecard = reviewScorecards.find(sc => sc.scorerType === 'Manager');
        const aiScorecard = reviewScorecards.find(sc => sc.scorerType === 'AI');

        // Get SE name
        const seUser = users.find(u => u.id === review.seId);
        const seName = seUser?.displayName || seUser?.email || 'Unknown SE';

        const reviewWithDetails = {
          ...review,
          seName,
          seScore: seScorecard?.totalScore || 0,
          managerScore: managerScorecard?.totalScore || 0,
          aiScore: aiScorecard?.totalScore || 0,
          seSubmitted: !!seScorecard?.submittedAt,
          managerSubmitted: !!managerScorecard?.submittedAt,
          aiSubmitted: !!aiScorecard?.submittedAt
        };

        if (seScorecard?.submittedAt && !managerScorecard?.submittedAt) {
          pending.push(reviewWithDetails);
        } else if (seScorecard?.submittedAt && managerScorecard?.submittedAt && aiScorecard?.submittedAt) {
          readyCoaching.push(reviewWithDetails);
        }
      }

      setPendingReviews(pending);
      setReadyForCoaching(readyCoaching);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSE = async (seId) => {
    setTeamLoading(true);
    try {
      // Update manager's managedSeIds
      const managerRef = doc(db, 'users', currentUser.uid);
      await updateDoc(managerRef, {
        managedSeIds: arrayUnion(seId)
      });

      // Update SE's managerId
      const seRef = doc(db, 'users', seId);
      await updateDoc(seRef, {
        managerId: currentUser.uid
      });

      // Refresh data
      await fetchDashboardData();

    } catch (error) {
      console.error('Error assigning SE:', error);
      alert('Failed to assign SE. Please try again.');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleRemoveSE = async (seId) => {
    setTeamLoading(true);
    try {
      // Update manager's managedSeIds
      const managerRef = doc(db, 'users', currentUser.uid);
      await updateDoc(managerRef, {
        managedSeIds: arrayRemove(seId)
      });

      // Update SE's managerId to null
      const seRef = doc(db, 'users', seId);
      await updateDoc(seRef, {
        managerId: null
      });

      // Refresh data
      await fetchDashboardData();

    } catch (error) {
      console.error('Error removing SE:', error);
      alert('Failed to remove SE. Please try again.');
    } finally {
      setTeamLoading(false);
    }
  };

  // Redirect if not a manager
  if (userProfile && userProfile.role !== 'Manager') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
              Access Denied
            </h2>
            <p className="text-yellow-800 dark:text-yellow-200">
              This page is only accessible to managers.
            </p>
            <Link
              to="/dashboard"
              className="inline-block mt-4 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600 dark:text-dark-text-secondary">Loading manager dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-dark-text mb-2">
            Manager Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
            Manage your team and review their call performance
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">
                  Team Size
                </p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {managedSEs.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">
                  Pending Reviews
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {pendingReviews.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">
                  Ready for Coaching
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {readyForCoaching.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === 'pending'
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Pending My Score ({pendingReviews.length})
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === 'team'
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Manage Team
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingReviews.length === 0 ? (
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
                  All Caught Up!
                </h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                  No call reviews are waiting for your score right now.
                </p>
              </div>
            ) : (
              pendingReviews.map(review => (
                <div
                  key={review.id}
                  className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-6 hover:shadow-medium transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                          {review.customerName}
                        </h3>
                        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-xs font-bold rounded-full">
                          Needs Your Score
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {review.seName}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          {review.callDate?.toDate?.().toLocaleDateString() || 'No date'}
                        </div>
                        <div className="flex items-center font-semibold text-primary-600 dark:text-primary-400">
                          SE Score: {review.seScore}/100
                        </div>
                        {review.aiSubmitted && (
                          <div className="flex items-center font-semibold text-purple-600 dark:text-purple-400">
                            AI Score: {review.aiScore}/100
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        to={`/calls/${review.id}/score/Manager`}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-red-700 shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 group"
                      >
                        <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Score Now
                      </Link>
                      <Link
                        to={`/calls/${review.id}/details`}
                        className="inline-flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Ready for Coaching Section */}
            {readyForCoaching.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4">
                  Ready for Coaching ({readyForCoaching.length})
                </h2>
                <div className="space-y-4">
                  {readyForCoaching.map(review => (
                    <div
                      key={review.id}
                      className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-6 hover:shadow-medium transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                              {review.customerName}
                            </h3>
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-bold rounded-full">
                              All Scores Complete
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              {review.seName}
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              {review.callDate?.toDate?.().toLocaleDateString() || 'No date'}
                            </div>
                            <div className="flex items-center space-x-3 font-semibold">
                              <span className="text-primary-600 dark:text-primary-400">SE: {review.seScore}</span>
                              <span className="text-orange-600 dark:text-orange-400">You: {review.managerScore}</span>
                              <span className="text-purple-600 dark:text-purple-400">AI: {review.aiScore}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Link
                            to={`/calls/${review.id}/details`}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105"
                          >
                            View & Coach
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Team */}
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                My Team ({managedSEs.length})
              </h2>
              {managedSEs.length === 0 ? (
                <p className="text-gray-600 dark:text-dark-text-secondary text-center py-8">
                  No SEs assigned yet. Add team members from the right panel.
                </p>
              ) : (
                <div className="space-y-3">
                  {managedSEs.map(se => (
                    <div
                      key={se.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-bold">
                            {se.displayName?.charAt(0) || se.email?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-dark-text">
                            {se.displayName || se.email}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {se.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSE(se.id)}
                        disabled={teamLoading}
                        className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available SEs */}
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Available SEs
              </h2>
              {allSEs.filter(se => !userProfile.managedSeIds?.includes(se.id)).length === 0 ? (
                <p className="text-gray-600 dark:text-dark-text-secondary text-center py-8">
                  All SEs are already on your team!
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allSEs
                    .filter(se => !userProfile.managedSeIds?.includes(se.id))
                    .map(se => (
                      <div
                        key={se.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 dark:text-gray-300 font-bold">
                              {se.displayName?.charAt(0) || se.email?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-dark-text">
                              {se.displayName || se.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {se.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignSE(se.id)}
                          disabled={teamLoading}
                          className="px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Assign to Me
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
