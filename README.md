
# AI-Based MCQ Generator from Notes

## 1. Project Title

**AI-Based MCQ Generator from Notes**

## 2. Problem Statement

Students often spend a lot of time manually creating practice questions from their study notes to test their own understanding. This project solves that problem by allowing a student to paste or upload their notes and automatically generate a multiple-choice quiz from that content using AI — at a difficulty level they choose — so they can immediately test themselves and review their results.

## 3. Assigned Feature Set

**Feature Set B** — AI-Based MCQ Generator from Notes, with the following mandatory features:

1. Upload/Paste Notes

2. Generate MCQs

3. Display Answers

4. Question Review

5. Difficulty Selection

## 4. Features Implemented

- ✅ Paste notes into a text area

- ✅ Upload notes as a `.txt` or `.pdf` file, with text automatically extracted and displayed

- ✅ Select difficulty: Easy / Medium / Hard, which changes the style of AI-generated questions

- ✅ Select number of questions (1–20)

- ✅ Generate MCQs using the Google Gemini AI API (free tier), based only on the supplied notes

- ✅ Each question has exactly 4 options with exactly one correct answer

- ✅ Duplicate questions are filtered out

- ✅ Quiz attempt mode: answers are hidden until the user submits

- ✅ Submit quiz → automatic score calculation

- ✅ Full review screen: shows the user's answer, the correct answer, and correct/incorrect status per question

- ✅ Restart button to generate a brand-new quiz

- ✅ Loading indicators for file upload and AI generation

- ✅ Friendly error messages for all failure cases (empty notes, empty file, bad file type, API failure, invalid AI response, invalid input)

- ✅ Frontend and backend validation

- ✅ API key stored only in a backend `.env` file, never exposed to the browser

## 5. Technologies Used

| Layer            | Technology                              |

|-------------------|------------------------------------------|

| Frontend          | HTML5, CSS3, Vanilla JavaScript (no framework) |

| Backend           | Node.js + Express.js                     |

| File Upload       | Multer                                   |

| PDF Text Extraction | pdfjs-dist (Mozilla's PDF.js library) |

| AI Model          | Google Gemini API (`gemini-3.1-flash-lite`) |

| Config/Secrets    | dotenv (`.env` file)                     |

| Cross-Origin Requests | cors                                 |

### Why this stack?

- **Plain Node.js + Express** was chosen over a heavier framework (like Next.js or NestJS) because it is simple to read, simple to explain in a viva/demo, and does not hide what is happening behind "magic" folder conventions.

- **Vanilla JS frontend** (no React/Vue) was chosen so that a 3rd-year student can understand every line without needing to explain a build tool, JSX, or virtual DOM — it's just HTML, CSS, and DOM manipulation.

- **One server for both frontend and backend** (Express serves the static frontend files) removes the need to run two separate dev servers or deal with CORS during local development — simpler to run and demo.

- **pdfjs-dist** is Mozilla's own, actively maintained PDF library (used inside Firefox) — more reliable at extracting text from real-world PDFs than many small wrapper packages. It ships as an ES Module only, so it's loaded from the CommonJS backend using a dynamic `import()` inside `fileParser.js`.

- **A `.npmrc` file** (`omit=optional`) is included in `backend/` so a plain `npm install` never pulls in `pdfjs-dist`'s optional `canvas` dependency, which is only needed for rendering PDF pages as images (not for our text extraction) and has historically pulled in vulnerable transitive packages. An `overrides` entry in `package.json` also pins `qs` (a dependency of Express) to a patched version. Running `npm audit` after `npm install` should report **0 vulnerabilities**.

- **Google Gemini API** was chosen as the AI model because it offers a genuinely free tier (no credit card required to start), a simple single-endpoint REST API (`generateContent`) that is easy to call with `fetch`, and a built-in JSON response mode that reduces parsing errors.

## 6. AI Tools Used

- **Google Gemini API** (model: `gemini-3.1-flash-lite`) — used at runtime by the application itself to generate the MCQs from the user's notes.

- **Claude (Anthropic's assistant)** — used during development to help scaffold the project structure and write/debug the code in this repository.

## 7. Important AI Prompts / AI Usage

The application builds a structured prompt for every quiz generation request. The prompt (see `backend/utils/aiPrompt.js`) instructs the model to:

- Use **only** information present in the supplied notes (no outside knowledge).

- Generate **exactly** the number of questions requested.

- Follow the **selected difficulty** (Easy = basic recall, Medium = understanding + application, Hard = deeper reasoning/connections).

- Create **exactly 4 options** per question with **exactly 1 correct answer**.

- **Avoid duplicate** or near-duplicate questions.

- Return the result as **strict JSON only** (no explanations, no markdown fences), in this shape:

```json

{

"questions": [

{

"question": "string",

"options": ["string", "string", "string", "string"],

"correctAnswerIndex": 0

}

]

}

```

The backend also re-validates this JSON structure after it comes back (correct types, exactly 4 options, valid answer index) and removes any duplicate question text as an extra safety net before sending it to the frontend.

## 8. Project Folder Structure

```

mcq-generator/

├── backend/

│   ├── controllers/

│   │   └── mcqController.js       # Route handler logic (upload + generate quiz)

│   ├── middleware/

│   │   └── validateRequest.js     # Input validation before calling the AI

│   ├── routes/

│   │   └── mcqRoutes.js           # API endpoint definitions + multer config

│   ├── utils/

│   │   ├── aiPrompt.js            # Prompt builder + Gemini API call + JSON parsing

│   │   └── fileParser.js          # .txt / .pdf text extraction

│   ├── uploads/                   # Temporary storage for uploaded files

│   ├── .env.example               # Template for required environment variables

│   ├── package.json

│   └── server.js                  # Express app entry point

├── frontend/

│   ├── css/

│   │   └── style.css

│   ├── js/

│   │   └── app.js                 # All frontend logic (quiz flow, API calls, DOM)

│   └── index.html

├── .gitignore

└── README.md

```

## 9. Installation Steps

**Prerequisites:** Node.js v18 or later installed (v18+ is required for the built-in `fetch` API used to call Gemini).

```bash

# 1. Navigate into the backend folder

cd mcq-generator/backend

# 2. Install dependencies

npm install

```

## 10. Environment Variable Setup

1. Inside the `backend` folder, copy the example file:

```bash

cp .env.example .env

```

2. Open `.env` and fill in your real Gemini API key:

```

GEMINI_API_KEY=your_actual_api_key_here

AI_MODEL=gemini-3.1-flash-lite

PORT=5000

MAX_FILE_SIZE_BYTES=5242880

```

3. Get a **free** API key from https://aistudio.google.com/app/apikey (sign in with a Google account, click "Create API key" — no credit card required for the free tier).

4. **Never commit your `.env` file** — it is already excluded via `.gitignore`.

## 11. Instructions to Run the Project

```bash

cd mcq-generator/backend

npm start

```

You should see:

```

✅ MCQ Generator server running at http://localhost:5000

```

Then open your browser and go to:

```

http://localhost:5000

```

The frontend and backend both run from this single server — no separate frontend server is needed.

## 12. How to Use the Application

1. **Add notes** — paste text into the box, or click "Upload .txt or .pdf file" to extract text from a file.

2. **Choose a difficulty** — Easy, Medium, or Hard.

3. **Choose the number of questions** — between 1 and 20.

4. Click **"Generate MCQs"** and wait for the AI to build your quiz.

5. **Attempt the quiz** — select one option per question. Answers are hidden until you submit.

6. Click **"Submit Quiz"**.

7. View your **score** and then scroll down to **review** each question — see your answer, the correct answer, and whether you got it right.

8. Click **"Generate New Quiz"** to start over with new notes.

## 13. Testing Performed

See the full **Testing Checklist** section below (or `TESTING_CHECKLIST.md`). Summary of what was manually verified during development:

- Pasting notes and generating a quiz

- Uploading a `.txt` file and a `.pdf` file and confirming correct text extraction

- Rejecting empty notes, empty files, and unsupported file types

- Difficulty selection changing the style/complexity of generated questions

- Validating question count boundaries (below 1, above 20, non-integer)

- Full quiz attempt → submit → score → review flow

- Simulated AI API failure (invalid API key) to confirm a friendly error is shown instead of a crash

- Confirmed API key is never sent to or visible in the frontend/browser

## 14. Screenshots

### Notes Input Screen

![Notes Input Screen](readme_screenshots/screenshot-1.png)

### Loading Indicator

![Loading Indicator](readme_screenshots/screenshot-2.png)

### Quiz Attempt Screen

![Quiz Attempt Screen](readme_screenshots/screenshot-3.png)

### Score Screen

![Score Screen](readme_screenshots/screenshot-4.png)

### Question Review Screen

![Question Review Screen](readme_screenshots/screenshot-5.png)

## 15. Future Improvements

- Add user accounts to save quiz history and track progress over time

- Support additional file formats (.docx, .pptx)

- Allow exporting the generated quiz as a PDF for offline practice

- Add a timer/timed-quiz mode

- Allow re-generating a single question the user found unclear

- Add topic tagging so questions can be grouped by sub-topic within long notes
