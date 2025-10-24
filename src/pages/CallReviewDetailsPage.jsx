import { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getCallReviewById } from '../services/callReviewService';
import { getScorecardsForCallReview } from '../services/scorecardService';
import LoadingSpinner from '../components/LoadingSpinner';

function CallReviewDetailsPage() {
  const { callReviewId } = useParams();
  const { currentUser, userProfile } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [callReview, setCallReview] = useState(null);
  const [scorecards, setScorecards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [callReviewId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [review, cards] = await Promise.all([
        getCallReviewById(callReviewId),
        getScorecardsForCallReview(callReviewId)
      ]);

      setCallReview(review);
      setScorecards(cards);
    } catch (err) {
      console.error('Error loading call review details:', err);
      setError('Failed to load call review details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getScorecardByType = (type) => {
    return scorecards.find(sc => sc.scorerType === type);
  };

  const renderScorecard = (scorecard, title, color) => {
    if (!scorecard || !scorecard.submittedAt) {
      return (
        <div className="bg-gray-50 dark:bg-dark-border rounded-xl p-6 border-2 border-dashed border-gray-300 dark:border-dark-text-secondary">
          <h3 className={`text-lg font-bold mb-2 ${color}`}>{title}</h3>
          <p className="text-gray-500 dark:text-dark-text-secondary">Not yet completed</p>
          {scorecard?.scorerType === 'SE' && userProfile?.uid === callReview?.seId && (
            <Link
              to={`/calls/${callReviewId}/score/SE`}
              className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-bold rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-soft hover:shadow-medium transition-all duration-200"
            >
              Complete Self-Score
            </Link>
          )}
          {scorecard?.scorerType === 'Manager' && userProfile?.role === 'Manager' && (
            <Link
              to={`/calls/${callReviewId}/score/Manager`}
              className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-accent-600 to-accent-700 text-white text-sm font-bold rounded-lg hover:from-accent-700 hover:to-accent-800 shadow-soft hover:shadow-medium transition-all duration-200"
            >
              Complete Manager Score
            </Link>
          )}
        </div>
      );
    }

    const { scores, comments, quotes, totalScore } = scorecard;

    return (
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-medium border border-gray-100 dark:border-dark-border">
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-xl font-bold ${color}`}>{title}</h3>
          <div className={`text-3xl font-bold ${color}`}>
            {totalScore}/100
          </div>
        </div>

        {/* Introduction Section */}
        <div className="mb-6">
          <h4 className="text-md font-bold text-gray-800 dark:text-dark-text mb-3 flex items-center">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Introduction (10 pts)
          </h4>
          <div className="ml-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Credibility:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.introduction.credibility}/2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Priorities:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.introduction.priorities}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Roadmap:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.introduction.roadmap}/3</span>
            </div>
          </div>
          {comments.introduction && (
            <div className="mt-3 ml-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-gray-700 dark:text-dark-text italic">
              "{comments.introduction}"
            </div>
          )}
          {quotes?.introduction && (
            <div className="mt-3 ml-4 p-3 border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg text-sm text-gray-600 dark:text-dark-text-secondary">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <span className="italic">"{quotes.introduction}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Consultative Selling Section */}
        <div className="mb-6">
          <h4 className="text-md font-bold text-gray-800 dark:text-dark-text mb-3 flex items-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Consultative Selling (40 pts)
          </h4>
          <div className="ml-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Story:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.consultative.story}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Avoid Feature Tour:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.consultative.featureTour}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Terminology:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.consultative.terminology}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Functionality:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.consultative.functionality}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Tailoring:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.consultative.tailoring}/5</span>
            </div>
          </div>
          {comments.consultative && (
            <div className="mt-3 ml-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-gray-700 dark:text-dark-text italic">
              "{comments.consultative}"
            </div>
          )}
          {quotes?.consultative && (
            <div className="mt-3 ml-4 p-3 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg text-sm text-gray-600 dark:text-dark-text-secondary">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <span className="italic">"{quotes.consultative}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Key Workflows Section */}
        <div className="mb-6">
          <h4 className="text-md font-bold text-gray-800 dark:text-dark-text mb-3 flex items-center">
            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            Key Workflows (40 pts)
          </h4>
          <div className="ml-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Confirm Value:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.workflows.confirmValue}/15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Connect Dots:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.workflows.connectDots}/15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Pain Resolved:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.workflows.painResolved}/10</span>
            </div>
          </div>
          {comments.workflows && (
            <div className="mt-3 ml-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-gray-700 dark:text-dark-text italic">
              "{comments.workflows}"
            </div>
          )}
          {quotes?.workflows && (
            <div className="mt-3 ml-4 p-3 border-l-4 border-purple-500 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg text-sm text-gray-600 dark:text-dark-text-secondary">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <span className="italic">"{quotes.workflows}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Close Section */}
        <div>
          <h4 className="text-md font-bold text-gray-800 dark:text-dark-text mb-3 flex items-center">
            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
            Close (10 pts)
          </h4>
          <div className="ml-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Priority Topics:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.close.priorityTopics}/2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Value Pillar:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.close.valuePillar}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-dark-text-secondary">Deliverables:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text">{scores.close.deliverables}/3</span>
            </div>
          </div>
          {comments.close && (
            <div className="mt-3 ml-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-gray-700 dark:text-dark-text italic">
              "{comments.close}"
            </div>
          )}
          {quotes?.close && (
            <div className="mt-3 ml-4 p-3 border-l-4 border-orange-500 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg text-sm text-gray-600 dark:text-dark-text-secondary">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <span className="italic">"{quotes.close}"</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !callReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg font-semibold">{error || 'Call review not found'}</p>
          <Link to="/dashboard" className="mt-4 inline-block text-primary-600 dark:text-primary-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const aiScorecard = getScorecardByType('AI');
  const seScorecard = getScorecardByType('SE');
  const managerScorecard = getScorecardByType('Manager');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-bg transition-colors duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 shadow-soft dark:from-primary-700 dark:to-accent-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Dashboard</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Call Review Details</h1>
              <p className="text-primary-100 text-sm mt-0.5">{callReview.customerName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Call Review Metadata */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-medium border border-gray-100 dark:border-dark-border mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4">Call Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Customer:</span>
              <p className="text-gray-900 dark:text-dark-text font-medium">{callReview.customerName}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Call Date:</span>
              <p className="text-gray-900 dark:text-dark-text font-medium">{formatDate(callReview.callDate)}</p>
            </div>
            {callReview.callLink && (
              <div className="md:col-span-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Recording Link:</span>
                <a href={callReview.callLink} target="_blank" rel="noopener noreferrer" className="block text-blue-600 dark:text-blue-400 hover:underline break-all">
                  {callReview.callLink}
                </a>
              </div>
            )}
            <div className="md:col-span-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Status:</span>
              <p className="text-gray-900 dark:text-dark-text font-medium">{callReview.status}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Score Call if needed */}
        {userProfile?.uid === callReview.seId && !seScorecard?.submittedAt && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 shadow-medium">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete Your Self-Score
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Score your call performance to unlock AI feedback and manager review
                </p>
              </div>
              <Link
                to={`/calls/${callReviewId}/score/SE`}
                className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-bold rounded-xl hover:from-green-700 hover:to-green-800 shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 ml-4"
              >
                <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Score This Call
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Scorecards Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Scorecards</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Scorecard */}
            <div>
              {renderScorecard(aiScorecard, 'AI Assessment', 'text-purple-600 dark:text-purple-400')}
            </div>

            {/* SE Scorecard */}
            <div>
              {renderScorecard(seScorecard, 'Self-Assessment', 'text-blue-600 dark:text-blue-400')}
            </div>

            {/* Manager Scorecard */}
            <div>
              {renderScorecard(managerScorecard, 'Manager Assessment', 'text-green-600 dark:text-green-400')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallReviewDetailsPage;
