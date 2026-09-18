// mcqController.js
// Contains the actual logic run for each API route:
// 1. uploadNotes    - extracts text from an uploaded .txt/.pdf file
// 2. generateQuiz   - sends notes to the AI model and returns structured MCQs

const fs = require("fs");
const { extractTextFromFile } = require("../utils/fileParser");
const { buildPrompt, callAIModel, parseAIResponse } = require("../utils/aiPrompt");

/**
 * POST /api/upload
 * Handles a file upload, extracts its text, and returns the text to the frontend.
 */
async function uploadNotes(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file was uploaded. Please choose a .txt or .pdf file.",
      });
    }

    const extractedText = await extractTextFromFile(req.file);

    // Clean up the temporary uploaded file now that we've read it
    fs.unlink(req.file.path, () => {});

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "The uploaded file appears to be empty. Please upload a file that contains text.",
      });
    }

    return res.status(200).json({
      success: true,
      text: extractedText.trim(),
    });
  } catch (error) {
    console.error("Error in uploadNotes:", error.message);

    // Clean up file if it still exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process the uploaded file.",
    });
  }
}

/**
 * POST /api/generate-quiz
 * Sends the notes + settings to the AI model and returns a validated
 * list of MCQ questions.
 */
async function generateQuiz(req, res) {
  try {
    const { notes, difficulty, numQuestions } = req.body;

    // Build the instruction prompt for the AI model
    const prompt = buildPrompt(notes, difficulty, numQuestions);

    // Call the AI model
    let rawResponse;
    try {
      rawResponse = await callAIModel(prompt);
    } catch (apiError) {
      console.error("AI API error:", apiError.message);
      return res.status(502).json({
        success: false,
        error: "The AI service failed to respond. Please try again in a moment.",
      });
    }

    // Parse the AI's JSON response
    let parsed;
    try {
      parsed = parseAIResponse(rawResponse);
    } catch (parseError) {
      console.error("AI parse error:", parseError.message);
      return res.status(502).json({
        success: false,
        error: "The AI returned data in an unexpected format. Please try generating again.",
      });
    }

    // Validate the structure of the parsed data
    const validationError = validateQuizStructure(parsed, numQuestions);
    if (validationError) {
      console.error("AI structure validation error:", validationError);
      return res.status(502).json({
        success: false,
        error: "The AI response did not match the expected quiz format. Please try again.",
      });
    }

    // Remove any exact duplicate questions as an extra safety net
    const uniqueQuestions = removeDuplicateQuestions(parsed.questions);

    return res.status(200).json({
      success: true,
      questions: uniqueQuestions,
    });
  } catch (error) {
    console.error("Unexpected error in generateQuiz:", error.message);
    return res.status(500).json({
      success: false,
      error: "Something went wrong while generating the quiz. Please try again.",
    });
  }
}

/**
 * Validate that the AI's parsed JSON matches the shape we expect.
 * Returns an error message string if invalid, or null if valid.
 */
function validateQuizStructure(parsed) {
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return "Missing or empty 'questions' array.";
  }

  for (const q of parsed.questions) {
    if (typeof q.question !== "string" || q.question.trim().length === 0) {
      return "A question is missing its text.";
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return "A question does not have exactly 4 options.";
    }
    if (
      typeof q.correctAnswerIndex !== "number" ||
      q.correctAnswerIndex < 0 ||
      q.correctAnswerIndex > 3
    ) {
      return "A question has an invalid correctAnswerIndex.";
    }
  }

  return null;
}

/**
 * Remove questions with identical question text (case-insensitive).
 */
function removeDuplicateQuestions(questions) {
  const seen = new Set();
  const result = [];

  for (const q of questions) {
    const key = q.question.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(q);
    }
  }

  return result;
}

module.exports = { uploadNotes, generateQuiz };
