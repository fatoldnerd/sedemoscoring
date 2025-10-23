# SE Call Scoring & Coaching App - Deployment Guide

This guide will walk you through deploying the complete SE Call Scoring & Coaching application.

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Google account for Firebase
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "se-call-scoring")
4. Follow the setup wizard

### 1.2 Enable Services

In your Firebase project:

1. **Authentication:**
   - Go to Authentication > Sign-in method
   - Enable "Google" provider
   - Add authorized domains if needed

2. **Firestore Database:**
   - Go to Firestore Database
   - Create database in production mode
   - Choose a location (e.g., us-central1)

3. **Cloud Functions:**
   - Go to Functions
   - Upgrade to Blaze (pay-as-you-go) plan if needed
   - Functions require this to make external API calls

### 1.3 Get Firebase Config

1. Go to Project Settings > Your apps
2. Click "Add app" > Web
3. Register your app (e.g., "SE Call Scoring Web")
4. Copy the Firebase configuration

## Step 2: Local Configuration

### 2.1 Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 2.2 Install Dependencies

Install root project dependencies:

```bash
npm install
```

Install Functions dependencies:

```bash
cd functions
npm install
cd ..
```

## Step 3: Deploy Firebase Functions

### 3.1 Login to Firebase

```bash
firebase login
```

### 3.2 Initialize Firebase (if not done)

```bash
firebase init
```

Select:
- Functions: Yes
- Firestore: Yes
- Hosting: Yes

When prompted:
- Use an existing project (select your project)
- Use JavaScript for Functions
- Use ESLint: Yes (optional)
- Install dependencies: Yes
- Keep existing files

### 3.3 Set Gemini API Key

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

### 3.4 Deploy Functions

```bash
firebase deploy --only functions
```

This will deploy the `generateAIScore` Cloud Function.

## Step 4: Deploy Firestore Rules and Indexes

Deploy security rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Step 5: Create Initial Users

### 5.1 Sign Up as First User

1. Build and run the app locally:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173
3. Click "Sign in with Google"
4. You'll be created as an SE by default

### 5.2 Promote to Manager (Optional)

To promote yourself or another user to Manager:

1. Go to Firebase Console > Firestore Database
2. Find the `users` collection
3. Find your user document (by UID)
4. Edit the document:
   - Change `role` to "Manager"
   - Add `managedSeIds` array with SE UIDs you want to manage

Example:
```json
{
  "email": "manager@company.com",
  "name": "Jane Manager",
  "role": "Manager",
  "managedSeIds": ["se_uid_1", "se_uid_2"],
  "managerId": null,
  "createdAt": "..."
}
```

### 5.3 Link SEs to Manager

For each SE you want to link to a manager:

1. Find their user document in Firestore
2. Edit the document:
   - Set `managerId` to the manager's UID

## Step 6: Build and Deploy Frontend

### 6.1 Build for Production

```bash
npm run build
```

### 6.2 Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your app will be available at: `https://your-project-id.web.app`

## Step 7: Test the Application

### 7.1 Test as SE

1. Log in as an SE
2. Create a new call review
3. Complete SE self-score
4. Verify AI score is generated automatically
5. View dashboard and analytics

### 7.2 Test as Manager

1. Log in as a Manager
2. View team dashboard
3. Create call review for an SE
4. Complete manager score
5. View coaching view with tri-column comparison
6. View team analytics

## Maintenance & Updates

### Update Functions

```bash
cd functions
# Make your changes
cd ..
firebase deploy --only functions
```

### Update Security Rules

```bash
# Edit firestore.rules
firebase deploy --only firestore:rules
```

### Update Frontend

```bash
npm run build
firebase deploy --only hosting
```

## Troubleshooting

### AI Scores Not Generating

1. Check Cloud Function logs:
   ```bash
   firebase functions:log
   ```

2. Verify Gemini API key is set:
   ```bash
   firebase functions:config:get
   ```

3. Ensure Firestore has proper permissions for the Function

### Security Rule Errors

1. Check Firestore Rules tab in Firebase Console
2. Use the Rules Playground to test specific operations
3. Verify user documents have correct `role` and `managedSeIds`

### Build Errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Vite cache:
   ```bash
   rm -rf .vite
   ```

## Environment-Specific Configs

### Development

```bash
npm run dev
```

Uses `.env` file for configuration.

### Production

Use Firebase environment configuration:

```bash
firebase functions:config:set someconfig.value="production_value"
```

## Cost Estimates

Based on typical usage:

- **Firestore:** ~$0.06 per 100K reads, $0.18 per 100K writes
- **Functions:** ~$0.40 per million invocations
- **Gemini API:** Check [Google AI Pricing](https://ai.google.dev/pricing)
- **Hosting:** 10GB free, then $0.15/GB

For a team of 10 SEs with 2 calls/week:
- Estimated monthly cost: $5-15

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review Firestore security rules
3. Check function execution logs
4. Verify environment configuration

## Next Steps

After deployment:
1. Set up monitoring and alerts in Firebase Console
2. Configure custom domains in Hosting settings
3. Set up backup strategy for Firestore data
4. Create documentation for your team
5. Gather feedback and iterate
