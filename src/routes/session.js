const express = require('express');
const router = express.Router();
const { getAllSessions, getSessionById, deleteSession } = require('../controllers/sessionController');

router.get('/', getAllSessions);
router.get('/:id', getSessionById);
router.delete('/:id', deleteSession);

module.exports = router;
