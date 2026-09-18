// fileParser.js
// Small helper module that extracts plain text from an uploaded file.
// Supports .txt files (read directly) and .pdf files (parsed with pdf-parse).

const fs = require("fs");
// pdfjs-dist is Mozilla's own PDF library (used in Firefox). We use it because
// it is more reliable across different real-world PDF files than older
// wrapper libraries, and we pin a version with no known security issues.
//
// IMPORTANT: pdfjs-dist (v4+) only ships as an ES Module, but the rest of
// this backend uses simple CommonJS (require/module.exports). Dynamic
// import() lets CommonJS code load an ES Module, so we use that here.
// We only load it once and reuse it (a simple in-memory cache).
let cachedPdfjsLib = null;
async function getPdfjsLib() {
  if (!cachedPdfjsLib) {
    cachedPdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return cachedPdfjsLib;
}

/**
 * Extract text content from an uploaded file.
 * @param {Object} file - The multer file object (has .path, .mimetype, .originalname)
 * @returns {Promise<string>} - The extracted plain text
 */
async function extractTextFromFile(file) {
  const fileName = file.originalname.toLowerCase();

  // Case 1: Plain text file
  if (fileName.endsWith(".txt") || file.mimetype === "text/plain") {
    const text = fs.readFileSync(file.path, "utf-8");
    return text;
  }

  // Case 2: PDF file
  if (fileName.endsWith(".pdf") || file.mimetype === "application/pdf") {
    return extractTextFromPdf(file.path);
  }

  // Case 3: Unsupported file type
  throw new Error("Unsupported file type. Please upload a .txt or .pdf file.");
}

/**
 * Extract all text from a PDF file, page by page, using pdfjs-dist.
 * @param {string} filePath - Path to the PDF file on disk
 * @returns {Promise<string>} - The combined extracted text
 */
async function extractTextFromPdf(filePath) {
  const pdfjsLib = await getPdfjsLib();
  const fileData = new Uint8Array(fs.readFileSync(filePath));

  const loadingTask = pdfjsLib.getDocument({ data: fileData, verbosity: 0 });
  const pdfDocument = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

module.exports = { extractTextFromFile };
