const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define the Gemini API key as a secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Retry configuration for Gemini API calls
const MAX_RETRIES = 3; // Try up to 3 additional times (4 total attempts)
const RETRY_DELAY_MS = 60000; // 1 minute between retries

/**
 * Helper function to call Gemini API with automatic retry on 503 errors
 * @param {Object} model - Gemini model instance
 * @param {string} transcript - Call transcript to analyze
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise} Gemini API response
 */
async function callGeminiWithRetry(model, transcript, maxRetries) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Calling Gemini API (attempt ${attempt + 1}/${maxRetries + 1})...`);
      const result = await model.generateContent(transcript);
      console.log(`Gemini API call successful on attempt ${attempt + 1}`);
      return result;
    } catch (error) {
      lastError = error;

      // Check if it's a 503 Service Unavailable (overload) error
      if (error.status === 503 && attempt < maxRetries) {
        console.log(`Gemini API overloaded (503). Waiting 60 seconds before retry ${attempt + 2}/${maxRetries + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue; // Retry
      }

      // If it's not a 503 or we're out of retries, throw the error
      console.error(`Gemini API call failed on attempt ${attempt + 1}:`, error.message);
      throw error;
    }
  }

  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Cloud Function that triggers when a new callReview is created.
 * Automatically generates an AI score using Gemini API.
 */
exports.generateAIScore = onDocumentCreated(
    {
      document: "callReviews/{callReviewId}",
      secrets: [geminiApiKey],
    },
    async (event) => {
      try {
        const callReviewId = event.params.callReviewId;
        const callReviewData = event.data.data();

        console.log(`Processing AI score for callReview: ${callReviewId}`);

        // Validate required data
        if (!callReviewData.transcript) {
          console.error("No transcript found in callReview");
          return;
        }

        // Get Gemini API key from secret
        const apiKey = geminiApiKey.value();
        if (!apiKey) {
          console.error("GEMINI_API_KEY not configured");
          return;
        }

        // Initialize Gemini AI
        const genAI = new GoogleGenerativeAI(apiKey);

        // System instruction from PRD
        const systemInstruction = `You are an expert Sales Engineer Manager. Your task is to score a call transcript based on a rigid scoring system. The user will provide a transcript.
Analyze the transcript and provide a score for each item. You must only respond with a single, valid JSON object. Do not include markdown or any other text.
The scoring criteria are:
1. **Introduction (10 pts total)**:
   * credibility: 0 or 2 pts
   * priorities: 0 or 5 pts
   * roadmap: 0 or 3 pts
2. **Consultative Selling (40 pts total)**:
   * story: 0 or 10 pts (Pass/Fail)
   * featureTour: 0 or 10 pts (Pass/Fail for *avoiding* a feature tour)
   * terminology: 0 or 5 pts
   * functionality: 0 or 10 pts (Used up-to-date functionality)
   * tailoring: 0 or 5 pts (Tailored to audience)
3. **Key Workflows (40 pts total)**: Analyze how well the SE demonstrated the *relevant product workflows* during the call, based on these three general criteria:
   * confirmValue: 0 or 15 pts
   * connectDots: 0 or 15 pts
   * painResolved: 0 or 10 pts
4. **Close (10 pts total)**:
   * priorityTopics: 0 or 2 pts
   * valuePillar: 0 or 5 pts (Pass/Fail)
   * deliverables: 0 or 3 pts

For each section, you must also provide a supporting quote from the transcript that best illustrates your assessment. The quote should be the exact text from the transcript.

Your JSON response **must** follow this exact schema:
{
  "scores": {
    "introduction": { "credibility": 2, "priorities": 5, "roadmap": 3 },
    "consultative": { "story": 10, "featureTour": 10, "terminology": 5, "functionality": 10, "tailoring": 5 },
    "workflows": { "confirmValue": 15, "connectDots": 15, "painResolved": 10 },
    "close": { "priorityTopics": 2, "valuePillar": 5, "deliverables": 3 }
  },
  "comments": {
    "introduction": "Brief comment on the intro.",
    "consultative": "Brief comment on the consultative approach.",
    "workflows": "Brief comment on how they handled the key product workflows.",
    "close": "Brief comment on the close."
  },
  "quotes": {
    "introduction": "Exact quote from the transcript that supports your introduction assessment.",
    "consultative": "Exact quote from the transcript that supports your consultative selling assessment.",
    "workflows": "Exact quote from the transcript that supports your workflows assessment.",
    "close": "Exact quote from the transcript that supports your close assessment."
  },
  "totalScore": 100
}`;

        // Get the model
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          systemInstruction: systemInstruction,
        });

        // Generate AI score with automatic retry on 503 errors
        console.log("Calling Gemini API with retry logic...");
        const result = await callGeminiWithRetry(model, callReviewData.transcript, MAX_RETRIES);
        const response = result.response;
        const responseText = response.text();

        console.log("Gemini response received:", responseText);

        // Parse JSON response
        let aiScoreData;
        try {
          // Clean markdown code blocks if present
          let cleanedResponse = responseText.trim();
          if (cleanedResponse.startsWith("```")) {
            cleanedResponse = cleanedResponse.replace(/^```json\n?/, "").replace(/\n?```$/, "");
          }
          aiScoreData = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error("Failed to parse Gemini response as JSON:", parseError);
          console.error("Raw response:", responseText);
          return;
        }

        // Validate the response structure
        if (!aiScoreData.scores || !aiScoreData.comments || !aiScoreData.quotes || typeof aiScoreData.totalScore !== "number") {
          console.error("Invalid AI response structure:", aiScoreData);
          return;
        }

        // Find the AI scorecard for this call review
        const scorecardsRef = db.collection("scorecards");
        const aiScorecardQuery = await scorecardsRef
            .where("callReviewId", "==", callReviewId)
            .where("scorerType", "==", "AI")
            .limit(1)
            .get();

        if (aiScorecardQuery.empty) {
          console.error("AI scorecard not found for callReview:", callReviewId);
          return;
        }

        const aiScorecardDoc = aiScorecardQuery.docs[0];

        // Update the AI scorecard
        await aiScorecardDoc.ref.update({
          scores: aiScoreData.scores,
          comments: aiScoreData.comments,
          quotes: aiScoreData.quotes,
          totalScore: aiScoreData.totalScore,
          submittedAt: new Date(),
        });

        console.log("AI scorecard updated successfully for callReview:", callReviewId);

        // Recalculate call review status
        const allScorecards = await scorecardsRef
            .where("callReviewId", "==", callReviewId)
            .get();

        const scorecards = allScorecards.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const seScorecard = scorecards.find((sc) => sc.scorerType === "SE");
        const managerScorecard = scorecards.find((sc) => sc.scorerType === "Manager");
        const aiScorecard = scorecards.find((sc) => sc.scorerType === "AI");

        let newStatus = "Pending Self-Score";

        if (seScorecard?.submittedAt && managerScorecard?.submittedAt && aiScorecard?.submittedAt) {
          newStatus = "Ready for Coaching";
        } else if (seScorecard?.submittedAt) {
          newStatus = "Pending Manager Review";
        }

        // Update call review status
        await db.collection("callReviews").doc(callReviewId).update({
          status: newStatus,
        });

        console.log("Call review status updated to:", newStatus);
      } catch (error) {
        console.error("Error in generateAIScore function:", error);
        console.error("Error details:", error.message, error.stack);
      }
    }
);
