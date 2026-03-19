const { GoogleGenAI, Type } = require('@google/genai');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
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
  required: ['scores', 'strengths', 'gaps', 'recommendation', 'topSkills', 'explanation'],
};

const screenResume = async (prompt) => {
  const attempt = async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0,        // deterministic — no random generosity
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    return JSON.parse(response.text);
  };

  try {
    return await attempt();
  } catch (error) {
    console.error('Gemini attempt 1 failed:', error.message);
    await sleep(2000);
    try {
      return await attempt();
    } catch (retryError) {
      console.error('Gemini attempt 2 failed:', retryError.message);
      throw new Error('AI service error, please try again');
    }
  }
};

module.exports = { screenResume };
