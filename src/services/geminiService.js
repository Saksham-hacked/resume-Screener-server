const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES   = 4;
const BASE_DELAY_MS = 1500;   // first retry after 1.5 s
const MAX_DELAY_MS  = 20000;  // cap at 20 s

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidate: {
      type: Type.OBJECT,
      properties: {
        name:  { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
      },
      required: ['name', 'email', 'phone'],
    },
    scores: {
      type: Type.OBJECT,
      properties: {
        technicalSkills: { type: Type.INTEGER },
        experience:      { type: Type.INTEGER },
        education:       { type: Type.INTEGER },
        softSkills:      { type: Type.INTEGER },
      },
      required: ['technicalSkills', 'experience', 'education', 'softSkills'],
    },
    strengths:      { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 3, maxItems: 3 },
    gaps:           { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 3, maxItems: 3 },
    recommendation: { type: Type.STRING, enum: ['Strong Fit', 'Moderate Fit', 'Not Fit'] },
    topSkills:      { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 1, maxItems: 5 },
    explanation:    { type: Type.STRING },
  },
  required: ['candidate', 'scores', 'strengths', 'gaps', 'recommendation', 'topSkills', 'explanation'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRateLimitError = (err) => {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.code || 0;
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests')
  );
};

const isRetryableError = (err) => {
  const status = err?.status || err?.code || 0;
  return isRateLimitError(err) || status === 500 || status === 503;
};

// ── Core call ────────────────────────────────────────────────────────────────
const callGemini = async (prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  return JSON.parse(response.text);
};

// ── Public: screenResume with exponential backoff ────────────────────────────
const screenResume = async (prompt) => {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      lastError = err;

      const willRetry = attempt < MAX_RETRIES && isRetryableError(err);

      if (!willRetry) {
        console.error(`Gemini failed after ${attempt + 1} attempt(s):`, err.message);
        throw new Error(`AI service error: ${err.message}`);
      }

      // Exponential backoff with jitter: base * 2^attempt ± 10 %
      const base  = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
      const jitter = base * 0.1 * (Math.random() * 2 - 1); // ±10 %
      const delay = Math.round(base + jitter);

      const reason = isRateLimitError(err) ? 'rate limit' : 'server error';
      console.warn(
        `Gemini ${reason} on attempt ${attempt + 1}/${MAX_RETRIES + 1} — retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw new Error(`AI service error: ${lastError?.message}`);
};

module.exports = { screenResume };
