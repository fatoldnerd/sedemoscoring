# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SE Call Scoring & Coaching Application - A modern web app for Sales Engineers to score, review, and improve demo calls through AI-powered analysis and manager coaching.

**Key Concept**: Tri-Score System - Every call review gets three independent scores (SE Self-Score, Manager Score, AI Score) displayed side-by-side for coaching sessions.

## Technology Stack

- **Frontend**: React 18 + Vite + React Router v7 + Tailwind CSS v4
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Hosting)
- **AI**: Google Gemini 2.0 Flash (via Cloud Functions)
- **Testing**: Vitest + Testing Library + Puppeteer

## Development Commands

### Daily Development
```bash
npm run dev                 # Start dev server (Vite)
npm run build              # Production build
npm run preview            # Preview production build locally
```

### Testing
```bash
npm test                   # Run tests in watch mode
npm run test:ui            # Run tests with UI
npm run test:run           # Run tests once (CI mode)
npm run test:coverage      # Generate coverage report
```

### Firebase Deployment
```bash
firebase deploy                      # Deploy everything
firebase deploy --only hosting       # Deploy frontend only
firebase deploy --only functions     # Deploy Cloud Functions only
firebase deploy --only firestore:rules  # Deploy security rules only

# For Cloud Functions secrets
firebase functions:secrets:set GEMINI_API_KEY
```

### Firebase Functions Development
```bash
cd functions
npm install                 # Install function dependencies
npm run lint               # Lint functions code
```

## Architecture

### System Design
**Pattern**: Serverless Single-Page Application (SPA)
- React SPA with client-side routing
- Firebase Backend-as-a-Service (authentication, database, storage)
- Cloud Functions for AI processing (Gemini API integration)
- All data in Firestore NoSQL database

### Data Model

**Collections:**
1. **`users`** - User profiles and roles
   - `email`, `name`, `role` ("SE" | "Manager")
   - `managerId` (for SEs) / `managedSeIds[]` (for Managers)

2. **`callReviews`** - Demo call records
   - `seId`, `managerId`, `customerName`, `callDate`, `callLink`, `transcript`
   - `status`: "Pending Self-Score" → "Pending Manager Review" → "Ready for Coaching"
   - References to three scorecards (SE, Manager, AI)

3. **`scorecards`** - Individual scoring submissions
   - `callReviewId`, `seId`, `scorerType` ("SE" | "Manager" | "AI")
   - `scores` (nested object), `comments`, `quotes`, `totalScore`
   - `submittedAt` timestamp

**Relationships:**
```
User (SE) → callReviews[] → [SE Scorecard, Manager Scorecard, AI Scorecard]
   ↓ managerId
User (Manager)
```

### Scoring System

**100-Point Universal Scorecard:**
1. **Introduction** (10 pts): credibility (2), priorities (5), roadmap (3)
2. **Consultative Selling** (40 pts): story (10), featureTour (10), terminology (5), functionality (10), tailoring (5)
3. **Key Workflows** (40 pts): confirmValue (15), connectDots (15), painResolved (10)
4. **Close** (10 pts): priorityTopics (2), valuePillar (5), deliverables (3)

Each scorecard includes:
- Section-level scores and comments
- Supporting quotes from transcript
- Total score (0-100)

### Call Review Workflow

**1. SE Creates Call Review** ([NewCallReviewPage.jsx](src/pages/NewCallReviewPage.jsx))
   - Upload metadata (customer, date, link, transcript)
   - Creates call review + 3 blank scorecards (SE, Manager, AI)
   - Cloud Function automatically triggers AI scoring

**2. AI Scoring** ([functions/index.js](functions/index.js))
   - `generateAIScore` function triggers on callReview creation
   - Analyzes transcript with Gemini 2.0 Flash
   - Includes retry logic for 503 errors (up to 3 retries, 60s delays)
   - Updates AI scorecard with scores, comments, quotes

**3. SE Self-Scoring** ([ScoringPage.jsx](src/pages/ScoringPage.jsx))
   - SE fills out scorecard for their own call
   - Status → "Pending Manager Review"

**4. Manager Scoring** (Manager uses same [ScoringPage.jsx](src/pages/ScoringPage.jsx))
   - Manager reviews transcript and fills scorecard
   - Status → "Ready for Coaching"

**5. Coaching View** ([CoachingViewPage.jsx](src/pages/CoachingViewPage.jsx))
   - Tri-column layout showing all three scores side-by-side
   - Color-coded score comparison
   - Comments and quotes displayed together

## Security & Permissions

### Firestore Security Rules ([firestore.rules](firestore.rules))

**Access Control:**
- **SEs**: Can only read/write their own data
- **Managers**: Can read/write all data for SEs they manage (via `managedSeIds[]`)
- **AI Scorecards**: Can ONLY be written by Cloud Functions (admin privileges)

**Key Rules:**
- Users can create their own profile on first login
- TEMPORARY: Users can update their own role (for manager setup - TODO: remove after brad.towers@simprogroup.com and bradptowers@gmail.com are set as managers)
- SEs can create call reviews with null or valid managerId
- SEs create all 3 blank scorecards initially (totalScore=0, submittedAt=null)
- Only Cloud Functions can update AI scorecards

## File Structure

### Frontend
```
src/
├── components/         # Reusable UI components
│   ├── LoadingSpinner.jsx
│   ├── ErrorMessage.jsx
│   ├── ProtectedRoute.jsx
│   └── Navbar.jsx
├── pages/             # Route pages
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── ManagerDashboardPage.jsx
│   ├── AdminSetupPage.jsx
│   ├── NewCallReviewPage.jsx
│   ├── ScoringPage.jsx
│   ├── CoachingViewPage.jsx
│   ├── CallReviewDetailsPage.jsx
│   └── AnalyticsPage.jsx
├── services/          # Firebase service utilities
│   ├── authService.js
│   ├── userService.js
│   ├── callReviewService.js
│   └── scorecardService.js
├── contexts/          # React contexts
│   ├── AuthContext.jsx
│   └── DarkModeContext.jsx
├── config/
│   └── firebase.js    # Firebase initialization
└── main.jsx           # App entry point
```

### Backend
```
functions/
├── index.js           # Cloud Functions (generateAIScore)
└── package.json       # Functions dependencies
```

## Key Patterns & Conventions

### Service Layer Pattern
All Firebase operations are abstracted into service files ([src/services/](src/services/)):
- `authService.js` - Authentication (Google OAuth)
- `userService.js` - User CRUD operations
- `callReviewService.js` - Call review CRUD, status updates
- `scorecardService.js` - Scorecard CRUD, score calculations

### Context Providers
- `AuthContext` - Global authentication state (current user, user profile, role)
- `DarkModeContext` - Theme management

### Component Conventions
- Use functional components with hooks
- Keep components focused and reusable
- Use Tailwind CSS for styling (no custom CSS files)
- Follow Airbnb style guide

### Error Handling
- Cloud Functions include retry logic for Gemini API 503 errors
- Frontend uses `ErrorMessage` component for user-facing errors
- All async operations include try/catch blocks

## Testing Strategy

- **Unit Tests**: Components, hooks, utility functions (Vitest + Testing Library)
- **Coverage Target**: 80%
- **Integration Tests**: Puppeteer for end-to-end workflows
- **Firestore Rules Testing**: Use Firebase Emulator Suite (not yet implemented)

Test files co-located with source files (e.g., `App.test.jsx` next to `App.jsx`).

## Firebase Configuration

### Environment Variables
Frontend requires these in `.env`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Cloud Functions Secrets
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

## Important Implementation Notes

### Gemini AI Prompt
The scoring prompt in [functions/index.js](functions/index.js) is the source of truth for:
- Scoring criteria definitions
- Point allocations per item
- Expected JSON response schema

If scoring criteria change, update:
1. `systemInstruction` in [functions/index.js](functions/index.js)
2. Scorecard display components
3. Database schema documentation

### Status Flow Logic
Call review status is automatically calculated based on scorecard submissions:
```javascript
if (seScorecard?.submittedAt && managerScorecard?.submittedAt && aiScorecard?.submittedAt) {
  status = "Ready for Coaching";
} else if (seScorecard?.submittedAt) {
  status = "Pending Manager Review";
} else {
  status = "Pending Self-Score";
}
```

### Role Assignment
Currently manual process:
1. User logs in (creates profile automatically)
2. User or admin updates `role` to "Manager" in Firestore Console
3. Manager assigns SEs via [AdminSetupPage.jsx](src/pages/AdminSetupPage.jsx)

## ByteRover MCP Integration

This project uses ByteRover MCP for knowledge management. When working in this codebase:

**MUST use `byterover-store-knowledge` when:**
- Learning new patterns, APIs, or architectural decisions
- Encountering error solutions or debugging techniques
- Finding reusable code patterns
- Completing significant tasks

**MUST use `byterover-retrieve-knowledge` when:**
- Starting any new task or implementation
- Making architectural decisions
- Debugging issues (check for previous solutions)
- Working with unfamiliar parts of the codebase

## Common Development Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in [src/App.jsx](src/App.jsx)
3. Wrap in `<ProtectedRoute>` if authentication required
4. Add navigation link to [src/components/Navbar.jsx](src/components/Navbar.jsx)

### Modifying Scoring Criteria
1. Update `systemInstruction` in [functions/index.js](functions/index.js)
2. Redeploy Cloud Functions: `firebase deploy --only functions`
3. Update scorecard display components to match new schema
4. Update this documentation

### Debugging Cloud Functions
```bash
firebase functions:log          # View function logs
firebase emulators:start       # Run local emulators for testing
```

### Viewing Firestore Data
- Use Firebase Console: https://console.firebase.google.com
- Or use emulators for local development

## Deployment Notes

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy:**
```bash
npm run build && firebase deploy
```

**Deploy to Preview Channel (staging):**
```bash
firebase hosting:channel:deploy preview
```

## Known Issues & TODOs

1. **TEMPORARY Security Rule**: Users can update their own role ([firestore.rules:42](firestore.rules#L42))
   - Remove after brad.towers@simprogroup.com and bradptowers@gmail.com are set as managers

2. **Firestore Rules Testing**: No automated tests for security rules yet
   - TODO: Add Firebase Emulator Suite tests

3. **Role Assignment**: Manual process via Firestore Console
   - Future: Build admin panel for user/role management

## References

- [README.md](README.md) - Overview and getting started
- [docs/architecture.md](docs/architecture.md) - Detailed technical architecture
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment instructions
- Firebase Console: https://console.firebase.google.com
- Gemini API Docs: https://ai.google.dev/docs
