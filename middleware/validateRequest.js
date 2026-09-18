// validateRequest.js
// Express middleware that validates the request body before we spend
// time (and API cost) calling the AI model.

const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"];
const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 20;

function validateGenerateRequest(req, res, next) {
  const { notes, difficulty, numQuestions } = req.body;

  // 1. Notes must exist and not be empty/whitespace only
  if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Notes cannot be empty. Please paste some notes or upload a file first.",
    });
  }

  // 2. Notes should have a reasonable minimum length to generate meaningful questions
  if (notes.trim().length < 50) {
    return res.status(400).json({
      success: false,
      error: "Notes are too short to generate meaningful questions. Please provide more content.",
    });
  }

  // 3. Difficulty must be one of the allowed values
  if (!difficulty || !ALLOWED_DIFFICULTIES.includes(difficulty.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: "Invalid difficulty. Please choose Easy, Medium, or Hard.",
    });
  }

  // 4. Number of questions must be a valid integer within range
  const parsedNum = Number(numQuestions);
  if (!Number.isInteger(parsedNum) || parsedNum < MIN_QUESTIONS || parsedNum > MAX_QUESTIONS) {
    return res.status(400).json({
      success: false,
      error: `Number of questions must be a whole number between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`,
    });
  }

  // All checks passed — normalize values and continue
  req.body.difficulty = difficulty.toLowerCase();
  req.body.numQuestions = parsedNum;
  next();
}

module.exports = { validateGenerateRequest };
