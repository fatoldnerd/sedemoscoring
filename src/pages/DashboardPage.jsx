import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getCallReviewsForSE, getAllCallReviews } from '../services/callReviewService';
import { getScorecardsForCallReview } from '../services/scorecardService';
import { getUserById } from '../services/userService';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import LoadingSpinner from '../components/LoadingSpinner';

function DashboardPage() {
  const { currentUser, userProfile, loading } = useContext(AuthContext);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [callReviews, setCallReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendingAction: 0,
    avgScore: 0,
    recentCount: 0
  });

  useEffect(() => {
    if (currentUser && userProfile) {
      loadCallReviews();
    }
  }, [currentUser, userProfile]);

  useEffect(() => {
    // Apply status filter
    if (statusFilter === 'All') {
      setFilteredReviews(callReviews);
    } else {
      setFilteredReviews(callReviews.filter(review => review.status === statusFilter));
    }
  }, [statusFilter, callReviews]);

  const loadCallReviews = async () => {
    try {
      setLoadingReviews(true);
      let reviews;

      if (userProfile.role === 'Manager') {
        // Managers see ALL call reviews in the organization
        reviews = await getAllCallReviews();
      } else {
        reviews = await getCallReviewsForSE(currentUser.uid);
      }

      // Enrich with SE names for manager view
      if (userProfile.role === 'Manager') {
        const enrichedReviews = await Promise.all(
          reviews.map(async (review) => {
            const seUser = await getUserById(review.seId);
            // Get scorecards for score preview
            const scorecards = await getScorecardsForCallReview(review.id);
            return {
              ...review,
              seName: seUser?.name || 'Unknown SE',
              scorecards: {
                SE: scorecards.find(sc => sc.scorerType === 'SE'),
                Manager: scorecards.find(sc => sc.scorerType === 'Manager'),
                AI: scorecards.find(sc => sc.scorerType === 'AI')
              }
            };
          })
        );
        setCallReviews(enrichedReviews);
        calculateStats(enrichedReviews);
      } else {
        // Also get scorecards for SE view
        const enrichedReviews = await Promise.all(
          reviews.map(async (review) => {
            const scorecards = await getScorecardsForCallReview(review.id);
            return {
              ...review,
              scorecards: {
                SE: scorecards.find(sc => sc.scorerType === 'SE'),
                Manager: scorecards.find(sc => sc.scorerType === 'Manager'),
                AI: scorecards.find(sc => sc.scorerType === 'AI')
              }
            };
          })
        );
        setCallReviews(enrichedReviews);
        calculateStats(enrichedReviews);
      }
    } catch (error) {
      console.error('Error loading call reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const calculateStats = (reviews) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Count pending actions based on role
    let pendingAction = 0;
    if (userProfile.role === 'SE') {
      pendingAction = reviews.filter(r =>
        r.status === 'Pending Self-Score' && r.seId === currentUser.uid
      ).length;
    } else {
      pendingAction = reviews.filter(r =>
        r.status === 'Pending Manager Review'
      ).length;
    }

    // Calculate average score from completed reviews
    const reviewsWithScores = reviews.filter(r =>
      r.scorecards?.Manager?.totalScore || r.scorecards?.SE?.totalScore
    );
    const avgScore = reviewsWithScores.length > 0
      ? Math.round(
          reviewsWithScores.reduce((sum, r) =>
            sum + (r.scorecards?.Manager?.totalScore || r.scorecards?.SE?.totalScore || 0), 0
          ) / reviewsWithScores.length
        )
      : 0;

    // Count recent reviews (last 7 days)
    const recentCount = reviews.filter(r => {
      const date = r.callDate?.toDate?.() || new Date(r.callDate);
      return date >= sevenDaysAgo;
    }).length;

    setStats({
      total: reviews.length,
      pendingAction,
      avgScore,
      recentCount
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Pending Self-Score':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/30';
      case 'Pending Manager Review':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30';
      case 'Ready for Coaching':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/30';
      case 'Completed':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700/30';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending Self-Score':
        return (
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'Pending Manager Review':
        return (
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'Ready for Coaching':
        return (
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getActionButton = (review) => {
    // Check if current user is the SE and needs to complete self-score
    const needsSelfScore = userProfile?.role === 'SE'
      && review.seId === currentUser?.uid
      && review.status === 'Pending Self-Score';

    return (
      <div className="flex items-center space-x-2">
        {needsSelfScore && (
          <Link
            to={`/calls/${review.id}/score/SE`}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-bold rounded-lg hover:from-green-700 hover:to-green-800 shadow-soft hover:shadow-[0_0_15px_rgba(22,163,74,0.4)] transition-all duration-200 transform hover:scale-105 group"
          >
            <svg className="w-4 h-4 mr-1.5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Score Now
          </Link>
        )}
        <Link
          to={`/calls/${review.id}/details`}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-soft hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-200 transform hover:scale-105 group"
        >
          View Details
          <svg className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  };

  if (loading || loadingReviews) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-bg transition-colors duration-200">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 shadow-soft dark:from-primary-700 dark:to-accent-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2">
                <img
                  src="/assets/SimproLogo.png"
                  alt="Simpro Logo"
                  className="h-10 w-auto"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {userProfile?.role === 'Manager' ? 'Team Dashboard' : 'My Call Reviews'}
                </h1>
                <p className="text-primary-100 text-sm mt-0.5 flex items-center">
                  <span className="inline-flex items-center bg-white/20 px-2 py-0.5 rounded-full">
                    {userProfile?.name}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="inline-flex items-center bg-white/20 px-2 py-0.5 rounded-full">
                    {userProfile?.role}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {userProfile?.role === 'Manager' && (
                <Link
                  to="/manager-dashboard"
                  className="group px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Manager Dashboard</span>
                </Link>
              )}
              <Link
                to="/analytics"
                className="group px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Analytics</span>
              </Link>
              <Link
                to="/admin-setup"
                className="group px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Admin Setup</span>
              </Link>
              <button
                onClick={toggleDarkMode}
                className="group px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium flex items-center space-x-2"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Reviews */}
            <div className="group bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border hover:shadow-strong hover:scale-105 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Total Call Reviews</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{stats.total}</p>
            </div>

            {/* Pending Action */}
            <div className="group bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border hover:shadow-strong hover:scale-105 hover:border-yellow-300 dark:hover:border-yellow-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 rounded-xl flex items-center justify-center relative">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {stats.pendingAction > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{stats.pendingAction}</span>
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">
                {userProfile?.role === 'Manager' ? 'Pending Reviews' : 'Pending Self-Scores'}
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{stats.pendingAction}</p>
            </div>

            {/* Average Score */}
            <div className="group bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border hover:shadow-strong hover:scale-105 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Average Score</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">
                {stats.avgScore > 0 ? stats.avgScore : '-'}
                {stats.avgScore > 0 && <span className="text-lg text-gray-500 dark:text-dark-text-secondary">/100</span>}
              </p>
            </div>

            {/* Recent Activity */}
            <div className="group bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border hover:shadow-strong hover:scale-105 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Last 7 Days</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{stats.recentCount}</p>
            </div>
          </div>

          {/* Modern Filter Chips & Create Button */}
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div className="flex flex-wrap gap-2">
              {['All', 'Pending Self-Score', 'Pending Manager Review', 'Ready for Coaching', 'Completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-soft dark:from-primary-700 dark:to-accent-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200 hover:border-primary-300 dark:bg-dark-card dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-border'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <Link
              to="/calls/new"
              className="group relative px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl hover:from-primary-700 hover:to-accent-700 shadow-soft hover:shadow-[0_0_20px_rgba(2,132,199,0.5)] transition-all duration-300 font-semibold transform hover:scale-105 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New Call Review</span>
            </Link>
          </div>

          {/* Call Reviews Table */}
          <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl overflow-hidden border border-gray-100 animate-fade-in dark:bg-dark-card dark:border-dark-border">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 rounded-3xl mb-6 animate-scale-in">
                  <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 dark:text-dark-text">
                  {callReviews.length === 0
                    ? 'No call reviews yet'
                    : 'No matching reviews'}
                </h3>
                <p className="text-gray-600 text-base mb-6 max-w-md mx-auto dark:text-dark-text-secondary">
                  {callReviews.length === 0
                    ? userProfile?.role === 'Manager'
                      ? 'Your team hasn\'t submitted any call reviews yet. Encourage your SEs to get started!'
                      : 'Start improving your demo calls by creating your first review. Our AI will help you identify areas for growth.'
                    : 'Try selecting a different filter to see more results, or create a new call review to get started.'}
                </p>
                {callReviews.length === 0 && (
                  <Link
                    to="/calls/new"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl hover:from-primary-700 hover:to-accent-700 shadow-medium hover:shadow-strong transition-all duration-300 font-bold transform hover:scale-105 space-x-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Your First Call Review</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-dark-border">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-card">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-dark-text">
                        Customer
                      </th>
                      {userProfile.role === 'Manager' && (
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-dark-text">
                          SE
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-dark-text">
                        Call Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-dark-text">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-dark-text">
                        Scores
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-dark-text">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-100 dark:bg-dark-bg/50 dark:divide-dark-border">
                    {filteredReviews.map((review) => (
                      <tr key={review.id} className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-accent-50/30 dark:hover:from-primary-900/20 dark:hover:to-accent-900/20 transition-all duration-200 group">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900 dark:to-accent-900 rounded-xl flex items-center justify-center mr-3 group-hover:shadow-soft transition-shadow">
                              <span className="text-primary-700 dark:text-primary-300 font-bold text-base">
                                {review.customerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                              {review.customerName}
                            </div>
                          </div>
                        </td>
                        {userProfile.role === 'Manager' && (
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-700 dark:text-dark-text">
                              {review.seName}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600 dark:text-dark-text-secondary">
                            <svg className="w-4 h-4 mr-2 text-gray-400 dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(review.callDate)}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm border ${getStatusBadgeColor(review.status)}`}>
                            {getStatusIcon(review.status)}
                            {review.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {review.scorecards?.SE?.totalScore > 0 && (
                              <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg">
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">SE: {review.scorecards.SE.totalScore}</span>
                              </div>
                            )}
                            {review.scorecards?.Manager?.totalScore > 0 && (
                              <div className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30 rounded-lg">
                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">M: {review.scorecards.Manager.totalScore}</span>
                              </div>
                            )}
                            {review.scorecards?.AI?.totalScore > 0 && (
                              <div className="px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg">
                                <span className="text-xs font-semibold text-green-700 dark:text-green-300">AI: {review.scorecards.AI.totalScore}</span>
                              </div>
                            )}
                            {!review.scorecards?.SE?.totalScore && !review.scorecards?.Manager?.totalScore && !review.scorecards?.AI?.totalScore && (
                              <span className="text-xs text-gray-400 dark:text-dark-text-secondary">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm">
                          {getActionButton(review)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
