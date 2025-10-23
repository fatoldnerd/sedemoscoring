

# **SE Call Scoring & Coaching Application (v1.0)**

## **1\. Introduction & Vision**

* **Product Name:** SE Call Scoring & Coaching App  
* **Vision:** To transition the current spreadsheet-based process for preparing for and scoring Sales Engineer (SE) calls into a dynamic, centralized, and user-friendly web application. The app will streamline the workflow, ensure consistency by providing a "three-score" (SE Self-Score, AI Score, Manager Score) comparison, and provide actionable data for SEs and their managers to improve demo quality.

## **2\. Problem Statement**

The current spreadsheet system is effective for single-use cases but presents several challenges:

* **Lack of Centralization:** Scores and prep guides are saved in individual files, making it difficult to track performance, identify trends, or share best practices.  
* **Manual Effort:** Calculating scores is a manual process, prone to errors and significant time investment, especially for managers.  
* **Inconsistent Feedback:** Feedback can be subjective. There is no objective baseline (like an AI score) to help calibrate SE self-scores and manager scores.  
* **No Historical View:** An SE or manager cannot easily view performance trends over time without manually opening and comparing multiple files.  
* **Poor User Experience:** Spreadsheets are not optimized for mobile devices and are cumbersome to fill out.

## **3\. Target Users & Personas**

* **Sales Engineer (SE):** The primary user receiving feedback.  
  * **Needs:** To easily submit a call for review, perform a self-assessment, and receive clear, objective, multi-faceted feedback (from self, AI, and manager) in one place to improve their skills.  
* **SE Manager:** The primary user giving feedback.  
  * **Needs:** To efficiently review their team's calls, provide consistent and fair feedback, compare their assessment against an AI's and the SE's, and identify team-wide skill gaps and coaching opportunities through analytics.  
* **Admin (Implicit Role, can be SE Manager):**  
  * **Needs:** To manage user roles (e.g., promoting an SE to a Manager).

## **4\. Core Application Flow (Epic)**

1. **Initiation:** An **SE or a Manager** initiates a "New Call Review" by submitting call details (e.g., customer name, date), a link to the recording, and a call transcript.  
2. **Tri-Score Generation:** The system creates three (3) blank scorecard documents linked to this callReview:  
   * scorecard 1: scorerType: 'SE'  
   * scorecard 2: scorerType: 'Manager'  
   * scorecard 3: scorerType: 'AI'  
3. **Parallel Scoring:**  
   * **AI Score:** The system *immediately* triggers a backend function (e.g., Gemini API call) using the transcript. The AI's JSON response populates the scorerType: 'AI' scorecard.  
   * **SE Self-Score:** The SE is notified and prompted to complete their scorecard (scorerType: 'SE').  
   * **Manager Score:** The Manager is prompted to complete their scorecard (scorerType: 'Manager').  
4. **Coaching View:** Once all three scorecards are submitted (or at least the Manager and AI scores are in), the SE and Manager can access the "Coaching View." This view displays all three scorecards (scores and comments) side-by-side for direct comparison and discussion.  
5. **Analytics:** Data from all completed scorecards feeds into a dashboard where SEs can see their personal trends and Managers can see team-wide trends.

## **5\. Detailed Feature Breakdown (User Stories)**

### **5.1. Authentication & User Roles**

* **Story:** As any user, I want to log in with my company Google account so the system knows who I am.  
* **Acceptance Criteria:**  
  * Uses Firebase Authentication (Google Auth Provider).  
  * On first login, a users document is created with role: 'SE'.  
  * An 'Admin' must manually update a user's role to 'Manager' in Firestore and link their SEs (see Data Model).

### **5.2. Main Dashboard**

* **Story:** As an SE, I want to see a dashboard listing all my past and pending Call Reviews and their status ('Pending Self-Score', 'Pending Manager Review', 'Ready for Coaching').  
* **Story:** As an SE Manager, I want to see a dashboard listing all Call Reviews for my direct reports, filterable by SE and status.  
* **Acceptance Criteria:**  
  * Dashboard shows a list/table of callReviews.  
  * SEs see only *their* callReviews.  
  * Managers see all callReviews where the callReview.seId is in their users.managedSeIds list.  
  * A "New Call Review" button is prominently displayed.

### **5.3. Initiate a New Call Review**

* **Story:** As an SE, I want to fill out a simple form to start a new review for my own call.  
* **Story:** As an SE Manager, I want to fill out a simple form to start a new review for one of my direct reports.  
* **Acceptance Criteria:**  
  * A modal or dedicated page with the following fields:  
    1. **If Manager Initiating:** Select SE (Dropdown list of the manager's managedSeIds).  
    2. Customer Name (Text Input)  
    3. Call Date (Date Picker)  
    4. Link to Call Recording (Text Input, URL)  
    5. Paste Call Transcript (Text Area)  
  * On submit, a new callReviews document is created (with the correct seId and managerId).  
  * The three scorecards documents are generated as described in the Core Flow.

### **5.4. The Scoring Interface (The Scorecard)**

* **Story:** As an SE or Manager, I want to fill out a form that *exactly* matches the structure of the master spreadsheet to score a call.  
* **Acceptance Criteria:**  
  * This interface is the *same* for SEs and Managers. It populates the respective scorecard document.  
  * The form must be divided into the 4 sections.  
  * A running "Demo Score Total" (out of 100\) must be displayed at the top and update in real-time.  
  * The form *must* contain the following fields:

  **1\. Introduction (10 pts)**

  * \[Toggle: 2 pts\] Establish Credibility (0 or 2\)  
  * \[Toggle: 5 pts\] Align on Priorities (0 or 5\)  
  * \[Toggle: 3 pts\] Set Roadmap for the Call (0 or 3\)  
  * \[Text Area\] Introduction Comments

  **2\. Consultative Selling Approach (40 pts)**

  * \[Toggle: 10 pts, P/F\] Walk through Product Functionality in Context of a Story (0 or 10\)  
  * \[Toggle: 10 pts, P/F\] Avoid Feature Tour (0 or 10\)  
  * \[Toggle: 5 pts\] Use of Industry Terminology (0 or 5\)  
  * \[Toggle: 10 pts\] Use of up to date functionality per Features Guide (0 or 10\)  
  * \[Toggle: 5 pts\] Tailor demo content to the priorities of audience (0 or 5\)  
  * \[Text Area\] Consultative Selling Comments

  **3\. Highlight Key Workflows / Features (40 pts)**

  * \[Toggle: 15 pts\] Confirm Value (0 or 15\)  
  * \[Toggle: 15 pts\] Connect the Dots (0 or 15\)  
  * \[Toggle: 10 pts\] Confirmation that Pain Point Resolved if relevant (0 or 10\)  
  * \[Text Area\] Key Workflows Comments

  **4\. Confirm Value / Close (10 pts)**

  * \[Toggle: 2 pts\] Confirm we addressed highest priority topics for this call (0 or 2\)  
  * \[Toggle: 5 pts, P/F\] Confirm buy in on Relevant Value Pillar (0 or 5\)  
  * \[Toggle: 3 pts\] Confirm outstanding deliverables from the demo (0 or 3\)  
  * \[Text Area\] Confirm Value / Close Comments

### **5.5. AI Scoring (Gemini API Integration)**

* **Story:** As an SE or Manager, I want the system to automatically generate an objective AI score based on the transcript so I can compare it with my own assessment.  
* **Acceptance Criteria:**  
  * This process is triggered by a Firebase Function (onCreate of a new callReview).  
  * The function calls the Gemini API (gemini-2.5-flash-preview-09-2025 or similar).  
  * The API call *must* include the full transcript.  
  * The systemInstruction will be:"You are an expert Sales Engineer Manager. Your task is to score a call transcript based on a rigid scoring system. The user will provide a transcript.  
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

  Your JSON response **must** follow this exact schema:{  
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
           "totalScore": 100  
         }  
         \`\`\`"

  * The function will parse this JSON response and use it to update the scorerType: 'AI' scorecard document.

### **5.6. The Coaching View**

* **Story:** As an SE or Manager, I want to see the SE, Manager, and AI scores side-by-side to easily compare them and guide our coaching session.  
* **Acceptance Criteria:**  
  * This is your "tri-column dashboard" for a *single* call.  
  * A read-only view, accessible when the callReview status is 'Ready for Coaching'.  
  * Displays a 3-column layout: "SE Self-Score", "Manager Score", "AI Score".  
  * Each column shows the scores and comments for all 4 sections, item by item, making discrepancies obvious.  
  * Example Row: Establish Credibility | 2 pts (SE) | 0 pts (Manager) | 2 pts (AI)

### **5.7. Analytics & Reporting**

* **Story:** As an SE or Manager, I want to track scoring trends over time to identify specific areas of strength and weakness.  
* **Acceptance Criteria:**  
  * A filterable analytics dashboard.  
  * **Filters:** All charts will be filterable by date range. The Manager view will also be filterable by individual SE or "Team Average".  
  * **Chart 1: Overall Score Trend:** A line chart displaying the totalScore over time (from all 3 scorers).  
  * **Chart 2: Section Score Trends:** A line chart or stacked bar chart displaying the score trends for each of the 4 main sections (Introduction, Consultative, Key Workflows, Close) over time.  
  * **Chart 3: Individual Item Trends:** A dedicated view (e.g., a dropdown menu) allowing the user to select *any* of the 14 individual scoring items (e.g., Align on Priorities, Confirm Value, Walk through... in Context of a Story) and see its specific score plotted on a line chart over time. This directly addresses the need to see if individual metrics are "going up or down."

## **6\. Data Model (Firestore)**

### **users collection**

* docId: (Firebase Auth uid)  
* email: (string) \- "user@company.com"  
* name: (string) \- "Jane Doe"  
* role: (string) \- "SE" or "Manager"  
* managedSeIds: (array of strings) \- \['uid1', 'uid2'\] (Only for Managers)

### **callReviews collection**

* docId: (auto-generated)  
* seId: (string, uid of the SE)  
* managerId: (string, uid of the SE's manager)  
* customerName: (string) \- "Acme Corp"  
* callDate: (timestamp)  
* callLink: (string) \- "https://www.google.com/search?q=https://gong.io/call/123"  
* transcript: (string) \- "The full text transcript..."  
* status: (string) \- "Pending Self-Score", "Pending Manager Review", "Ready for Coaching", "Completed"  
* createdAt: (timestamp)

### **scorecards collection**

* docId: (auto-generated)  
* callReviewId: (string, ref to callReviews doc)  
* seId: (string, ref to users doc)  
* scorerType: (string) \- "SE", "Manager", or "AI"  
* totalScore: (number) \- e.g., 88  
* submittedAt: (timestamp)  
* scores: (map)  
  * introduction: (map) \- { "credibility": 2, "priorities": 5, "roadmap": 0 }  
  * consultative: (map) \- { "story": 10, "featureTour": 10, ... }  
  * workflows: (map) \- { "confirmValue": 15, ... }  
  * close: (map) \- { "priorityTopics": 2, ... }  
* comments: (map)  
  * introduction: (string) \- "Great rapport building..."  
  * consultative: (string) \- "..."  
  * workflows: (string) \- "..."  
  * close: (string) \- "..."

## **7\. Non-Functional Requirements**

* **Technology Stack:**  
  * **Frontend:** React (with Vite or Create React App)  
  * **Styling:** Tailwind CSS  
* **Backend & Database:** Google Firebase (Authentication, Firestore, Firebase Functions)  
* **AI Integration:** Gemini API (via Firebase Functions)  
* **UI/UX Design:**  
  * The application must have a **sleek, modern, sophisticated, and sexy** user interface.  
  * The design should be minimalist, data-focused, and highly polished, conveying professionalism and quality.  
  * It must be fully responsive, providing an excellent experience on both desktop and mobile browsers.  
* **Security (Firestore Rules):**  
  * users: A user can only read/write their own document.  
    * callReviews:  
      * SEs can create.  
      * Managers can create for SEs they manage.  
      * SEs can read/update their own (seId \== auth.uid).  
      * Managers can read/update where managerId \== auth.uid.  
    * scorecards:  
      * SEs can create/update where seId \== auth.uid AND scorerType \== 'SE'.  
      * Managers can create/update where managerId \== auth.Two AND scorerType \== 'Manager'.  
      * AI score (scorerType \== 'AI') can only be written by the trusted backend Firebase Function.  
      * All users can *read* scorecards associated with a callReview they have access to.

## **8\. Success Metrics**

* **Adoption Rate:** % of SE team actively submitting one or more calls per week.  
* **User Satisfaction:** Qualitative feedback that the 3-score comparison is valuable for coaching.  
* **Time Saved:** Reduction in time managers spend manually creating and calculating scores.  
* **Performance Improvement:** Measurable increase in average team scores over a 6-month period, both overall and in specific target items.