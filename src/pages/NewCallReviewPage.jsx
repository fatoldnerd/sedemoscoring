import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { createCallReview } from '../services/callReviewService';
import { createBlankScorecards } from '../services/scorecardService';
import { getManagedSEs } from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function NewCallReviewPage() {
  const { currentUser, userProfile, loading } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    selectedSeId: '',
    customerName: '',
    callDate: '',
    callLink: '',
    transcript: ''
  });

  const [managedSEs, setManagedSEs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load managed SEs if user is a manager
  useEffect(() => {
    if (userProfile?.role === 'Manager') {
      loadManagedSEs();
    }
  }, [userProfile]);

  const loadManagedSEs = async () => {
    try {
      const ses = await getManagedSEs(currentUser.uid);
      setManagedSEs(ses);
    } catch (err) {
      console.error('Error loading managed SEs:', err);
      setError('Failed to load SE list');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Determine seId and managerId based on role
      let seId, managerId;

      if (userProfile.role === 'Manager') {
        if (!formData.selectedSeId) {
          throw new Error('Please select an SE');
        }
        seId = formData.selectedSeId;
        managerId = currentUser.uid;
      } else {
        // SE initiating their own call review
        seId = currentUser.uid;
        // TODO: Get the SE's manager from their user profile
        // For now, we'll need to add managerId to the SE's profile
        managerId = userProfile.managerId || currentUser.uid; // Fallback for now
      }

      // Create the call review
      const callReviewId = await createCallReview({
        seId,
        managerId,
        customerName: formData.customerName,
        callDate: new Date(formData.callDate),
        callLink: formData.callLink,
        transcript: formData.transcript
      });

      // Create the 3 blank scorecards
      await createBlankScorecards(callReviewId, seId);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error creating call review:', err);
      setError(err.message || 'Failed to create call review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-bg transition-colors duration-200">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 shadow-soft dark:from-primary-700 dark:to-accent-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                New Call Review
              </h1>
              <p className="text-primary-100 text-sm mt-0.5">
                Create and submit a new call for review and coaching
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {error && <ErrorMessage message={error} />}

          <div className="bg-white/80 backdrop-blur-sm shadow-strong rounded-2xl p-8 border border-gray-100 animate-scale-in dark:bg-dark-card dark:border-dark-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SE Selector (Manager only) */}
              {userProfile?.role === 'Manager' && (
                <div>
                  <label htmlFor="selectedSeId" className="block text-sm font-bold text-gray-700 mb-2 flex items-center dark:text-dark-text">
                    <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Select SE *
                  </label>
                  <select
                    id="selectedSeId"
                    name="selectedSeId"
                    value={formData.selectedSeId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:hover:border-primary-600"
                  >
                    <option value="">-- Select an SE --</option>
                    {managedSEs.map(se => (
                      <option key={se.id} value={se.id}>
                        {se.name} ({se.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Name */}
              <div>
                <label htmlFor="customerName" className="block text-sm font-bold text-gray-700 mb-2 flex items-center dark:text-dark-text">
                  <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  placeholder="Acme Corp"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-text-secondary dark:hover:border-primary-600"
                />
              </div>

              {/* Call Date */}
              <div>
                <label htmlFor="callDate" className="block text-sm font-bold text-gray-700 mb-2 flex items-center dark:text-dark-text">
                  <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Call Date *
                </label>
                <input
                  type="date"
                  id="callDate"
                  name="callDate"
                  value={formData.callDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:hover:border-primary-600"
                />
              </div>

              {/* Call Recording Link */}
              <div>
                <label htmlFor="callLink" className="block text-sm font-bold text-gray-700 mb-2 flex items-center dark:text-dark-text">
                  <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Link to Call Recording *
                </label>
                <input
                  type="url"
                  id="callLink"
                  name="callLink"
                  value={formData.callLink}
                  onChange={handleChange}
                  required
                  placeholder="https://gong.io/call/123"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-text-secondary dark:hover:border-primary-600"
                />
              </div>

              {/* Call Transcript */}
              <div>
                <label htmlFor="transcript" className="block text-sm font-bold text-gray-700 mb-2 flex items-center dark:text-dark-text">
                  <svg className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paste Call Transcript *
                </label>
                <textarea
                  id="transcript"
                  name="transcript"
                  value={formData.transcript}
                  onChange={handleChange}
                  required
                  rows={12}
                  placeholder="Paste the full call transcript here..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all duration-200 bg-white shadow-sm hover:border-primary-300 font-mono text-sm dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-text-secondary dark:hover:border-primary-600"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100 dark:border-dark-border">
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
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create Call Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewCallReviewPage;
