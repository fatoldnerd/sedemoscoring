import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getCallReviewsForSE, getCallReviewsForManager } from '../services/callReviewService';
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
        reviews = await getCallReviewsForManager(currentUser.uid);
      } else {
        reviews = await getCallReviewsForSE(currentUser.uid);
      }

      // Enrich with SE names for manager view
      if (userProfile.role === 'Manager') {
        const enrichedReviews = await Promise.all(
          reviews.map(async (review) => {
            const seUser = await getUserById(review.seId);
            return {
              ...review,
              seName: seUser?.name || 'Unknown SE'
            };
          })
        );
        setCallReviews(enrichedReviews);
      } else {
        setCallReviews(reviews);
      }
    } catch (error) {
      console.error('Error loading call reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
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
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending Manager Review':
        return 'bg-blue-100 text-blue-800';
      case 'Ready for Coaching':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-bold rounded-lg hover:from-green-700 hover:to-green-800 shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 group"
          >
            <svg className="w-4 h-4 mr-1.5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Score This Call
          </Link>
        )}
        <Link
          to={`/calls/${review.id}/details`}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 group"
        >
          View Details
          <svg className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
              <Link
                to="/analytics"
                className="group px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Analytics</span>
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

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Modern Filter Chips */}
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
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
              className="group relative px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl hover:from-primary-700 hover:to-accent-700 shadow-soft hover:shadow-medium transition-all duration-300 font-semibold transform hover:scale-105 flex items-center space-x-2"
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
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4 dark:from-dark-border dark:to-dark-bg">
                  <svg className="w-8 h-8 text-gray-400 dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg font-semibold mb-2 dark:text-dark-text">
                  {callReviews.length === 0
                    ? 'No call reviews yet'
                    : 'No matching reviews'}
                </p>
                <p className="text-gray-500 text-sm dark:text-dark-text-secondary">
                  {callReviews.length === 0
                    ? 'Get started by creating your first call review'
                    : 'Try adjusting your filter to see more results'}
                </p>
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
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-100 dark:bg-dark-bg/50 dark:divide-dark-border">
                    {filteredReviews.map((review) => (
                      <tr key={review.id} className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-accent-50/30 dark:hover:from-primary-900/20 dark:hover:to-accent-900/20 transition-all duration-200 group">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900 dark:to-accent-900 rounded-xl flex items-center justify-center mr-3 group-hover:shadow-soft transition-shadow">
                              <span className="text-primary-700 dark:text-primary-300 font-bold text-sm">
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
                          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${getStatusBadgeColor(review.status)}`}>
                            {review.status}
                          </span>
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
