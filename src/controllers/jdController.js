const JD = require('../models/JD');
const { extractText } = require('../services/pdfService');

const createJDFromText = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const jd = await JD.create({ title, content });
    res.status(201).json({ success: true, jd });
  } catch (error) {
    next(error);
  }
};

const createJDFromPDF = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }
    const title = req.body.title || req.file.originalname.replace('.pdf', '');
    let content;
    try {
      content = await extractText(req.file.buffer);
    } catch (err) {
      const error = new Error(`Could not extract text from PDF: ${req.file.originalname}`);
      error.status = 422;
      return next(error);
    }
    const jd = await JD.create({ title, content });
    res.status(201).json({ success: true, jd });
  } catch (error) {
    next(error);
  }
};

const getAllJDs = async (req, res, next) => {
  try {
    const jds = await JD.find().sort({ uploadedAt: -1 }).lean();
    res.json({ success: true, jds });
  } catch (error) {
    next(error);
  }
};

const getJDById = async (req, res, next) => {
  try {
    const jd = await JD.findById(req.params.id).lean();
    if (!jd) return res.status(404).json({ success: false, message: 'JD not found' });
    res.json({ success: true, jd });
  } catch (error) {
    next(error);
  }
};

const deleteJD = async (req, res, next) => {
  try {
    const jd = await JD.findByIdAndDelete(req.params.id);
    if (!jd) return res.status(404).json({ success: false, message: 'JD not found' });
    res.json({ success: true, message: 'JD deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createJDFromText, createJDFromPDF, getAllJDs, getJDById, deleteJD };
