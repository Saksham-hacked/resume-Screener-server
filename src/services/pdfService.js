const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');

// ── Helpers ──────────────────────────────────────────────────────────────────
const cleanText = (raw) =>
  raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const isDocx = (file) => {
  const mimeDocx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const mimeDocxAlt = 'application/msword';
  if (file.mimetype === mimeDocx || file.mimetype === mimeDocxAlt) return true;
  if (file.originalname && file.originalname.toLowerCase().endsWith('.docx')) return true;
  return false;
};

// ── PDF extractor ────────────────────────────────────────────────────────────
const extractFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or unreadable');
    }
    return cleanText(data.text);
  } catch (error) {
    throw new Error(`Could not extract text from PDF: ${error.message}`);
  }
};

// ── DOCX extractor ───────────────────────────────────────────────────────────
const extractFromDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || '';
    if (text.trim().length === 0) {
      throw new Error('DOCX appears to be empty or unreadable');
    }
    return cleanText(text);
  } catch (error) {
    throw new Error(`Could not extract text from DOCX: ${error.message}`);
  }
};

// ── Public: unified extractor ─────────────────────────────────────────────
/**
 * extractText(buffer, file)
 *
 * @param {Buffer} buffer       File buffer from multer
 * @param {object} [file]       Multer file object (for mimetype / originalname)
 * @returns {Promise<string>}   Cleaned plain text
 */
const extractText = async (buffer, file = {}) => {
  if (isDocx(file)) {
    return extractFromDOCX(buffer);
  }
  // Default: treat as PDF (backwards-compatible with old callers that pass only buffer)
  return extractFromPDF(buffer);
};

module.exports = { extractText };
