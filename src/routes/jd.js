const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { validateJDText } = require('../middleware/validateRequest');
const {
  createJDFromText,
  createJDFromPDF,
  getAllJDs,
  getJDById,
  deleteJD
} = require('../controllers/jdController');

router.post('/text', validateJDText, createJDFromText);
router.post('/upload', upload.single('file'), createJDFromPDF);
router.get('/', getAllJDs);
router.get('/:id', getJDById);
router.delete('/:id', deleteJD);

module.exports = router;
