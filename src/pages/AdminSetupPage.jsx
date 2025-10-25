import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Temporary Admin Setup Page
 *
 * This page allows the logged-in user to set themselves as a Manager.
 * Access this page at: /admin-setup
 *
 * After both manager accounts are set up, this page can be removed.
 */
export default function AdminSetupPage() {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetupManager = async () => {
    if (!currentUser) {
      setMessage('❌ No user logged in');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const userRef = doc(db, 'users', currentUser.uid);

      await setDoc(userRef, {
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0],
        role: 'Manager',
        managedSeIds: userProfile?.managedSeIds || [],
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage(`✅ Successfully set ${currentUser.email} as Manager! Please refresh the page.`);

    } catch (error) {
      console.error('Error setting up manager:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
              Admin Setup
            </h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">
              One-time setup for manager accounts
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Instructions
            </h2>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
              <li>Log in as <strong>brad.towers@simprogroup.com</strong></li>
              <li>Click the button below to set yourself as Manager</li>
              <li>Log out and repeat for <strong>bradptowers@gmail.com</strong></li>
              <li>After both accounts are set up, this page can be removed</li>
            </ol>
          </div>

          {currentUser && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Current User
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="font-semibold text-gray-900 dark:text-dark-text">{currentUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Role:</span>
                  <span className="font-semibold text-gray-900 dark:text-dark-text">
                    {userProfile?.role || 'SE (default)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSetupManager}
            disabled={loading || !currentUser}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Set Me as Manager</span>
              </>
            )}
          </button>

          {message && (
            <div className={`mt-6 p-4 rounded-xl ${message.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'}`}>
              <p className="text-sm font-semibold">{message}</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              This is a temporary setup page. After manager accounts are configured,
              remove this page and update Firestore rules to prevent unauthorized role changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
