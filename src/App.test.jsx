import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Mock Firebase
vi.mock('./config/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
}));

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Immediately call with no user (logged out state)
    callback(null);
    // Return unsubscribe function
    return vi.fn();
  }),
  GoogleAuthProvider: vi.fn(),
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Simple assertion - just verify it rendered
    expect(document.body).toBeTruthy();
  });
});
