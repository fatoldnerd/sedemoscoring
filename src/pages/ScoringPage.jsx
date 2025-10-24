import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getCallReviewById } from '../services/callReviewService';
import { getScorecardByType, updateScorecard, calculateTotalScore } from '../services/scorecardService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function ScoringPage() {
  const { callReviewId, scorerType } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const [callReview, setCallReview] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Scoring state
  const [scores, setScores] = useState({
    introduction: { credibility: 0, priorities: 0, roadmap: 0 },
    consultative: { story: 0, featureTour: 0, terminology: 0, functionality: 0, tailoring: 0 },
    workflows: { confirmValue: 0, connectDots: 0, painResolved: 0 },
    close: { priorityTopics: 0, valuePillar: 0, deliverables: 0 }
  });

  const [comments, setComments] = useState({
    introduction: '',
    consultative: '',
    workflows: '',
    close: ''
  });

  useEffect(() => {
    loadData();
  }, [callReviewId, scorerType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const reviewData = await getCallReviewById(callReviewId);
      const scorecardData = await getScorecardByType(callReviewId, scorerType);

      if (!reviewData) {
        throw new Error('Call review not found');
      }
      if (!scorecardData) {
        throw new Error('Scorecard not found');
      }

      setCallReview(reviewData);
      setScorecard(scorecardData);

      // Load existing scores if available
      if (scorecardData.scores) {
        setScores(scorecardData.scores);
      }
      if (scorecardData.comments) {
        setComments(scorecardData.comments);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load scorecard');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (section, criterion, value) => {
    setScores(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [criterion]: prev[section][criterion] === value ? 0 : value
      }
    }));
  };

  const handleSliderChange = (section, criterion, value) => {
    setScores(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [criterion]: value
      }
    }));
  };

  const handleCommentChange = (section, value) => {
    setComments(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Import the necessary functions
      const { getScorecardsForCallReview } = await import('../services/scorecardService');
      const { recalculateCallReviewStatus } = await import('../services/callReviewService');

      // Submit the scorecard
      await updateScorecard(scorecard.id, scores, comments);

      // Recalculate and update the call review status
      const allScorecards = await getScorecardsForCallReview(callReviewId);
      await recalculateCallReviewStatus(callReviewId, allScorecards);

      navigate('/dashboard');
    } catch (err) {
      console.error('Error submitting scorecard:', err);
      setError('Failed to submit scorecard. Please try again.');
      setSubmitting(false);
    }
  };

  const totalScore = calculateTotalScore(scores);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error && !callReview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-dark-bg">
        <ErrorMessage message={error} />
      </div>
    );
  }

  const ToggleButton = ({ section, criterion, value, label, isPF = false }) => {
    const isActive = scores[section][criterion] === value;
    const isPassingScore = value > 0;
    return (
      <button
        type="button"
        onClick={() => handleToggle(section, criterion, value)}
        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 ${
          isActive
            ? isPassingScore
              ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-soft'
              : 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-soft'
            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:bg-dark-card dark:border-dark-border dark:text-dark-text dark:hover:border-primary-600 dark:hover:bg-dark-border'
        }`}
      >
        {label} {isPF && <span className="text-xs opacity-90">(P/F)</span>}
      </button>
    );
  };

  const ScoreSlider = ({ section, criterion, maxValue, label }) => {
    const currentValue = scores[section][criterion];
    const percentage = (currentValue / maxValue) * 100;

    // Color based on percentage
    const getColor = () => {
      if (percentage >= 80) return 'from-green-500 to-emerald-500';
      if (percentage >= 50) return 'from-yellow-500 to-amber-500';
      return 'from-red-500 to-rose-500';
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700 dark:text-dark-text flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {label}
          </label>
          <div className="flex items-center space-x-2">
            <span className={`text-3xl font-bold bg-gradient-to-r ${getColor()} bg-clip-text text-transparent`}>
              {currentValue}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">/ {maxValue}</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-gray-500 w-6">0</span>
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max={maxValue}
              step="1"
              value={currentValue}
              onChange={(e) => handleSliderChange(section, criterion, parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right,
                  rgb(59, 130, 246) 0%,
                  rgb(59, 130, 246) ${percentage}%,
                  rgb(229, 231, 235) ${percentage}%,
                  rgb(229, 231, 235) 100%)`
              }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 w-6 text-right">{maxValue}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-bg transition-colors duration-200">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 shadow-soft dark:from-primary-700 dark:to-accent-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="group flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300 mb-3"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to Dashboard</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {scorerType === 'SE' ? 'SE Self-Score' : 'Manager Score'}
              </h1>
              <div className="flex items-center space-x-3 mt-1">
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
                  {callReview.callDate?.toDate().toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30">
              <p className="text-primary-100 text-xs font-semibold uppercase tracking-wider mb-1">Demo Score Total</p>
              <p className="text-4xl sm:text-5xl font-bold text-white">{totalScore}<span className="text-2xl text-primary-100">/100</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {error && <ErrorMessage message={error} />}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Introduction (10 pts) */}
            <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b-2 border-gradient-to-r from-primary-100 to-accent-100">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl text-white font-bold shadow-soft">
                  1
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Introduction (10 pts)
                </h2>
              </div>

              <div className="space-y-6">
                {/* Establish Credibility (2 pts) */}
                <ScoreSlider
                  section="introduction"
                  criterion="credibility"
                  maxValue={2}
                  label="Establish Credibility (2 pts)"
                />

                {/* Align on Priorities (5 pts) */}
                <ScoreSlider
                  section="introduction"
                  criterion="priorities"
                  maxValue={5}
                  label="Align on Priorities (5 pts)"
                />

                {/* Set Roadmap for the Call (3 pts) */}
                <ScoreSlider
                  section="introduction"
                  criterion="roadmap"
                  maxValue={3}
                  label="Set Roadmap for the Call (3 pts)"
                />

                {/* Comments */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Introduction Comments
                  </label>
                  <textarea
                    value={comments.introduction}
                    onChange={(e) => handleCommentChange('introduction', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-text-secondary dark:hover:border-primary-600"
                    placeholder="Add your comments here..."
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Consultative Selling Approach (40 pts) */}
            <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b-2 border-gradient-to-r from-primary-100 to-accent-100">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl text-white font-bold shadow-soft">
                  2
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Consultative Selling Approach (40 pts)
                </h2>
              </div>

              <div className="space-y-6">
                {/* Walk through in Context of Story (10 pts, P/F) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Walk through Product Functionality in Context of a Story (10 pts, P/F)
                  </label>
                  <div className="flex space-x-3">
                    <ToggleButton section="consultative" criterion="story" value={10} label="Pass (10)" isPF />
                    <ToggleButton section="consultative" criterion="story" value={0} label="Fail (0)" isPF />
                  </div>
                </div>

                {/* Avoid Feature Tour (10 pts, P/F) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Avoid Feature Tour (10 pts, P/F)
                  </label>
                  <div className="flex space-x-3">
                    <ToggleButton section="consultative" criterion="featureTour" value={10} label="Pass (10)" isPF />
                    <ToggleButton section="consultative" criterion="featureTour" value={0} label="Fail (0)" isPF />
                  </div>
                </div>

                {/* Use of Industry Terminology (5 pts) */}
                <ScoreSlider
                  section="consultative"
                  criterion="terminology"
                  maxValue={5}
                  label="Use of Industry Terminology (5 pts)"
                />

                {/* Use of up to date functionality (10 pts) */}
                <ScoreSlider
                  section="consultative"
                  criterion="functionality"
                  maxValue={10}
                  label="Use of up to date functionality per Features Guide (10 pts)"
                />

                {/* Tailor demo content (5 pts) */}
                <ScoreSlider
                  section="consultative"
                  criterion="tailoring"
                  maxValue={5}
                  label="Tailor demo content to the priorities of audience (5 pts)"
                />

                {/* Comments */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Consultative Selling Comments
                  </label>
                  <textarea
                    value={comments.consultative}
                    onChange={(e) => handleCommentChange('consultative', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-text-secondary dark:hover:border-primary-600"
                    placeholder="Add your comments here..."
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Highlight Key Workflows / Features (40 pts) */}
            <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b-2 border-gradient-to-r from-primary-100 to-accent-100">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl text-white font-bold shadow-soft">
                  3
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Highlight Key Workflows / Features (40 pts)
                </h2>
              </div>

              <div className="space-y-6">
                {/* Confirm Value (15 pts) */}
                <ScoreSlider
                  section="workflows"
                  criterion="confirmValue"
                  maxValue={15}
                  label="Confirm Value (15 pts)"
                />

                {/* Connect the Dots (15 pts) */}
                <ScoreSlider
                  section="workflows"
                  criterion="connectDots"
                  maxValue={15}
                  label="Connect the Dots (15 pts)"
                />

                {/* Confirmation that Pain Point Resolved (10 pts) */}
                <ScoreSlider
                  section="workflows"
                  criterion="painResolved"
                  maxValue={10}
                  label="Confirmation that Pain Point Resolved if relevant (10 pts)"
                />

                {/* Comments */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Key Workflows Comments
                  </label>
                  <textarea
                    value={comments.workflows}
                    onChange={(e) => handleCommentChange('workflows', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-text-secondary dark:hover:border-primary-600"
                    placeholder="Add your comments here..."
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Confirm Value / Close (10 pts) */}
            <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b-2 border-gradient-to-r from-primary-100 to-accent-100">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl text-white font-bold shadow-soft">
                  4
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Confirm Value / Close (10 pts)
                </h2>
              </div>

              <div className="space-y-6">
                {/* Confirm priority topics (2 pts) */}
                <ScoreSlider
                  section="close"
                  criterion="priorityTopics"
                  maxValue={2}
                  label="Confirm we addressed highest priority topics for this call (2 pts)"
                />

                {/* Confirm buy in (5 pts, P/F) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm buy in on Relevant Value Pillar (5 pts, P/F)
                  </label>
                  <div className="flex space-x-3">
                    <ToggleButton section="close" criterion="valuePillar" value={5} label="Pass (5)" isPF />
                    <ToggleButton section="close" criterion="valuePillar" value={0} label="Fail (0)" isPF />
                  </div>
                </div>

                {/* Confirm outstanding deliverables (3 pts) */}
                <ScoreSlider
                  section="close"
                  criterion="deliverables"
                  maxValue={3}
                  label="Confirm outstanding deliverables from the demo (3 pts)"
                />

                {/* Comments */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Confirm Value / Close Comments
                  </label>
                  <textarea
                    value={comments.close}
                    onChange={(e) => handleCommentChange('close', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-text-secondary dark:hover:border-primary-600"
                    placeholder="Add your comments here..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pb-8">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="group px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border dark:hover:border-dark-text-secondary"
                disabled={submitting}
              >
                <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="group relative px-8 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold hover:from-primary-700 hover:to-accent-700 shadow-soft hover:shadow-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Submit Scorecard</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ScoringPage;
