const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  fileName: { type: String, required: true },

  // Extracted candidate info
  candidateName:  { type: String, default: '' },
  candidateEmail: { type: String, default: '' },
  candidatePhone: { type: String, default: '' },

  rawText: { type: String },
  scores: {
    technicalSkills: { type: Number },
    experience: { type: Number },
    education: { type: Number },
    softSkills: { type: Number },
    final: { type: Number }
  },
  strengths: [{ type: String }],
  gaps: [{ type: String }],
  recommendation: {
    type: String,
    enum: ['Strong Fit', 'Moderate Fit', 'Not Fit']
  },
  topSkills: [{ type: String }],
  explanation: { type: String },
  rank: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', candidateSchema);
