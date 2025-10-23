import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getCallReviewById } from '../services/callReviewService';
import { getScorecardsForCallReview } from '../services/scorecardService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function CoachingViewPage() {
  const { callReviewId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const [callReview, setCallReview] = useState(null);
  const [scorecards, setScorecards] = useState({ SE: null, Manager: null, AI: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [callReviewId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const reviewData = await getCallReviewById(callReviewId);
      const scorecardsData = await getScorecardsForCallReview(callReviewId);

      if (!reviewData) {
        throw new Error('Call review not found');
      }

      setCallReview(reviewData);

      // Organize scorecards by type
      const organizedScorecards = {
        SE: scorecardsData.find(sc => sc.scorerType === 'SE'),
        Manager: scorecardsData.find(sc => sc.scorerType === 'Manager'),
        AI: scorecardsData.find(sc => sc.scorerType === 'AI')
      };

      setScorecards(organizedScorecards);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load coaching view');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-dark-bg">
        <ErrorMessage message={error} />
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const ScoreCell = ({ score, maxScore, label }) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const colorClass =
      percentage >= 80 ? 'text-green-600 bg-green-50' :
      percentage >= 60 ? 'text-yellow-600 bg-yellow-50' :
      'text-red-600 bg-red-50';

    return (
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-lg ${colorClass}`}>
          <span className="font-bold text-lg">{score}</span>
          <span className="text-gray-500 text-sm ml-1">/ {maxScore}</span>
        </div>
      </div>
    );
  };

  const ScoreRow = ({ label, maxScore, seScore, managerScore, aiScore }) => {
    return (
      <div className="grid grid-cols-4 gap-4 py-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-primary-50/20 hover:to-accent-50/20 dark:border-dark-border dark:hover:from-primary-900/20 dark:hover:to-accent-900/20 transition-all duration-200 rounded-lg px-2">
        <div className="text-sm text-gray-700 font-semibold flex items-center dark:text-dark-text">{label}</div>
        <ScoreCell score={seScore} maxScore={maxScore} />
        <ScoreCell score={managerScore} maxScore={maxScore} />
        <ScoreCell score={aiScore} maxScore={maxScore} />
      </div>
    );
  };

  const SectionComments = ({ sectionName, seComment, managerComment, aiComment }) => {
    return (
      <div className="mb-6">
        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
          <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {sectionName} Comments
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-2">SE</div>
              <p className="font-bold text-blue-900">SE Score</p>
            </div>
            <p className="text-gray-700 text-sm">{seComment || 'No comment provided'}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-2">M</div>
              <p className="font-bold text-purple-900">Manager</p>
            </div>
            <p className="text-gray-700 text-sm">{managerComment || 'No comment provided'}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-xl border border-green-200 shadow-sm">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-2">AI</div>
              <p className="font-bold text-green-900">AI Score</p>
            </div>
            <p className="text-gray-700 text-sm">{aiComment || 'No comment provided'}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-bg transition-colors duration-200">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 shadow-soft dark:from-primary-700 dark:to-accent-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 mb-3"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Coaching View</h1>
              <div className="flex items-center space-x-3">
                <p className="text-primary-100 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {callReview.customerName}
                </p>
                <span className="text-primary-100">•</span>
                <p className="text-primary-100 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(callReview.callDate)}
                </p>
              </div>
            </div>
            <a
              href={callReview.callLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center space-x-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">View Call Recording</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">

          {/* Total Scores Card */}
          <div className="bg-white/80 backdrop-blur-sm shadow-strong rounded-2xl p-8 mb-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-6">Total Scores</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200 shadow-soft">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-soft">SE</div>
                </div>
                <p className="text-sm font-semibold text-blue-900 mb-2">SE Self-Score</p>
                <div className="flex items-center justify-center">
                  <p className="text-5xl font-bold text-blue-600">
                    {scorecards.SE?.totalScore || 0}
                  </p>
                  <p className="text-2xl text-blue-400 ml-2">/ 100</p>
                </div>
              </div>
              <div className="text-center bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200 shadow-soft">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-soft">M</div>
                </div>
                <p className="text-sm font-semibold text-purple-900 mb-2">Manager Score</p>
                <div className="flex items-center justify-center">
                  <p className="text-5xl font-bold text-purple-600">
                    {scorecards.Manager?.totalScore || 0}
                  </p>
                  <p className="text-2xl text-purple-400 ml-2">/ 100</p>
                </div>
              </div>
              <div className="text-center bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-6 border border-green-200 shadow-soft">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold shadow-soft">AI</div>
                </div>
                <p className="text-sm font-semibold text-green-900 mb-2">AI Score</p>
                <div className="flex items-center justify-center">
                  <p className="text-5xl font-bold text-green-600">
                    {scorecards.AI?.totalScore || 0}
                  </p>
                  <p className="text-2xl text-green-400 ml-2">/ 100</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Score Comparison */}
          <div className="bg-white/80 backdrop-blur-sm shadow-strong rounded-2xl p-8 mb-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-6">Score Breakdown</h2>

            {/* Header Row */}
            <div className="grid grid-cols-4 gap-4 pb-4 border-b-2 border-gradient-to-r from-primary-200 to-accent-200 mb-4 dark:from-primary-800 dark:to-accent-800">
              <div className="text-sm font-bold text-gray-700 uppercase tracking-wider dark:text-dark-text">Criteria</div>
              <div className="text-sm font-bold text-blue-700 text-center uppercase tracking-wider dark:text-blue-400">SE Self-Score</div>
              <div className="text-sm font-bold text-purple-700 text-center uppercase tracking-wider dark:text-purple-400">Manager Score</div>
              <div className="text-sm font-bold text-green-700 text-center uppercase tracking-wider dark:text-green-400">AI Score</div>
            </div>

            {/* Section 1: Introduction (10 pts) */}
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">1</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Introduction (10 pts)</h3>
              </div>
              <ScoreRow
                label="Establish Credibility"
                maxScore={2}
                seScore={scorecards.SE?.scores?.introduction?.credibility || 0}
                managerScore={scorecards.Manager?.scores?.introduction?.credibility || 0}
                aiScore={scorecards.AI?.scores?.introduction?.credibility || 0}
              />
              <ScoreRow
                label="Align on Priorities"
                maxScore={5}
                seScore={scorecards.SE?.scores?.introduction?.priorities || 0}
                managerScore={scorecards.Manager?.scores?.introduction?.priorities || 0}
                aiScore={scorecards.AI?.scores?.introduction?.priorities || 0}
              />
              <ScoreRow
                label="Set Roadmap for Call"
                maxScore={3}
                seScore={scorecards.SE?.scores?.introduction?.roadmap || 0}
                managerScore={scorecards.Manager?.scores?.introduction?.roadmap || 0}
                aiScore={scorecards.AI?.scores?.introduction?.roadmap || 0}
              />
            </div>

            {/* Section 2: Consultative Selling (40 pts) */}
            <div className="mt-8">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">2</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Consultative Selling Approach (40 pts)</h3>
              </div>
              <ScoreRow
                label="Product in Context of Story (P/F)"
                maxScore={10}
                seScore={scorecards.SE?.scores?.consultative?.story || 0}
                managerScore={scorecards.Manager?.scores?.consultative?.story || 0}
                aiScore={scorecards.AI?.scores?.consultative?.story || 0}
              />
              <ScoreRow
                label="Avoid Feature Tour (P/F)"
                maxScore={10}
                seScore={scorecards.SE?.scores?.consultative?.featureTour || 0}
                managerScore={scorecards.Manager?.scores?.consultative?.featureTour || 0}
                aiScore={scorecards.AI?.scores?.consultative?.featureTour || 0}
              />
              <ScoreRow
                label="Industry Terminology"
                maxScore={5}
                seScore={scorecards.SE?.scores?.consultative?.terminology || 0}
                managerScore={scorecards.Manager?.scores?.consultative?.terminology || 0}
                aiScore={scorecards.AI?.scores?.consultative?.terminology || 0}
              />
              <ScoreRow
                label="Up-to-date Functionality"
                maxScore={10}
                seScore={scorecards.SE?.scores?.consultative?.functionality || 0}
                managerScore={scorecards.Manager?.scores?.consultative?.functionality || 0}
                aiScore={scorecards.AI?.scores?.consultative?.functionality || 0}
              />
              <ScoreRow
                label="Tailored to Audience"
                maxScore={5}
                seScore={scorecards.SE?.scores?.consultative?.tailoring || 0}
                managerScore={scorecards.Manager?.scores?.consultative?.tailoring || 0}
                aiScore={scorecards.AI?.scores?.consultative?.tailoring || 0}
              />
            </div>

            {/* Section 3: Key Workflows (40 pts) */}
            <div className="mt-8">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">3</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Key Workflows / Features (40 pts)</h3>
              </div>
              <ScoreRow
                label="Confirm Value"
                maxScore={15}
                seScore={scorecards.SE?.scores?.workflows?.confirmValue || 0}
                managerScore={scorecards.Manager?.scores?.workflows?.confirmValue || 0}
                aiScore={scorecards.AI?.scores?.workflows?.confirmValue || 0}
              />
              <ScoreRow
                label="Connect the Dots"
                maxScore={15}
                seScore={scorecards.SE?.scores?.workflows?.connectDots || 0}
                managerScore={scorecards.Manager?.scores?.workflows?.connectDots || 0}
                aiScore={scorecards.AI?.scores?.workflows?.connectDots || 0}
              />
              <ScoreRow
                label="Pain Point Resolved"
                maxScore={10}
                seScore={scorecards.SE?.scores?.workflows?.painResolved || 0}
                managerScore={scorecards.Manager?.scores?.workflows?.painResolved || 0}
                aiScore={scorecards.AI?.scores?.workflows?.painResolved || 0}
              />
            </div>

            {/* Section 4: Close (10 pts) */}
            <div className="mt-8">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">4</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Confirm Value / Close (10 pts)</h3>
              </div>
              <ScoreRow
                label="Addressed Priority Topics"
                maxScore={2}
                seScore={scorecards.SE?.scores?.close?.priorityTopics || 0}
                managerScore={scorecards.Manager?.scores?.close?.priorityTopics || 0}
                aiScore={scorecards.AI?.scores?.close?.priorityTopics || 0}
              />
              <ScoreRow
                label="Buy-in on Value Pillar (P/F)"
                maxScore={5}
                seScore={scorecards.SE?.scores?.close?.valuePillar || 0}
                managerScore={scorecards.Manager?.scores?.close?.valuePillar || 0}
                aiScore={scorecards.AI?.scores?.close?.valuePillar || 0}
              />
              <ScoreRow
                label="Outstanding Deliverables"
                maxScore={3}
                seScore={scorecards.SE?.scores?.close?.deliverables || 0}
                managerScore={scorecards.Manager?.scores?.close?.deliverables || 0}
                aiScore={scorecards.AI?.scores?.close?.deliverables || 0}
              />
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white/80 backdrop-blur-sm shadow-strong rounded-2xl p-8 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-6">Comments</h2>

            <SectionComments
              sectionName="Introduction"
              seComment={scorecards.SE?.comments?.introduction}
              managerComment={scorecards.Manager?.comments?.introduction}
              aiComment={scorecards.AI?.comments?.introduction}
            />

            <SectionComments
              sectionName="Consultative Selling"
              seComment={scorecards.SE?.comments?.consultative}
              managerComment={scorecards.Manager?.comments?.consultative}
              aiComment={scorecards.AI?.comments?.consultative}
            />

            <SectionComments
              sectionName="Key Workflows"
              seComment={scorecards.SE?.comments?.workflows}
              managerComment={scorecards.Manager?.comments?.workflows}
              aiComment={scorecards.AI?.comments?.workflows}
            />

            <SectionComments
              sectionName="Close"
              seComment={scorecards.SE?.comments?.close}
              managerComment={scorecards.Manager?.comments?.close}
              aiComment={scorecards.AI?.comments?.close}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoachingViewPage;
