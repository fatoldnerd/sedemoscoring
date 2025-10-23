# SE Demo Scoring App - Technical Architecture

**Version:** 1.0
**Last Updated:** 2025-10-19
**Product:** SE Call Scoring & Prep App

---

## 1. System Overview

### 1.1 Architecture Style
- **Pattern:** Serverless Single-Page Application (SPA)
- **Frontend:** React SPA with client-side routing
- **Backend:** Firebase Backend-as-a-Service (BaaS)
- **AI Processing:** Serverless Cloud Functions + Gemini API
- **Hosting:** Firebase Hosting with CDN

### 1.2 Technology Stack
- **Frontend Framework:** React 18+ with functional components and hooks
- **Styling:** Tailwind CSS 3+ for utility-first styling
- **State Management:** React Context API + hooks (lightweight, no Redux needed for MVP)
- **Routing:** React Router v6
- **Authentication:** Firebase Authentication (Google OAuth + Email/Password)
- **Database:** Cloud Firestore (NoSQL document database)
- **File Storage:** Cloud Storage for Firebase (transcript files)
- **Cloud Functions:** Firebase Cloud Functions (Node.js) for AI scoring
- **AI Integration:** Google Gemini API
- **Deployment:** Firebase Hosting
- **Build Tool:** Vite (fast, modern build tool)

---

## 2. Firestore Data Model

### 2.1 Collection Structure

```
/users/{userId}
/calls/{callId}
/scorecards/{scorecardId}
/transcripts/{transcriptId}
```

### 2.2 Schema Definitions

#### **Collection: `users`**
Stores user profile data, roles, and team assignments.

```javascript
{
  userId: string,              // Auto-generated Firebase Auth UID
  email: string,               // User's email address
  displayName: string,         // Full name for display
  role: string,                // "se" | "manager"
  managerId: string | null,    // Reference to manager's userId (null for managers)
  createdAt: timestamp,        // Account creation date
  lastLoginAt: timestamp,      // Last login timestamp
  photoURL: string | null,     // Profile photo URL (from OAuth or custom)
}
```

**Indexes:**
- `managerId` (for querying team members)
- `role` (for filtering by role)

---

#### **Collection: `calls`**
Represents a single SE call/demo that will be scored.

```javascript
{
  callId: string,              // Auto-generated document ID
  seUserId: string,            // SE who conducted the call (indexed)
  callDate: timestamp,         // When the call occurred
  callTitle: string,           // User-provided title/description
  prospectName: string | null, // Optional: prospect/company name

  // Transcript metadata
  transcriptId: string | null, // Reference to /transcripts/{transcriptId}
  transcriptUploadedAt: timestamp | null,

  // Scoring status
  seScoreSubmitted: boolean,   // Has SE submitted their self-score?
  managerScoreSubmitted: boolean, // Has manager scored this call?
  aiScoreStatus: string,       // "pending" | "completed" | "error" | "not_started"

  // Score references
  seScoreId: string | null,    // Reference to scorecard
  managerScoreId: string | null, // Reference to scorecard
  aiScoreId: string | null,    // Reference to scorecard

  // Metadata
  createdAt: timestamp,        // Call record creation
  updatedAt: timestamp,        // Last modification
}
```

**Indexes:**
- `seUserId` (for listing SE's calls)
- `seUserId + callDate` (for chronological sorting)
- `managerScoreSubmitted` (for pending reviews)

---

#### **Collection: `scorecards`**
Stores individual scoring submissions (SE, Manager, or AI).

```javascript
{
  scorecardId: string,         // Auto-generated document ID
  callId: string,              // Reference to parent call (indexed)
  scorerType: string,          // "se" | "manager" | "ai"
  scorerUserId: string | null, // UserId of scorer (null for AI)

  // Section 1: Introduction (5 points)
  introductionScore: number,   // 0-5
  introductionComments: string,

  // Section 2: Consultative Selling (35 points)
  consultativeScore: number,   // 0-35
  consultativeComments: string,

  // Section 3: Key Workflows (30 points)
  keyWorkflowsScore: number,   // 0-30
  keyWorkflowsComments: string,

  // Section 4: Close (5 points)
  closeScore: number,          // 0-5
  closeComments: string,

  // Calculated fields
  totalScore: number,          // Sum of all sections (0-75)
  demoRating: number,          // (totalScore / 75) * 100

  // Detailed scoring breakdown (for granular reporting)
  scoreBreakdown: {
    // Introduction items
    intro_item_1: number,
    intro_item_2: number,
    // ... (all P/F and graded items)

    // Consultative items
    consultative_discovery: number,
    consultative_pain_points: number,
    // ... (all items)

    // Key Workflow items
    workflow_demo_quality: number,
    workflow_feature_explanation: number,
    // ... (all items)

    // Close items
    close_next_steps: number,
    close_summary: number,
  },

  // Metadata
  submittedAt: timestamp,      // When scorecard was submitted
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

**Indexes:**
- `callId` (for retrieving all scores for a call)
- `callId + scorerType` (for efficient score lookups)

**Note:** The `scoreBreakdown` object will contain all individual scoring items from the 75-point rubric. The exact field names will be defined once the CSV rubric is provided.

---

#### **Collection: `transcripts`**
Stores transcript files and metadata.

```javascript
{
  transcriptId: string,        // Auto-generated document ID
  callId: string,              // Reference to parent call (indexed)
  uploadedBy: string,          // UserId of uploader

  // File metadata
  fileName: string,            // Original filename
  fileSize: number,            // Size in bytes
  mimeType: string,            // "text/plain"
  storageRef: string,          // Cloud Storage path: "transcripts/{transcriptId}.txt"

  // Processing status
  aiProcessingStatus: string,  // "pending" | "processing" | "completed" | "error"
  aiErrorMessage: string | null, // Error details if aiProcessingStatus = "error"

  // Metadata
  uploadedAt: timestamp,
  processedAt: timestamp | null,
}
```

**Indexes:**
- `callId` (for retrieving transcript for a call)

---

### 2.3 Data Relationships

```
User (SE)
  ├─> managerId -> User (Manager)
  └─> calls[] -> Call
                   ├─> transcriptId -> Transcript
                   ├─> seScoreId -> Scorecard (scorerType: "se")
                   ├─> managerScoreId -> Scorecard (scorerType: "manager")
                   └─> aiScoreId -> Scorecard (scorerType: "ai")
```

---

## 3. Application Workflow

### 3.1 User Journey: SE Creates Call and Self-Scores

```
1. SE logs in
2. SE navigates to "Create New Call" page
3. SE fills out call metadata:
   - Call title
   - Call date
   - Prospect name (optional)
4. SE uploads transcript file (.txt, max 1MB)
   → File uploaded to Cloud Storage
   → Transcript record created in Firestore
   → AI scoring Cloud Function triggered (background)
5. SE fills out self-scoring form (75-point scorecard)
6. SE submits self-score
   → Scorecard record created (scorerType: "se")
   → Call updated: seScoreSubmitted = true
   → Manager notified (pending review appears on manager dashboard)
7. SE can view "Coaching View" (shows SE score only until manager scores)
```

### 3.2 User Journey: Manager Reviews and Scores Call

```
1. Manager logs in
2. Manager sees "Pending Reviews" on dashboard
3. Manager clicks on a pending call
4. Manager views:
   - Call metadata
   - Transcript (readable view)
   - SE's self-score (if submitted)
   - AI score (if completed)
5. Manager fills out scoring form (75-point scorecard)
6. Manager submits score
   → Scorecard record created (scorerType: "manager")
   → Call updated: managerScoreSubmitted = true
7. Both SE and Manager can now view full "Coaching View"
```

### 3.3 AI Scoring Workflow (Background Process)

```
1. Transcript uploaded to Cloud Storage
   → Firestore trigger: onUpdate(call document)
2. Cloud Function invoked: processTranscriptForAI
3. Function downloads transcript from Storage
4. Function validates file size and content
5. Function sends transcript + 75-point rubric prompt to Gemini API
6. Gemini API returns structured JSON score
7. Function creates Scorecard record (scorerType: "ai")
8. Function updates Call:
   - aiScoreId = {scorecardId}
   - aiScoreStatus = "completed" | "error"
9. UI polls or listens for aiScoreStatus change
```

**Error Handling:**
- If Gemini API fails: aiScoreStatus = "error", aiErrorMessage saved
- UI displays "AI Score: Error" in Coaching View
- Human scores proceed independently

---

### 3.4 State Transitions: Call Lifecycle

```
Call States:
1. draft          -> Call created, no transcript uploaded yet
2. transcript_uploaded -> Transcript uploaded, AI processing starts
3. ai_processing  -> AI scoring in progress
4. se_scored      -> SE submitted self-score
5. manager_scored -> Manager submitted score (call is "complete")
6. error          -> AI scoring failed (human scores continue)
```

---

## 4. Component Structure

### 4.1 Component Hierarchy

```
App
├── AuthProvider (Context)
│   └── [Wraps entire app with authentication state]
│
├── AppRouter
│   ├── PublicRoutes
│   │   ├── LoginPage
│   │   └── SignupPage
│   │
│   └── ProtectedRoutes (require authentication)
│       ├── MainLayout
│       │   ├── Navbar
│       │   └── Sidebar
│       │
│       ├── DashboardPage
│       │   ├── SEDashboard (role: se)
│       │   │   ├── RecentCallsList
│       │   │   ├── AverageScoreCard
│       │   │   └── PersonalTrendsChart
│       │   │
│       │   └── ManagerDashboard (role: manager)
│       │       ├── TeamOverviewCard
│       │       ├── PendingReviewsList
│       │       └── TeamTrendsChart
│       │
│       ├── CreateCallPage
│       │   ├── CallMetadataForm
│       │   ├── TranscriptUploader
│       │   └── ScorecardForm (SE self-score)
│       │
│       ├── CallDetailsPage (Coaching View)
│       │   ├── CallHeader (metadata)
│       │   ├── TranscriptViewer
│       │   └── ScoreComparison
│       │       ├── ScorecardDisplay (SE score)
│       │       ├── ScorecardDisplay (Manager score)
│       │       └── ScorecardDisplay (AI score)
│       │
│       ├── ManagerScoringPage
│       │   ├── CallContext (read-only metadata)
│       │   ├── TranscriptViewer (read-only)
│       │   └── ScorecardForm (Manager scoring)
│       │
│       ├── CallHistoryPage
│       │   ├── CallsListTable (filterable/sortable)
│       │   └── CallListItem
│       │
│       └── AnalyticsPage
│           ├── TimeRangePicker
│           ├── ScoreTrendsChart
│           └── CriteriaBreakdownTable
```

---

### 4.2 Key React Components

#### **Core Components**

| Component | Purpose | Props |
|-----------|---------|-------|
| `AuthProvider` | Context provider for authentication state | `children` |
| `ProtectedRoute` | Route guard that requires authentication | `children`, `requiredRole?` |
| `MainLayout` | Shared layout with navbar and sidebar | `children` |
| `Navbar` | Top navigation bar with user menu | - |
| `Sidebar` | Side navigation menu | - |

#### **Dashboard Components**

| Component | Purpose | Props |
|-----------|---------|-------|
| `DashboardPage` | Main dashboard (role-based rendering) | - |
| `SEDashboard` | SE-specific dashboard view | `userId` |
| `ManagerDashboard` | Manager-specific dashboard view | `userId` |
| `RecentCallsList` | List of recent calls | `calls[]` |
| `AverageScoreCard` | Display average score metric | `averageScore`, `totalCalls` |
| `PendingReviewsList` | List of calls pending manager review | `calls[]` |
| `TeamOverviewCard` | Manager's team statistics | `teamStats` |

#### **Call Management Components**

| Component | Purpose | Props |
|-----------|---------|-------|
| `CreateCallPage` | Page for creating new call | - |
| `CallMetadataForm` | Form for call details (title, date, etc.) | `onSubmit`, `initialValues?` |
| `TranscriptUploader` | File upload component for transcripts | `onUpload`, `maxSize`, `acceptedTypes` |
| `CallDetailsPage` | Coaching view for a single call | `callId` |
| `CallHeader` | Display call metadata | `call` |
| `TranscriptViewer` | Display transcript text | `transcriptId` |

#### **Scoring Components**

| Component | Purpose | Props |
|-----------|---------|-------|
| `ScorecardForm` | Interactive 75-point scoring form | `callId`, `scorerType`, `onSubmit` |
| `ScorecardSection` | Reusable section component (Intro, Consultative, etc.) | `title`, `maxPoints`, `items[]`, `onChange` |
| `ScoringItem` | Individual scoring item (P/F or graded) | `label`, `type`, `maxPoints`, `value`, `onChange` |
| `ScoreComparison` | Side-by-side score display | `seScore`, `managerScore`, `aiScore` |
| `ScorecardDisplay` | Read-only scorecard view | `scorecard` |

#### **Analytics Components**

| Component | Purpose | Props |
|-----------|---------|-------|
| `AnalyticsPage` | Analytics dashboard | `userId`, `isManager` |
| `TimeRangePicker` | Date range selector | `onRangeChange` |
| `ScoreTrendsChart` | Line chart for score trends | `data[]`, `timeRange` |
| `CriteriaBreakdownTable` | Table showing score breakdown by criteria | `scorecards[]` |

---

### 4.3 Shared/Utility Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `LoadingSpinner` | Loading indicator | `size?`, `message?` |
| `ErrorBoundary` | Error boundary wrapper | `children`, `fallback?` |
| `ErrorMessage` | Display error messages | `message`, `type?` |
| `ConfirmDialog` | Confirmation modal | `title`, `message`, `onConfirm`, `onCancel` |
| `Button` | Reusable styled button | `variant`, `size`, `onClick`, `children` |
| `Card` | Container card component | `children`, `title?` |
| `Badge` | Status badge (e.g., "Pending", "Complete") | `status`, `label` |

---

## 5. API & Integration Plan

### 5.1 Firebase Authentication

#### **Configuration**
```javascript
// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

#### **Authentication Methods**
1. **Google OAuth:**
   ```javascript
   signInWithPopup(auth, googleProvider)
   ```

2. **Email/Password:**
   ```javascript
   createUserWithEmailAndPassword(auth, email, password)
   signInWithEmailAndPassword(auth, email, password)
   ```

3. **User Profile Creation:**
   - On first login, check if `/users/{uid}` exists
   - If not, create user document with default values
   - Role and managerId must be set manually by admin (MVP)

---

### 5.2 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isSE() {
      return isAuthenticated() && getUserData().role == 'se';
    }

    function isManager() {
      return isAuthenticated() && getUserData().role == 'manager';
    }

    function isOwnData(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isMyTeamMember(seUserId) {
      let seData = get(/databases/$(database)/documents/users/$(seUserId)).data;
      return seData.managerId == request.auth.uid;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isOwnData(userId)
                  || (isManager() && isMyTeamMember(userId));
      allow write: if false; // Admin only (via Firebase Console or Admin SDK)
    }

    // Calls collection
    match /calls/{callId} {
      allow read: if isOwnData(resource.data.seUserId)
                  || (isManager() && isMyTeamMember(resource.data.seUserId));

      allow create: if isAuthenticated()
                    && request.resource.data.seUserId == request.auth.uid;

      allow update: if isOwnData(resource.data.seUserId)
                    || (isManager() && isMyTeamMember(resource.data.seUserId));

      allow delete: if false; // No deletes in MVP
    }

    // Scorecards collection
    match /scorecards/{scorecardId} {
      allow read: if isAuthenticated();

      allow create: if isAuthenticated() && (
        // SE creating their own score
        (request.resource.data.scorerType == 'se'
         && request.resource.data.scorerUserId == request.auth.uid)

        // Manager creating score for team member's call
        || (request.resource.data.scorerType == 'manager'
            && isManager()
            && isMyTeamMember(getCallSEUserId(request.resource.data.callId)))

        // AI creating score (via Cloud Function with admin privileges)
        || request.resource.data.scorerType == 'ai'
      );

      allow update: if false; // Scorecards are immutable after creation
      allow delete: if false; // No deletes in MVP
    }

    // Transcripts collection
    match /transcripts/{transcriptId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if false; // Immutable after creation
      allow delete: if false; // No deletes in MVP
    }

    // Helper function
    function getCallSEUserId(callId) {
      return get(/databases/$(database)/documents/calls/$(callId)).data.seUserId;
    }
  }
}
```

---

### 5.3 Cloud Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Transcripts storage
    match /transcripts/{transcriptId}.txt {
      allow read: if request.auth != null;

      allow write: if request.auth != null
                   && request.resource.size < 1 * 1024 * 1024  // 1MB limit
                   && request.resource.contentType == 'text/plain';

      allow delete: if false; // No deletes in MVP
    }
  }
}
```

---

### 5.4 Gemini API Integration

#### **Cloud Function: `processTranscriptForAI`**

**Trigger:** Firestore onCreate/onUpdate for `/calls/{callId}` where `transcriptId` is newly set.

**Function Logic:**
```javascript
// functions/src/processTranscript.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');

exports.processTranscriptForAI = functions.firestore
  .document('calls/{callId}')
  .onUpdate(async (change, context) => {
    const callId = context.params.callId;
    const newData = change.after.data();
    const oldData = change.before.data();

    // Only proceed if transcript was just added
    if (!newData.transcriptId || oldData.transcriptId === newData.transcriptId) {
      return null;
    }

    // Update AI status to "processing"
    await change.after.ref.update({
      aiScoreStatus: 'processing'
    });

    try {
      // Get transcript from Storage
      const transcriptDoc = await admin.firestore()
        .collection('transcripts')
        .doc(newData.transcriptId)
        .get();

      const transcriptData = transcriptDoc.data();
      const bucket = admin.storage().bucket();
      const file = bucket.file(transcriptData.storageRef);
      const [contents] = await file.download();
      const transcriptText = contents.toString('utf-8');

      // Call Gemini API
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = buildScoringPrompt(transcriptText);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const scoreData = JSON.parse(response.text());

      // Create AI scorecard
      const scorecardRef = await admin.firestore()
        .collection('scorecards')
        .add({
          callId: callId,
          scorerType: 'ai',
          scorerUserId: null,
          ...scoreData,
          submittedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update call with AI score ID
      await change.after.ref.update({
        aiScoreId: scorecardRef.id,
        aiScoreStatus: 'completed'
      });

      // Update transcript processing status
      await admin.firestore()
        .collection('transcripts')
        .doc(newData.transcriptId)
        .update({
          aiProcessingStatus: 'completed',
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      console.log(`AI scoring completed for call ${callId}`);

    } catch (error) {
      console.error('AI scoring error:', error);

      // Update call with error status
      await change.after.ref.update({
        aiScoreStatus: 'error'
      });

      // Update transcript with error
      await admin.firestore()
        .collection('transcripts')
        .doc(newData.transcriptId)
        .update({
          aiProcessingStatus: 'error',
          aiErrorMessage: error.message
        });
    }

    return null;
  });

function buildScoringPrompt(transcriptText) {
  return `
You are an expert Sales Engineering coach. Analyze the following call transcript and score it using the exact 75-point rubric below.

TRANSCRIPT:
${transcriptText}

SCORING RUBRIC (75 points total):

1. INTRODUCTION (5 points)
   - [Specific criteria will be added based on CSV rubric]

2. CONSULTATIVE SELLING (35 points)
   - [Specific criteria will be added based on CSV rubric]

3. KEY WORKFLOWS (30 points)
   - [Specific criteria will be added based on CSV rubric]

4. CLOSE (5 points)
   - [Specific criteria will be added based on CSV rubric]

Return ONLY a JSON object with this exact structure:
{
  "introductionScore": <number 0-5>,
  "introductionComments": "<string>",
  "consultativeScore": <number 0-35>,
  "consultativeComments": "<string>",
  "keyWorkflowsScore": <number 0-30>,
  "keyWorkflowsComments": "<string>",
  "closeScore": <number 0-5>,
  "closeComments": "<string>",
  "totalScore": <number 0-75>,
  "demoRating": <number 0-100>,
  "scoreBreakdown": {
    // Individual item scores here
  }
}
`;
}
```

---

### 5.5 Environment Variables

**Frontend (`.env`):**
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

**Cloud Functions (`.env`):**
```
GEMINI_API_KEY=your_gemini_api_key
```

---

## 6. User Interface Design Principles

### 6.1 Design System (Tailwind)

**Color Palette:**
- Primary: Blue (`bg-blue-600`, `text-blue-600`)
- Success: Green (`bg-green-500`)
- Warning: Yellow (`bg-yellow-500`)
- Error: Red (`bg-red-500`)
- Neutral: Gray (`bg-gray-100`, `text-gray-700`)

**Typography:**
- Headings: `font-bold text-2xl` (h1), `font-semibold text-xl` (h2)
- Body: `text-base text-gray-700`
- Small text: `text-sm text-gray-500`

**Components:**
- Cards: `bg-white rounded-lg shadow p-6`
- Buttons: `px-4 py-2 rounded-md font-medium`
- Inputs: `border border-gray-300 rounded-md px-3 py-2`

### 6.2 Responsive Breakpoints
- Mobile: `< 640px` (sm)
- Tablet: `640px - 1024px` (md, lg)
- Desktop: `> 1024px` (xl)

### 6.3 Accessibility Requirements
- WCAG 2.1 Level AA compliance
- Keyboard navigation for all interactive elements
- ARIA labels for screen readers
- Color contrast ratios 4.5:1 minimum
- Focus indicators on all interactive elements

---

## 7. State Management Strategy

### 7.1 Context Providers

```javascript
// src/contexts/AuthContext.jsx
export const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth methods: login, logout, signup, etc.

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      // ... methods
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 7.2 Custom Hooks

```javascript
// src/hooks/useAuth.js
export const useAuth = () => {
  return useContext(AuthContext);
};

// src/hooks/useFirestore.js
export const useFirestoreQuery = (collection, queryConstraints) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time listener setup
  // ...

  return { data, loading, error };
};

// src/hooks/useCalls.js
export const useCalls = (userId, isManager) => {
  // Fetch calls based on role
};

// src/hooks/useScorecards.js
export const useScorecards = (callId) => {
  // Fetch all scorecards for a call
};
```

---

## 8. Performance Optimization

### 8.1 Frontend Optimization
- **Code Splitting:** Use React.lazy() for route-based code splitting
- **Memoization:** Use React.memo() for expensive components
- **Virtualization:** Use react-window for large lists (call history)
- **Image Optimization:** Lazy load images, use WebP format
- **Bundle Size:** Keep bundle < 200KB (gzipped)

### 8.2 Firestore Optimization
- **Composite Indexes:** Create indexes for common queries
- **Limit Queries:** Use limit() to fetch only needed documents
- **Real-time Listeners:** Use onSnapshot() sparingly, prefer one-time reads where appropriate
- **Pagination:** Implement cursor-based pagination for call history

### 8.3 Cloud Function Optimization
- **Cold Starts:** Keep functions warm with scheduled pings (if needed)
- **Timeout:** Set appropriate timeout (max 60s for AI processing)
- **Memory:** Allocate sufficient memory (512MB-1GB for Gemini API calls)
- **Retry Logic:** Implement exponential backoff for API failures

---

## 9. Error Handling & Monitoring

### 9.1 Error Boundaries
- Wrap major sections in ErrorBoundary components
- Display user-friendly error messages
- Log errors to Firebase Crashlytics or Sentry

### 9.2 Logging Strategy
- **Frontend:** Console.error for development, send to logging service in production
- **Cloud Functions:** Use Firebase Functions logger
- **Key events to log:**
  - Authentication failures
  - API errors (Gemini)
  - Firestore permission denied errors
  - File upload failures

### 9.3 User Feedback
- Toast notifications for success/error messages
- Loading spinners during async operations
- Retry buttons for failed operations

---

## 10. Deployment Strategy

### 10.1 Firebase Hosting Configuration

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions"
  }
}
```

### 10.2 Build Pipeline
1. `npm run build` (Vite builds optimized production bundle)
2. `firebase deploy --only hosting` (deploy frontend)
3. `firebase deploy --only firestore:rules` (deploy security rules)
4. `firebase deploy --only functions` (deploy Cloud Functions)

### 10.3 Environment Setup
- **Development:** Local Firebase Emulators
- **Staging:** Firebase Hosting preview channel
- **Production:** Firebase Hosting main channel

---

## 11. Testing Strategy

### 11.1 Unit Tests
- **Tool:** Vitest + React Testing Library
- **Coverage:** Components, hooks, utility functions
- **Target:** 80% code coverage

### 11.2 Integration Tests
- **Tool:** Cypress or Playwright
- **Coverage:** Complete user workflows (login → create call → score)

### 11.3 Firestore Rules Testing
- **Tool:** Firebase Emulator Suite
- **Coverage:** All security rule scenarios

### 11.4 Manual Testing Checklist
- [ ] Authentication (Google OAuth + Email/Password)
- [ ] SE creates call, uploads transcript, self-scores
- [ ] Manager sees pending review, scores call
- [ ] AI scoring completes successfully
- [ ] Coaching View displays all three scores
- [ ] Dashboard metrics calculate correctly
- [ ] Mobile responsiveness
- [ ] Security rules prevent unauthorized access

---

## 12. MVP Scope & Future Enhancements

### 12.1 MVP Features (In Scope)
✅ Authentication (Google + Email/Password)
✅ Create call + upload transcript
✅ SE self-scoring
✅ Manager scoring
✅ AI auto-scoring (Gemini API)
✅ Coaching View (3-score comparison)
✅ Call history
✅ Basic dashboard
✅ Manual role assignment

### 12.2 Post-MVP Enhancements (Out of Scope)
❌ Prep Tool (deprioritized)
❌ Advanced analytics/reporting
❌ Notifications (email/push)
❌ Comments/discussion threads
❌ Admin panel for user management
❌ Export functionality (CSV/PDF)
❌ Search and advanced filtering
❌ Team hierarchy (multi-level)
❌ Custom rubrics per team

---

## 13. Open Questions & Decisions Needed

### 13.1 Awaiting Clarification
1. **Detailed Rubric:** Need the CSV file with all 75-point scoring criteria to finalize:
   - `scoreBreakdown` field structure
   - Gemini API prompt
   - ScorecardForm component item definitions

2. **Dashboard Metrics:** Clarify time windows:
   - "Recent activity" = last N calls or last N days?
   - "Average score" = all-time, rolling 90 days, or last quarter?

3. **Analytics Scope:** Which specific trends/charts are MVP vs. post-MVP?

4. **Notifications:** Email notifications for pending reviews? (Suggested: post-MVP)

### 13.2 Technical Decisions Made
✅ React (not Vue/Angular)
✅ Tailwind CSS (not Material-UI)
✅ Firebase (not custom backend)
✅ Gemini API (not OpenAI)
✅ Vite (not Create React App)
✅ Context API (not Redux)

---

## 14. Next Steps for Development Team

### Phase 1: Project Setup (Week 1)
1. Initialize React project with Vite
2. Set up Firebase project (Firestore, Auth, Hosting, Functions)
3. Install dependencies (Tailwind, React Router, Firebase SDK)
4. Configure environment variables
5. Set up project structure and folder organization

### Phase 2: Core Infrastructure (Week 2)
1. Implement AuthProvider and authentication flow
2. Create MainLayout, Navbar, Sidebar
3. Set up React Router with protected routes
4. Implement Firestore security rules
5. Set up Cloud Storage rules

### Phase 3: Data Layer (Week 3)
1. Create Firestore collections and indexes
2. Build custom hooks (useAuth, useFirestore, useCalls, useScorecards)
3. Implement file upload to Cloud Storage
4. Test CRUD operations for calls and scorecards

### Phase 4: UI Development (Weeks 4-5)
1. Build authentication pages (login, signup)
2. Build Dashboard (SE and Manager views)
3. Build CreateCallPage and CallMetadataForm
4. Build ScorecardForm (75-point scorecard)
5. Build CallDetailsPage (Coaching View)

### Phase 5: AI Integration (Week 6)
1. Set up Cloud Functions project
2. Implement processTranscriptForAI function
3. Integrate Gemini API with scoring prompt
4. Test AI scoring workflow end-to-end

### Phase 6: Testing & Polish (Week 7)
1. Write unit tests for components and hooks
2. Write integration tests for workflows
3. Test Firestore security rules
4. Mobile responsiveness testing
5. Performance optimization

### Phase 7: Deployment (Week 8)
1. Deploy to Firebase Hosting (staging)
2. User acceptance testing
3. Fix bugs and iterate
4. Deploy to production
5. Monitor and gather feedback

---

**Document End**
