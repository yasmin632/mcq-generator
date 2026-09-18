// app.js
// Client-side logic for the AI MCQ Generator.
// Handles: notes input, file upload, calling the backend API,
// running the quiz, scoring, and reviewing answers.

// ---- DOM elements ----
const notesTextarea = document.getElementById("notesTextarea");
const fileInput = document.getElementById("fileInput");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const uploadLoading = document.getElementById("uploadLoading");

const numQuestionsInput = document.getElementById("numQuestionsInput");
const generateBtn = document.getElementById("generateBtn");
const generateLoading = document.getElementById("generateLoading");

const setupScreen = document.getElementById("setupScreen");
const quizScreen = document.getElementById("quizScreen");
const resultsScreen = document.getElementById("resultsScreen");

const quizProgress = document.getElementById("quizProgress");
const questionsContainer = document.getElementById("questionsContainer");
const submitQuizBtn = document.getElementById("submitQuizBtn");

const scoreText = document.getElementById("scoreText");
const reviewContainer = document.getElementById("reviewContainer");
const restartBtn = document.getElementById("restartBtn");

const errorBanner = document.getElementById("errorBanner");

// ---- App state ----
let currentQuestions = []; // Array of { question, options, correctAnswerIndex }
let userAnswers = []; // Array of selected option index (or null) per question

// ---- Helper: show an error message to the user ----
function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearError() {
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}

// ---- Helper: switch which screen is visible ----
function showScreen(screenToShow) {
  [setupScreen, quizScreen, resultsScreen].forEach((screen) => {
    screen.classList.add("hidden");
  });
  screenToShow.classList.remove("hidden");
}

// =========================================================
// FEATURE 1: Upload / Paste Notes
// =========================================================

fileInput.addEventListener("change", async () => {
  clearError();
  const file = fileInput.files[0];
  if (!file) return;

  // Basic frontend validation: file type
  const allowedExtensions = [".txt", ".pdf"];
  const fileName = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));
  if (!isAllowed) {
    showError("Only .txt and .pdf files are supported.");
    fileInput.value = "";
    return;
  }

  // Basic frontend validation: file size (5MB max)
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    showError("File is too large. Maximum allowed size is 5MB.");
    fileInput.value = "";
    return;
  }

  if (file.size === 0) {
    showError("The selected file is empty.");
    fileInput.value = "";
    return;
  }

  fileNameDisplay.textContent = file.name;
  uploadLoading.classList.remove("hidden");

  try {
    const formData = new FormData();
    formData.append("notesFile", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to extract text from the file.");
    }

    // Display the extracted text in the textarea so the user can see/edit it
    notesTextarea.value = data.text;
  } catch (err) {
    showError(err.message);
  } finally {
    uploadLoading.classList.add("hidden");
  }
});

// =========================================================
// FEATURE 2 + 5: Generate MCQs (with difficulty)
// =========================================================

generateBtn.addEventListener("click", async () => {
  clearError();

  const notes = notesTextarea.value.trim();
  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  const numQuestions = Number(numQuestionsInput.value);

  // ---- Frontend validation ----
  if (!notes) {
    showError("Please paste your notes or upload a file before generating a quiz.");
    return;
  }
  if (notes.length < 50) {
    showError("Your notes are too short. Please add more content to generate good questions.");
    return;
  }
  if (!Number.isInteger(numQuestions) || numQuestions < 1 || numQuestions > 20) {
    showError("Please enter a valid number of questions between 1 and 20.");
    return;
  }

  generateBtn.disabled = true;
  generateLoading.classList.remove("hidden");

  try {
    const response = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, difficulty, numQuestions }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to generate the quiz. Please try again.");
    }

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("The AI did not return any questions. Please try again.");
    }

    currentQuestions = data.questions;
    userAnswers = new Array(currentQuestions.length).fill(null);

    renderQuiz();
    showScreen(quizScreen);
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
    generateLoading.classList.add("hidden");
  }
});

// =========================================================
// FEATURE 3: Quiz Attempt (answers hidden until submission)
// =========================================================

function renderQuiz() {
  quizProgress.textContent = `${currentQuestions.length} question(s) — answer all before submitting.`;
  questionsContainer.innerHTML = "";

  currentQuestions.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "question-card";

    const questionTitle = document.createElement("h3");
    questionTitle.textContent = `${index + 1}. ${q.question}`;
    card.appendChild(questionTitle);

    q.options.forEach((optionText, optionIndex) => {
      const label = document.createElement("label");
      label.className = "option-label";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `question-${index}`;
      radio.value = optionIndex;
      radio.addEventListener("change", () => {
        userAnswers[index] = optionIndex;
      });

      label.appendChild(radio);
      label.appendChild(document.createTextNode(optionText));
      card.appendChild(label);
    });

    questionsContainer.appendChild(card);
  });
}

// =========================================================
// FEATURE 3 + 4: Submit Quiz -> Show Score + Review
// =========================================================

submitQuizBtn.addEventListener("click", () => {
  clearError();

  const unanswered = userAnswers.filter((a) => a === null).length;
  if (unanswered > 0) {
    const confirmSubmit = confirm(
      `You have ${unanswered} unanswered question(s). Submit anyway?`
    );
    if (!confirmSubmit) return;
  }

  const score = calculateScore();
  renderResults(score);
  showScreen(resultsScreen);
});

function calculateScore() {
  let correctCount = 0;
  currentQuestions.forEach((q, index) => {
    if (userAnswers[index] === q.correctAnswerIndex) {
      correctCount++;
    }
  });
  return correctCount;
}

function renderResults(score) {
  scoreText.textContent = `${score} / ${currentQuestions.length}`;

  reviewContainer.innerHTML = "";

  currentQuestions.forEach((q, index) => {
    const userAnswerIndex = userAnswers[index];
    const isCorrect = userAnswerIndex === q.correctAnswerIndex;

    const card = document.createElement("div");
    card.className = `review-card ${isCorrect ? "correct" : "incorrect"}`;

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${q.question}`;
    card.appendChild(title);

    const userAnswerText =
      userAnswerIndex === null ? "(No answer selected)" : q.options[userAnswerIndex];
    const correctAnswerText = q.options[q.correctAnswerIndex];

    const userLine = document.createElement("p");
    userLine.className = "review-answer-line";
    userLine.innerHTML = `Your answer: <strong>${escapeHtml(userAnswerText)}</strong>`;
    card.appendChild(userLine);

    const correctLine = document.createElement("p");
    correctLine.className = "review-answer-line";
    correctLine.innerHTML = `Correct answer: <strong>${escapeHtml(correctAnswerText)}</strong>`;
    card.appendChild(correctLine);

    const resultTag = document.createElement("p");
    resultTag.className = isCorrect ? "tag-correct" : "tag-incorrect";
    resultTag.textContent = isCorrect ? "✔ Correct" : "✘ Incorrect";
    card.appendChild(resultTag);

    reviewContainer.appendChild(card);
  });
}

// Basic HTML escaping to prevent injecting markup via AI-generated text
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// =========================================================
// Restart: Generate a New Quiz
// =========================================================

restartBtn.addEventListener("click", () => {
  clearError();
  currentQuestions = [];
  userAnswers = [];
  notesTextarea.value = "";
  fileInput.value = "";
  fileNameDisplay.textContent = "";
  numQuestionsInput.value = 5;
  document.querySelector('input[name="difficulty"][value="easy"]').checked = true;
  showScreen(setupScreen);
});
