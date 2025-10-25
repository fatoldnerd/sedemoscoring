import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import NewCallReviewPage from './pages/NewCallReviewPage';
import ScoringPage from './pages/ScoringPage';
import CallReviewDetailsPage from './pages/CallReviewDetailsPage';
import CoachingViewPage from './pages/CoachingViewPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminSetupPage from './pages/AdminSetupPage';
import ProtectedRoute from './components/ProtectedRoute';

console.log('App.jsx: Component loaded');

function App() {
  console.log('App.jsx: Rendering App component');

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager-dashboard"
          element={
            <ProtectedRoute>
              <ManagerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calls/new"
          element={
            <ProtectedRoute>
              <NewCallReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calls/:callReviewId/score/:scorerType"
          element={
            <ProtectedRoute>
              <ScoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calls/:callReviewId/details"
          element={
            <ProtectedRoute>
              <CallReviewDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calls/:callReviewId/coaching"
          element={
            <ProtectedRoute>
              <CoachingViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-setup"
          element={
            <ProtectedRoute>
              <AdminSetupPage />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
