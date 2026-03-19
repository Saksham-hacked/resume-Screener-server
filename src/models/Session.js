const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  jdId: { type: mongoose.Schema.Types.ObjectId, ref: 'JD', required: true },
  jdTitle: { type: String, required: true },
  weightages: {
    technicalSkills: { type: Number, default: 40 },
    experience: { type: Number, default: 30 },
    education: { type: Number, default: 20 },
    softSkills: { type: Number, default: 10 }
  },
  totalCandidates: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
