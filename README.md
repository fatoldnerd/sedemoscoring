# SE Call Scoring & Coaching Application

A modern web application for Sales Engineers to score, review, and improve their demo calls through AI-powered analysis and manager coaching.

## Overview

This application digitizes and enhances the SE call review process by providing:
- **Automated AI Scoring** using Google's Gemini AI
- **Tri-Score System** (SE Self-Score, Manager Score, AI Score)
- **Side-by-Side Comparison** for effective coaching sessions
- **Analytics Dashboard** with trend tracking and insights
- **Role-Based Access** for SEs and Managers

## Key Features

### 📝 Call Review Management
- Create new call reviews with recording links and transcripts
- Track status through workflow: Pending Self-Score → Pending Manager Review → Ready for Coaching
- View all call reviews with filterable dashboard

### 🎯 Universal Scorecard
- 4-section scoring framework (100 points total):
  - **Introduction** (10 pts) - Credibility, Priorities, Roadmap
  - **Consultative Selling** (40 pts) - Story context, Industry terminology, Tailoring
  - **Key Workflows** (40 pts) - Confirm value, Connect dots, Pain resolution
  - **Close** (10 pts) - Priority topics, Value pillars, Deliverables
- Real-time score calculation
- Comment fields for each section

### 🤖 AI-Powered Scoring
- Automatic AI analysis using Gemini 2.0 Flash
- Instant scoring when call review is created
- Objective baseline for calibration

### 👥 Coaching View
- Tri-column layout showing all three scores side-by-side
- Color-coded score comparison
- Comments from SE, Manager, and AI displayed together
- Easy identification of scoring discrepancies

### 📊 Analytics Dashboard
- **Chart 1:** Overall score trends over time (all scorers)
- **Chart 2:** Section-level performance breakdown
- **Chart 3:** Individual metric tracking (14 criteria)
- Filterable by date range and SE (for managers)
- Summary statistics and averages

### 🔐 Security & Permissions
- Google Authentication
- Role-based access control (SE vs Manager)
- Comprehensive Firestore security rules
- Manager-SE relationship management

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router v7** - Client-side routing
- **Tailwind CSS v4** - Utility-first styling
- **Firebase SDK** - Authentication and Firestore

### Backend
- **Firebase Authentication** - Google sign-in
- **Cloud Firestore** - NoSQL database
- **Cloud Functions** - Serverless backend
- **Gemini AI** - AI-powered call analysis

### Development
- **Vitest** - Unit testing
- **Testing Library** - Component testing
- **ESLint** - Code linting

## Project Structure

```
sedemoscoring/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React contexts (Auth)
│   ├── pages/               # Page components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── NewCallReviewPage.jsx
│   │   ├── ScoringPage.jsx
│   │   ├── CoachingViewPage.jsx
│   │   └── AnalyticsPage.jsx
│   ├── services/            # Firebase service utilities
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── callReviewService.js
│   │   └── scorecardService.js
│   ├── hooks/               # Custom React hooks
│   ├── config/              # Firebase configuration
│   └── main.jsx             # App entry point
├── functions/               # Firebase Cloud Functions
│   ├── index.js            # AI scoring function
│   └── package.json
├── docs/                    # Documentation
│   └── PRD.md              # Product Requirements Document
├── firebase.json            # Firebase configuration
├── firestore.rules         # Security rules
├── firestore.indexes.json  # Database indexes
└── DEPLOYMENT.md           # Deployment guide
```

## Data Model

### Collections

**users**
- `email` - User email
- `name` - Display name
- `role` - "SE" or "Manager"
- `managerId` - Manager's UID (for SEs)
- `managedSeIds` - Array of SE UIDs (for Managers)

**callReviews**
- `seId` - SE's UID
- `managerId` - Manager's UID
- `customerName` - Customer name
- `callDate` - Timestamp
- `callLink` - Recording URL
- `transcript` - Call transcript
- `status` - Workflow status
- `createdAt` - Timestamp

**scorecards**
- `callReviewId` - Reference to call review
- `seId` - SE's UID
- `scorerType` - "SE", "Manager", or "AI"
- `totalScore` - Score out of 100
- `scores` - Nested score object (4 sections)
- `comments` - Section comments
- `submittedAt` - Timestamp

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase account
- Gemini API key

### Quick Start

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd sedemoscoring
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase config
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Deploy (see DEPLOYMENT.md for full guide):**
   ```bash
   firebase deploy
   ```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report

### Code Style

- Use functional components with hooks
- Follow Airbnb style guide
- Use Tailwind CSS for styling
- Keep components focused and reusable

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

Quick deploy:
```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

## Firebase Functions

The `generateAIScore` function:
- Triggers on new callReview creation
- Analyzes transcript using Gemini AI
- Populates AI scorecard automatically
- Updates call review status

See [functions/README.md](./functions/README.md) for more details.

## Security

- Google Authentication required
- Role-based access control
- Firestore security rules enforce permissions
- AI scorecards can only be written by Cloud Functions
- SEs can only access their own data
- Managers can only access their team's data

## Success Metrics

Track these KPIs:
- **Adoption Rate:** % of team submitting 1+ calls/week
- **User Satisfaction:** Qualitative feedback on tri-score value
- **Time Saved:** Reduction in manual scoring time
- **Performance Improvement:** Average score trends over 6 months

## Roadmap

Potential future enhancements:
- [ ] Email notifications for pending reviews
- [ ] Bulk export to CSV/PDF
- [ ] Custom scoring templates
- [ ] Video timestamp annotations
- [ ] Mobile app version
- [ ] Integration with Gong/Chorus
- [ ] Team leaderboards

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Support

For issues or questions:
1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Review Firebase Console logs
3. Check Firestore security rules
4. Create an issue in the repository

## License

[Add your license here]

## Acknowledgments

Built with:
- React + Vite + Tailwind CSS
- Firebase (Auth, Firestore, Functions, Hosting)
- Google Gemini AI
- Anthropic Claude Code

---

**Ready to improve your SE demo calls? Deploy and start scoring!** 🚀
