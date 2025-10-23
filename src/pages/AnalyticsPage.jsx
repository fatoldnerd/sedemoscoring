import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getCallReviewsForSE, getCallReviewsForManager } from '../services/callReviewService';
import { getScorecardsForCallReview } from '../services/scorecardService';
import { getManagedSEs } from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';

function AnalyticsPage() {
  const { currentUser, userProfile, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const [analyticsData, setAnalyticsData] = useState([]);
  const [managedSEs, setManagedSEs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [selectedSeId, setSelectedSeId] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [selectedItem, setSelectedItem] = useState('introduction.credibility');

  useEffect(() => {
    if (currentUser && userProfile) {
      loadAnalyticsData();
      if (userProfile.role === 'Manager') {
        loadManagedSEs();
      }
    }
  }, [currentUser, userProfile]);

  const loadManagedSEs = async () => {
    try {
      const ses = await getManagedSEs(currentUser.uid);
      setManagedSEs(ses);
    } catch (error) {
      console.error('Error loading managed SEs:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoadingData(true);

      // Get call reviews
      let callReviews;
      if (userProfile.role === 'Manager') {
        callReviews = await getCallReviewsForManager(currentUser.uid);
      } else {
        callReviews = await getCallReviewsForSE(currentUser.uid);
      }

      // Get scorecards for each call review
      const dataPromises = callReviews.map(async (review) => {
        const scorecards = await getScorecardsForCallReview(review.id);
        return {
          callReview: review,
          scorecards: {
            SE: scorecards.find(sc => sc.scorerType === 'SE'),
            Manager: scorecards.find(sc => sc.scorerType === 'Manager'),
            AI: scorecards.find(sc => sc.scorerType === 'AI')
          }
        };
      });

      const data = await Promise.all(dataPromises);

      // Sort by date
      data.sort((a, b) => {
        const dateA = a.callReview.callDate?.toDate?.() || new Date(a.callReview.callDate);
        const dateB = b.callReview.callDate?.toDate?.() || new Date(b.callReview.callDate);
        return dateA - dateB;
      });

      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filter data based on selected filters
  const filteredData = analyticsData.filter(item => {
    // SE filter (for managers)
    if (userProfile.role === 'Manager' && selectedSeId !== 'all') {
      if (item.callReview.seId !== selectedSeId) return false;
    }

    // Date range filter
    if (dateRange !== 'all') {
      const date = item.callReview.callDate?.toDate?.() || new Date(item.callReview.callDate);
      const now = new Date();
      const daysAgo = {
        '30': 30,
        '90': 90,
        '180': 180,
        '365': 365
      }[dateRange];

      if (daysAgo) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        if (date < cutoffDate) return false;
      }
    }

    return true;
  });

  // Calculate section totals
  const calculateSectionTotal = (scores, section) => {
    if (!scores || !scores[section]) return 0;
    return Object.values(scores[section]).reduce((sum, val) => sum + (val || 0), 0);
  };

  // Get nested value from object path (e.g., "introduction.credibility")
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Simple Line Chart Component
  const LineChart = ({ data, lines, height = 200 }) => {
    if (!data || data.length === 0) {
      return <p className="text-gray-500 text-center py-8 dark:text-dark-text-secondary">No data available</p>;
    }

    const maxValue = Math.max(...data.map(d =>
      Math.max(...lines.map(line => line.getValue(d)))
    ));
    const width = 100; // percentage

    return (
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-500 dark:text-dark-text-secondary">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-12 right-0 top-0 bottom-8">
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
              <line
                key={i}
                x1="0"
                y1={height * percent}
                x2={width}
                y2={height * percent}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
            ))}

            {/* Lines */}
            {lines.map((line, lineIndex) => {
              const points = data.map((d, i) => {
                const x = (i / (data.length - 1)) * width;
                const value = line.getValue(d);
                const y = height - (value / maxValue) * height;
                return `${x},${y}`;
              }).join(' ');

              return (
                <polyline
                  key={lineIndex}
                  points={points}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-12 right-0 bottom-0 h-6 flex justify-between text-xs text-gray-500 dark:text-dark-text-secondary">
          {data.map((d, i) => {
            if (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
              return <span key={i}>{formatDate(d.callReview.callDate)}</span>;
            }
            return null;
          })}
        </div>

        {/* Legend */}
        <div className="absolute right-0 top-0 flex flex-wrap gap-4 text-xs">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }}></div>
              <span>{line.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Bar Chart Component for sections
  const BarChart = ({ data, sections, height = 200 }) => {
    if (!data || data.length === 0) {
      return <p className="text-gray-500 text-center py-8 dark:text-dark-text-secondary">No data available</p>;
    }

    const maxValue = Math.max(...data.map(d =>
      Math.max(...sections.map(section => section.getValue(d)))
    ));

    return (
      <div className="space-y-4">
        {data.slice(-5).map((item, index) => (
          <div key={index} className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">{formatDate(item.callReview.callDate)} - {item.callReview.customerName}</p>
            <div className="flex gap-1">
              {sections.map((section, sIndex) => {
                const value = section.getValue(item);
                const percentage = (value / section.maxValue) * 100;
                return (
                  <div
                    key={sIndex}
                    className="h-8 flex items-center justify-center text-xs text-white font-medium rounded"
                    style={{
                      width: `${25}%`,
                      backgroundColor: section.color,
                      opacity: percentage / 100
                    }}
                    title={`${section.label}: ${value}/${section.maxValue}`}
                  >
                    {value > 0 && value}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 text-xs text-gray-500">
              {sections.map((section, sIndex) => (
                <div key={sIndex} className="w-1/4 text-center">{section.label}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading || loadingData) {
    return <LoadingSpinner />;
  }

  // Define all 14 individual items for the dropdown
  const individualItems = [
    { value: 'introduction.credibility', label: 'Establish Credibility', max: 2 },
    { value: 'introduction.priorities', label: 'Align on Priorities', max: 5 },
    { value: 'introduction.roadmap', label: 'Set Roadmap', max: 3 },
    { value: 'consultative.story', label: 'Product in Context of Story', max: 10 },
    { value: 'consultative.featureTour', label: 'Avoid Feature Tour', max: 10 },
    { value: 'consultative.terminology', label: 'Industry Terminology', max: 5 },
    { value: 'consultative.functionality', label: 'Up-to-date Functionality', max: 10 },
    { value: 'consultative.tailoring', label: 'Tailored to Audience', max: 5 },
    { value: 'workflows.confirmValue', label: 'Confirm Value', max: 15 },
    { value: 'workflows.connectDots', label: 'Connect the Dots', max: 15 },
    { value: 'workflows.painResolved', label: 'Pain Point Resolved', max: 10 },
    { value: 'close.priorityTopics', label: 'Priority Topics Addressed', max: 2 },
    { value: 'close.valuePillar', label: 'Buy-in on Value Pillar', max: 5 },
    { value: 'close.deliverables', label: 'Outstanding Deliverables', max: 3 }
  ];

  const selectedItemData = individualItems.find(item => item.value === selectedItem);

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
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics</h1>
              <p className="text-primary-100 text-sm mt-0.5">
                {userProfile?.role === 'Manager' ? 'Team Performance Trends' : 'Personal Performance Trends'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-6 mb-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center dark:text-dark-text">
              <svg className="w-6 h-6 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Filters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center dark:text-dark-text">
                  <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:hover:border-primary-600"
                >
                  <option value="all">All Time</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="180">Last 6 Months</option>
                  <option value="365">Last Year</option>
                </select>
              </div>

              {/* SE Filter (Manager only) */}
              {userProfile?.role === 'Manager' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Sales Engineer
                  </label>
                  <select
                    value={selectedSeId}
                    onChange={(e) => setSelectedSeId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:hover:border-primary-600"
                  >
                    <option value="all">All SEs (Team Average)</option>
                    {managedSEs.map(se => (
                      <option key={se.id} value={se.id}>{se.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Chart 1: Overall Score Trend */}
          <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 mb-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">1</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Overall Score Trend Over Time</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 ml-10 dark:text-dark-text-secondary">
              Displays total scores from all three scorers over time
            </p>
            <LineChart
              data={filteredData}
              lines={[
                {
                  label: 'SE Self-Score',
                  color: '#3b82f6',
                  getValue: (d) => d.scorecards.SE?.totalScore || 0
                },
                {
                  label: 'Manager Score',
                  color: '#a855f7',
                  getValue: (d) => d.scorecards.Manager?.totalScore || 0
                },
                {
                  label: 'AI Score',
                  color: '#10b981',
                  getValue: (d) => d.scorecards.AI?.totalScore || 0
                }
              ]}
              height={250}
            />
          </div>

          {/* Chart 2: Section Score Trends */}
          <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 mb-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">2</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Section Score Trends</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 ml-10 dark:text-dark-text-secondary">
              Score breakdown by section (Last 5 calls)
            </p>
            <BarChart
              data={filteredData}
              sections={[
                {
                  label: 'Intro',
                  color: '#3b82f6',
                  maxValue: 10,
                  getValue: (d) => calculateSectionTotal(d.scorecards.Manager?.scores, 'introduction')
                },
                {
                  label: 'Consultative',
                  color: '#a855f7',
                  maxValue: 40,
                  getValue: (d) => calculateSectionTotal(d.scorecards.Manager?.scores, 'consultative')
                },
                {
                  label: 'Workflows',
                  color: '#10b981',
                  maxValue: 40,
                  getValue: (d) => calculateSectionTotal(d.scorecards.Manager?.scores, 'workflows')
                },
                {
                  label: 'Close',
                  color: '#f59e0b',
                  maxValue: 10,
                  getValue: (d) => calculateSectionTotal(d.scorecards.Manager?.scores, 'close')
                }
              ]}
              height={200}
            />
          </div>

          {/* Chart 3: Individual Item Trends */}
          <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 mb-6 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">3</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Individual Item Trend</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 ml-10 dark:text-dark-text-secondary">
              Select a specific scoring item to see its trend over time
            </p>

            {/* Item Selector */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Select Scoring Item
              </label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full md:w-1/2 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300"
              >
                {individualItems.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label} (max {item.max})
                  </option>
                ))}
              </select>
            </div>

            <LineChart
              data={filteredData}
              lines={[
                {
                  label: `SE - ${selectedItemData?.label}`,
                  color: '#3b82f6',
                  getValue: (d) => getNestedValue(d.scorecards.SE?.scores, selectedItem) || 0
                },
                {
                  label: `Manager - ${selectedItemData?.label}`,
                  color: '#a855f7',
                  getValue: (d) => getNestedValue(d.scorecards.Manager?.scores, selectedItem) || 0
                },
                {
                  label: `AI - ${selectedItemData?.label}`,
                  color: '#10b981',
                  getValue: (d) => getNestedValue(d.scorecards.AI?.scores, selectedItem) || 0
                }
              ]}
              height={250}
            />
          </div>

          {/* Summary Stats */}
          {filteredData.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm shadow-medium rounded-2xl p-8 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center dark:text-dark-text">
                <svg className="w-6 h-6 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Summary Statistics
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mb-2 dark:text-dark-text-secondary">Total Call Reviews</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{filteredData.length}</p>
                </div>
                <div className="text-center bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200 shadow-sm">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
                  </div>
                  <p className="text-sm font-semibold text-purple-900 mb-2">Average Manager Score</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.round(
                      filteredData.reduce((sum, d) => sum + (d.scorecards.Manager?.totalScore || 0), 0) / filteredData.length
                    )}
                  </p>
                </div>
                <div className="text-center bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-6 border border-green-200 shadow-sm">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">AI</div>
                  </div>
                  <p className="text-sm font-semibold text-green-900 mb-2">Average AI Score</p>
                  <p className="text-3xl font-bold text-green-600">
                    {Math.round(
                      filteredData.reduce((sum, d) => sum + (d.scorecards.AI?.totalScore || 0), 0) / filteredData.length
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
