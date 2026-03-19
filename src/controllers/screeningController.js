const JD        = require('../models/JD');
const Session   = require('../models/Session');
const Candidate = require('../models/Candidate');
const { extractText }       = require('../services/pdfService');
const { screenResume }      = require('../services/geminiService');
const { calculateFinalScore } = require('../services/scoringService');
const { buildScreeningPrompt } = require('../utils/promptBuilder');
const { validateWeightages }   = require('../middleware/validateRequest');

const DEFAULT_WEIGHTAGES = { technicalSkills: 40, experience: 30, education: 20, softSkills: 10 };

const screenCandidates = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ success: false, message: 'At least one resume PDF is required' });

    const { jdId } = req.body;

    // Parse & validate weightages
    let weightages = DEFAULT_WEIGHTAGES;
    if (req.body.weightages) {
      let parsed;
      try {
        parsed = typeof req.body.weightages === 'string' ? JSON.parse(req.body.weightages) : req.body.weightages;
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid weightages JSON' });
      }
      const err = validateWeightages(parsed);
      if (err) return res.status(400).json({ success: false, message: err });
      weightages = {
        technicalSkills: Number(parsed.technicalSkills),
        experience:      Number(parsed.experience),
        education:       Number(parsed.education),
        softSkills:      Number(parsed.softSkills),
      };
    }

    // Validate JD
    const jd = await JD.findById(jdId).lean();
    if (!jd) return res.status(404).json({ success: false, message: 'JD not found' });

    // Create session upfront
    const session = await Session.create({ jdId: jd._id, jdTitle: jd.title, weightages });

    // ── Step 1: Extract text from all PDFs in parallel ──────────────────────
    const extractionResults = await Promise.allSettled(
      req.files.map(async (file) => {
        const rawText = await extractText(file.buffer);
        return { fileName: file.originalname, rawText };
      })
    );

    // Separate successes from failures
    const extracted = [];
    for (const result of extractionResults) {
      if (result.status === 'fulfilled') {
        extracted.push(result.value);
      } else {
        console.error('PDF extraction failed:', result.reason.message);
        // Skip unreadable PDFs rather than aborting the whole batch
      }
    }

    if (extracted.length === 0) {
      const error = new Error('Could not extract text from any of the uploaded PDFs');
      error.status = 422;
      return next(error);
    }

    // ── Step 2: Call Gemini for all resumes in parallel ──────────────────────
    const scoringResults = await Promise.allSettled(
      extracted.map(async ({ fileName, rawText }) => {
        const prompt   = buildScreeningPrompt(jd.content, rawText, weightages);
        const aiResult = await screenResume(prompt);
        const final    = calculateFinalScore(aiResult.scores, weightages);
        return { fileName, rawText, aiResult, final };
      })
    );

    // ── Step 3: Persist all successful results in parallel ───────────────────
    const savePromises = [];
    for (const result of scoringResults) {
      if (result.status === 'fulfilled') {
        const { fileName, rawText, aiResult, final } = result.value;
        savePromises.push(
          Candidate.create({
            sessionId:      session._id,
            fileName,
            rawText,
            scores:         { ...aiResult.scores, final },
            strengths:      aiResult.strengths,
            gaps:           aiResult.gaps,
            recommendation: aiResult.recommendation,
            topSkills:      aiResult.topSkills,
            explanation:    aiResult.explanation,
          })
        );
      } else {
        console.error('Gemini scoring failed for a resume:', result.reason.message);
      }
    }

    const savedCandidates = await Promise.all(savePromises);

    if (savedCandidates.length === 0) {
      const error = new Error('AI service error, please try again');
      error.status = 502;
      return next(error);
    }

    // ── Step 4: Assign ranks & update session ────────────────────────────────
    savedCandidates.sort((a, b) => b.scores.final - a.scores.final);

    const ranked = await Promise.all(
      savedCandidates.map((c, i) =>
        Candidate.findByIdAndUpdate(c._id, { rank: i + 1 }, { new: true }).lean()
      )
    );

    await Session.findByIdAndUpdate(session._id, { totalCandidates: ranked.length });

    const results = ranked.map((c) => ({
      rank:           c.rank,
      fileName:       c.fileName,
      scores:         c.scores,
      strengths:      c.strengths,
      gaps:           c.gaps,
      recommendation: c.recommendation,
      topSkills:      c.topSkills,
      explanation:    c.explanation,
    }));

    res.status(201).json({ success: true, sessionId: session._id, results });
  } catch (error) {
    next(error);
  }
};

module.exports = { screenCandidates };
