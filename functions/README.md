# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the SE Call Scoring & Coaching App.

## Functions

### `generateAIScore`

Automatically generates an AI score when a new call review is created.

- **Trigger:** `onCreate` for `callReviews` collection
- **Purpose:** Analyzes call transcript using Gemini AI and populates the AI scorecard
- **API:** Uses Google Generative AI (Gemini 2.0 Flash)

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment Variables

Set the Gemini API key in Firebase Functions config:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

To get your Gemini API key:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and use it in the command above

### 3. Deploy Functions

From the project root directory:

```bash
firebase deploy --only functions
```

Or deploy a specific function:

```bash
firebase deploy --only functions:generateAIScore
```

## Local Development

### Run Functions Emulator

```bash
npm run serve
```

This will start the Firebase Functions emulator on `http://localhost:5001`.

### View Logs

View real-time logs:

```bash
firebase functions:log
```

Or in the Firebase Console: Functions > Logs

## Testing

When a new call review is created in Firestore, the function will:
1. Automatically trigger
2. Extract the transcript
3. Send it to Gemini AI for analysis
4. Parse the JSON response
5. Update the AI scorecard
6. Update the call review status

Check the Firebase Console logs to verify the function executed successfully.
