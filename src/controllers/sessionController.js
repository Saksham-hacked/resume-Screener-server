const Session   = require('../models/Session');
const Candidate = require('../models/Candidate');

const getAllSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 }).lean();

    // Fetch recommendation counts for all sessions in one aggregation
    const sessionIds = sessions.map((s) => s._id);

    const counts = await Candidate.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $group: {
          _id: { sessionId: '$sessionId', recommendation: '$recommendation' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build a lookup map: sessionId -> { strongFit, moderateFit, notFit }
    const countMap = {};
    for (const { _id, count } of counts) {
      const sid = _id.sessionId.toString();
      if (!countMap[sid]) countMap[sid] = { strongFit: 0, moderateFit: 0, notFit: 0 };
      if (_id.recommendation === 'Strong Fit')   countMap[sid].strongFit   = count;
      if (_id.recommendation === 'Moderate Fit') countMap[sid].moderateFit = count;
      if (_id.recommendation === 'Not Fit')      countMap[sid].notFit      = count;
    }

    const enriched = sessions.map((s) => ({
      ...s,
      ...(countMap[s._id.toString()] || { strongFit: 0, moderateFit: 0, notFit: 0 }),
    }));

    res.json({ success: true, sessions: enriched });
  } catch (error) {
    next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const candidates = await Candidate.find({ sessionId: session._id }).sort({ rank: 1 }).lean();

    res.json({ success: true, session, candidates });
  } catch (error) {
    next(error);
  }
};

const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    await Candidate.deleteMany({ sessionId: req.params.id });

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllSessions, getSessionById, deleteSession };
