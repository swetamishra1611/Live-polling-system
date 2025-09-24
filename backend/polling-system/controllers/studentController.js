const Student = require('../models/Student');
const Question = require('../models/Question');
const Answer = require('../models/Answer');

// Register student (unique per tab)
exports.register = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    // Each tab is unique, so always create new
    const student = new Student({ name });
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get active question for poll
exports.getActiveQuestion = async (req, res) => {
  try {
    const { pollId } = req.params;
    const question = await Question.findOne({ poll: pollId, isActive: true });
    if (!question) return res.status(404).json({ error: 'No active question' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Submit answer (only if within 60s)
exports.submitAnswer = async (req, res) => {
  try {
    const { studentId, answer } = req.body;
    const { questionId } = req.params;
    const question = await Question.findById(questionId);
    if (!question || !question.isActive) return res.status(400).json({ error: 'Question not active' });
    if (new Date() > question.expiresAt) {
      question.isActive = false;
      await question.save();
      return res.status(400).json({ error: 'Time expired' });
    }
    // Only one answer per student per question
    const existing = await Answer.findOne({ student: studentId, question: questionId });
    if (existing) return res.status(400).json({ error: 'Already answered' });
    const ans = new Answer({ student: studentId, question: questionId, answer });
    await ans.save();
    console.log('[submitAnswer] Saved answer:', ans);
    // Emit answer submitted event
    const io = req.app.get('io');
    if (io) {
      io.emit('answer-submitted', { questionId, answer: ans });
      // Emit pollResults event with latest vote counts for this question
      const AnswerModel = require('../models/Answer');
      const QuestionModel = require('../models/Question');
      const questionDoc = await QuestionModel.findById(questionId);
      if (questionDoc) {
        const answers = await AnswerModel.find({ question: questionId });
        const counts = {};
        questionDoc.options.forEach(opt => { counts[opt] = 0; });
        console.log('[submitAnswer] Question options:', questionDoc.options);
        console.log('[submitAnswer] All answers:', answers);
        answers.forEach(a => {
          counts[a.answer] = (counts[a.answer] || 0) + 1;
        });
        console.log('[submitAnswer] Calculated counts:', counts);
        io.emit('pollResults', { questionId, counts });
      }
    }
    res.status(201).json(ans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// View results after submission or timeout
exports.getResults = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    // Only show results if not active or student has answered
    if (question.isActive) {
      // Check if student has answered
      const { studentId } = req.query;
      const answer = await Answer.findOne({ student: studentId, question: questionId });
      if (!answer && new Date() < question.expiresAt) {
        return res.status(403).json({ error: 'Results not available yet' });
      }
    }
    // Count answers
    const answers = await Answer.find({ question: questionId });
    const counts = {};
    question.options.forEach(opt => { counts[opt] = 0; });
    answers.forEach(a => { counts[a.answer] = (counts[a.answer] || 0) + 1; });
    res.json({ question: question.text, options: question.options, counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
