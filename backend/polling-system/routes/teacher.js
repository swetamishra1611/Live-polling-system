const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

// Register teacher
router.post('/register', teacherController.register);

// Create a new poll
router.post('/polls', teacherController.createPoll);

// Ask a new question
router.post('/polls/:pollId/questions', teacherController.askQuestion);


// List all polls, optionally filter by createdBy
router.get('/polls', teacherController.listPolls);

// View live polling results
router.get('/polls/:pollId/results', teacherController.getResults);

module.exports = router;
