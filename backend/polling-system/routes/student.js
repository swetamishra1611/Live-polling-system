const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Register student (enter name)
router.post('/register', studentController.register);

// Get active question for poll
router.get('/polls/:pollId/active-question', studentController.getActiveQuestion);

// Submit answer
router.post('/questions/:questionId/answer', studentController.submitAnswer);

// View results after submission
router.get('/questions/:questionId/results', studentController.getResults);

module.exports = router;
