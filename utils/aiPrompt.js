// aiPrompt.js
// Builds the prompt sent to the AI model and handles the Gemini API call
// that turns study notes into structured MCQ data.

const DIFFICULTY_INSTRUCTIONS = {
  easy:
    "Easy: Test basic recall and understanding of definitions, facts, and simple concepts directly stated in the notes.",

  medium:
    "Medium: Test understanding and application. Questions may combine two related facts from the notes or ask the user to apply a concept described in the notes.",

  hard:
    "Hard: Test deeper reasoning. Questions should require connecting multiple ideas from the notes, comparing concepts, or reasoning about cause/effect, based ONLY on what is written in the notes.",
};

/**
 * Build the full prompt sent to the AI model.
 *
 * @param {string} notes
 * @param {string} difficulty
 * @param {number} numQuestions
 * @returns {string}
 */
function buildPrompt(notes, difficulty, numQuestions) {
  const difficultyInstruction =
    DIFFICULTY_INSTRUCTIONS[difficulty] ||
    DIFFICULTY_INSTRUCTIONS.medium;

  return `You are an assistant that creates multiple-choice questions (MCQs) for a student quiz app.

STRICT RULES:
1. Generate questions ONLY using information that is explicitly present in the NOTES below. Do not add outside facts.
2. Generate exactly ${numQuestions} questions.
3. Difficulty level: ${difficulty.toUpperCase()}. ${difficultyInstruction}
4. Each question must have exactly 4 answer options.
5. Exactly ONE option must be correct.
6. Do not create duplicate or near-duplicate questions.
7. Do not reference "the notes" or "the text" inside the question wording.
8. Write every question as a standalone question.
9. Return ONLY valid JSON.
10. Do not include markdown, explanations, or code fences.

JSON FORMAT:
{
  "questions": [
    {
      "question": "question text here",
      "options": [
        "option A",
        "option B",
        "option C",
        "option D"
      ],
      "correctAnswerIndex": 0
    }
  ]
}

IMPORTANT:
- correctAnswerIndex must be 0, 1, 2, or 3.
- The correct answer must correspond exactly to the option at that index.
- There must be exactly 4 options for every question.

NOTES:
"""
${notes}
"""

Return the JSON now.`;
}

/**
 * Call the Google Gemini API.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callAIModel(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || "gemini-3.1-flash-lite";

  // Check API key
  if (!apiKey) {
    throw new Error(
      "Server is missing the GEMINI_API_KEY environment variable."
    );
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent`;

  console.log("========================================");
  console.log("Calling Gemini API");
  console.log("Model:", model);
  console.log("URL:", url);
  console.log("API key loaded:", !!apiKey);
  console.log("========================================");

  let response;

  // --------------------------------------------------
  // Gemini API request
  // --------------------------------------------------
  try {
    response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],

        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (err) {
    console.error("========================================");
    console.error("GEMINI FETCH FAILED");
    console.error("========================================");

    console.error("Error message:", err.message);
    console.error("Error name:", err.name);
    console.error("Error cause:", err.cause);

    if (err.cause) {
      console.error("Cause message:", err.cause.message);
      console.error("Cause code:", err.cause.code);
      console.error("Cause errno:", err.cause.errno);
      console.error("Cause syscall:", err.cause.syscall);
      console.error("Cause hostname:", err.cause.hostname);
    }

    console.error("Gemini URL:", url);

    console.error("========================================");

    throw new Error(
      `Could not connect to Gemini API: ${err.message}`
    );
  }

  // --------------------------------------------------
  // Handle Gemini HTTP errors
  // --------------------------------------------------
  if (!response.ok) {
    const errorBody = await response.text();

    console.error("========================================");
    console.error("GEMINI API HTTP ERROR");
    console.error("Status:", response.status);
    console.error("Response:", errorBody);
    console.error("========================================");

    throw new Error(
      `AI API request failed (status ${response.status}): ${errorBody}`
    );
  }

  // --------------------------------------------------
  // Parse Gemini response
  // --------------------------------------------------
  let data;

  try {
    data = await response.json();
  } catch (err) {
    throw new Error(
      `Gemini returned an invalid JSON response: ${err.message}`
    );
  }

  console.log("Gemini API response received successfully.");

  // --------------------------------------------------
  // Extract generated text
  // --------------------------------------------------
  const candidate =
    data &&
    data.candidates &&
    data.candidates[0];

  if (!candidate) {
    console.error("Gemini response did not contain candidates.");
    console.error(JSON.stringify(data, null, 2));

    throw new Error(
      "AI API returned no candidates."
    );
  }

  const content = candidate.content;

  if (!content) {
    console.error("Gemini candidate did not contain content.");
    console.error(JSON.stringify(candidate, null, 2));

    throw new Error(
      "AI API returned a candidate without content."
    );
  }

  const parts = content.parts;

  if (!parts || !Array.isArray(parts) || parts.length === 0) {
    console.error("Gemini content did not contain parts.");
    console.error(JSON.stringify(content, null, 2));

    throw new Error(
      "AI API returned no content parts."
    );
  }

  const textPart = parts.find(
    (part) => typeof part.text === "string"
  );

  if (!textPart || !textPart.text) {
    console.error("Gemini response did not contain text.");
    console.error(JSON.stringify(data, null, 2));

    throw new Error(
      "AI API returned no text content."
    );
  }

  return textPart.text;
}

/**
 * Parse the raw AI response into JSON.
 *
 * @param {string} rawText
 * @returns {Object}
 */
function parseAIResponse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error(
      "AI returned an empty response."
    );
  }

  let cleaned = rawText.trim();

  // Remove markdown code fences if Gemini accidentally adds them.
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("========================================");
    console.error("AI JSON PARSE ERROR");
    console.error("Raw AI response:");
    console.error(rawText);
    console.error("========================================");

    throw new Error(
      "AI returned data that could not be parsed as JSON."
    );
  }

  // --------------------------------------------------
  // Validate basic structure
  // --------------------------------------------------
  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "AI returned an invalid response structure."
    );
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error(
      'AI response is missing the "questions" array.'
    );
  }

  // --------------------------------------------------
  // Validate every question
  // --------------------------------------------------
  parsed.questions.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(
        `Question ${index + 1} is invalid.`
      );
    }

    if (
      typeof item.question !== "string" ||
      !item.question.trim()
    ) {
      throw new Error(
        `Question ${index + 1} has invalid question text.`
      );
    }

    if (
      !Array.isArray(item.options) ||
      item.options.length !== 4
    ) {
      throw new Error(
        `Question ${index + 1} must have exactly 4 options.`
      );
    }

    item.options.forEach((option, optionIndex) => {
      if (
        typeof option !== "string" ||
        !option.trim()
      ) {
        throw new Error(
          `Question ${index + 1}, option ${optionIndex + 1} is invalid.`
        );
      }
    });

    if (
      !Number.isInteger(item.correctAnswerIndex) ||
      item.correctAnswerIndex < 0 ||
      item.correctAnswerIndex > 3
    ) {
      throw new Error(
        `Question ${index + 1} has an invalid correctAnswerIndex.`
      );
    }
  });

  return parsed;
}

module.exports = {
  buildPrompt,
  callAIModel,
  parseAIResponse,
};
