const mongoose = require('mongoose');

const jdSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JD', jdSchema);
