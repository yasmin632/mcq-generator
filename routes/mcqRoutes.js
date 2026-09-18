// mcqRoutes.js
// Defines the API endpoints and connects them to controller functions.
// Also configures multer for safe file uploads (type + size validation).

const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadNotes, generateQuiz } = require("../controllers/mcqController");
const { validateGenerateRequest } = require("../middleware/validateRequest");

const router = express.Router();

// Allowed file extensions/mime types for uploaded notes
const ALLOWED_EXTENSIONS = [".txt", ".pdf"];
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES) || 5 * 1024 * 1024; // 5 MB default

// Configure multer: where to store files temporarily, and how to validate them
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    // Prefix with timestamp to avoid filename collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error("Only .txt and .pdf files are allowed."));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Wrap multer upload so its errors return clean JSON instead of crashing
function handleUpload(req, res, next) {
  const singleUpload = upload.single("notesFile");
  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "File is too large. Maximum allowed size is 5MB.",
        });
      }
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}

// POST /api/upload - upload a .txt or .pdf file and extract its text
router.post("/upload", handleUpload, uploadNotes);

// POST /api/generate-quiz - generate MCQs from notes using the AI model
router.post("/generate-quiz", validateGenerateRequest, generateQuiz);

module.exports = router;
