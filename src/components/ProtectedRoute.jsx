import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  console.log('ProtectedRoute:', { loading, currentUser: !!currentUser });

  if (loading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner />
          <p style={{ marginTop: '1rem', color: '#4b5563' }}>Loading authentication...</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
            (If this takes more than 5 seconds, check the browser console)
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: User authenticated, rendering children');
  return children;
};

export default ProtectedRoute;
