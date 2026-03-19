const pdfParse = require('pdf-parse');

const extractText = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or unreadable');
    }
    const cleaned = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    return cleaned;
  } catch (error) {
    throw new Error(`Could not extract text from PDF: ${error.message}`);
  }
};

module.exports = { extractText };
