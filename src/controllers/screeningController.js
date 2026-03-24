const JD        = require('../models/JD');
const Session   = require('../models/Session');
const Candidate = require('../models/Candidate');
const { extractText }          = require('../services/pdfService');
const { screenResume }         = require('../services/geminiService');
const { calculateFinalScore }  = require('../services/scoringService');
const { buildScreeningPrompt } = require('../utils/promptBuilder');
const { validateWeightages }   = require('../middleware/validateRequest');
const { asyncPool }            = require('../utils/asyncPool');

const DEFAULT_WEIGHTAGES = { technicalSkills: 40, experience: 30, education: 20, softSkills: 10 };
const CONCURRENCY = 3; // max parallel Gemini calls

// ── SSE helpers ──────────────────────────────────────────────────────────────
const sseHeaders = {
  'Content-Type':  'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection':    'keep-alive',
  'X-Accel-Buffering': 'no',   // disable nginx buffering
};

const sendEvent = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

// ── Controller ───────────────────────────────────────────────────────────────
const screenCandidates = async (req, res, next) => {
  // Switch to SSE immediately so the client gets live progress
  res.writeHead(200, sseHeaders);

  // Keep-alive ping every 20 s to prevent proxy timeouts
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 20000);
  const finish = () => { clearInterval(keepAlive); res.end(); };

  try {
    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!req.files || req.files.length === 0) {
      sendEvent(res, 'error', { message: 'At least one resume file is required' });
      return finish();
    }

    const { jdId } = req.body;

    let weightages = DEFAULT_WEIGHTAGES;
    if (req.body.weightages) {
      let parsed;
      try {
        parsed = typeof req.body.weightages === 'string'
          ? JSON.parse(req.body.weightages)
          : req.body.weightages;
      } catch {
        sendEvent(res, 'error', { message: 'Invalid weightages JSON' });
        return finish();
      }
      const err = validateWeightages(parsed);
      if (err) { sendEvent(res, 'error', { message: err }); return finish(); }
      weightages = {
        technicalSkills: Number(parsed.technicalSkills),
        experience:      Number(parsed.experience),
        education:       Number(parsed.education),
        softSkills:      Number(parsed.softSkills),
      };
    }

    const jd = await JD.findById(jdId).lean();
    if (!jd) {
      sendEvent(res, 'error', { message: 'JD not found' });
      return finish();
    }

    const session = await Session.create({ jdId: jd._id, jdTitle: jd.title, weightages });

    const total = req.files.length;
    sendEvent(res, 'start', { total, sessionId: session._id });

    // ── Step 1: Extract text — pass full file object so extractor knows the type ──
    const extractionResults = await Promise.allSettled(
      req.files.map(async (file) => {
        const rawText = await extractText(file.buffer, file); // <-- file passed here
        return { fileName: file.originalname, rawText };
      })
    );

    const extracted = [];
    const failedExtraction = [];
    for (const result of extractionResults) {
      if (result.status === 'fulfilled') {
        extracted.push(result.value);
      } else {
        failedExtraction.push(result.reason?.message || 'File extraction failed');
        console.error('File extraction failed:', result.reason?.message);
      }
    }

    if (extracted.length === 0) {
      sendEvent(res, 'error', { message: 'Could not extract text from any of the uploaded files' });
      return finish();
    }

    // ── Step 2: Screen with Gemini — concurrency-limited ────────────────────
    let processed = 0;
    const savedCandidates = [];

    const scoringResults = await asyncPool(
      CONCURRENCY,
      extracted,
      async ({ fileName, rawText }) => {
        const prompt   = buildScreeningPrompt(jd.content, rawText, weightages);
        const aiResult = await screenResume(prompt);
        const final    = calculateFinalScore(aiResult.scores, weightages);

        const info = aiResult.candidate || {};
        const candidate = await Candidate.create({
          sessionId:      session._id,
          fileName,
          candidateName:  info.name  || '',
          candidateEmail: info.email || '',
          candidatePhone: info.phone || '',
          rawText,
          scores:         { ...aiResult.scores, final },
          strengths:      aiResult.strengths,
          gaps:           aiResult.gaps,
          recommendation: aiResult.recommendation,
          topSkills:      aiResult.topSkills,
          explanation:    aiResult.explanation,
        });

        processed++;
        sendEvent(res, 'progress', {
          processed,
          total,
          fileName,
          candidateName:  info.name || '',
          recommendation: aiResult.recommendation,
          finalScore:     final,
        });

        return candidate;
      }
    );

    // Collect successful saves
    for (const result of scoringResults) {
      if (result.status === 'fulfilled') {
        savedCandidates.push(result.value);
      } else {
        console.error('Gemini/save failed for a resume:', result.reason?.message);
      }
    }

    if (savedCandidates.length === 0) {
      sendEvent(res, 'error', { message: 'AI service error — no resumes could be scored. Please try again.' });
      return finish();
    }

    // ── Step 3: Rank & finalise ──────────────────────────────────────────────
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
      candidateName:  c.candidateName,
      candidateEmail: c.candidateEmail,
      candidatePhone: c.candidatePhone,
      scores:         c.scores,
      strengths:      c.strengths,
      gaps:           c.gaps,
      recommendation: c.recommendation,
      topSkills:      c.topSkills,
      explanation:    c.explanation,
    }));

    // ── Step 4: Send final result ────────────────────────────────────────────
    sendEvent(res, 'done', {
      sessionId: session._id,
      results,
      failedCount: total - savedCandidates.length,
    });

  } catch (error) {
    console.error('screenCandidates error:', error);
    sendEvent(res, 'error', { message: error.message || 'Internal server error' });
  } finally {
    finish();
  }
};

module.exports = { screenCandidates };
