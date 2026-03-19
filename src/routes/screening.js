const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { validateScreening } = require('../middleware/validateRequest');
const { screenCandidates } = require('../controllers/screeningController');

router.post('/screen', upload.array('resumes', 10), validateScreening, screenCandidates);

module.exports = router;
