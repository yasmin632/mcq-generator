// server.js
// Entry point for the backend server.
// Sets up Express, middleware, and mounts the MCQ API routes.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mcqRoutes = require("./routes/mcqRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allow the frontend (served separately) to call this API
app.use(express.json({ limit: "2mb" })); // Parse JSON request bodies (notes can be long)

// --- Serve the frontend static files ---
// This lets the whole app run from ONE server (simpler for a student project).
app.use(express.static(path.join(__dirname, "..", "frontend")));

// --- API routes ---
app.use("/api", mcqRoutes);

// --- Health check endpoint (useful for quick testing) ---
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "MCQ Generator backend is running." });
});

// --- Fallback error handler for anything unexpected ---
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ success: false, error: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`✅ MCQ Generator server running at http://localhost:${PORT}`);
});
