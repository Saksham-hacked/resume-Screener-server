const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const validateJDText = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),
  handleValidationErrors
];

const validateScreening = [
  body('jdId')
    .notEmpty()
    .withMessage('jdId is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('jdId must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  handleValidationErrors
];

// No sum constraint — weightages are normalized at scoring time
const validateWeightages = (weightages) => {
  if (!weightages) return null;
  const { technicalSkills, experience, education, softSkills } = weightages;
  const keys = [technicalSkills, experience, education, softSkills];
  if (keys.some((k) => k === undefined || k === null)) {
    return 'Weightages must include technicalSkills, experience, education, and softSkills';
  }
  if (keys.some((k) => Number(k) < 0 || Number(k) > 100)) {
    return 'Each weightage must be between 0 and 100';
  }
  if (keys.every((k) => Number(k) === 0)) {
    return 'At least one weightage must be greater than 0';
  }
  return null;
};

module.exports = { validateJDText, validateScreening, validateWeightages };
