// Utility to auto-close questions after 60 seconds
const Question = require('../models/Question');

// This function should be called periodically (e.g., every 10 seconds)
async function closeExpiredQuestions(app) {
  const now = new Date();
  // Find all active questions that have expired
  const expired = await Question.find({ isActive: true, expiresAt: { $lte: now } });
  for (const q of expired) {
    q.isActive = false;
    await q.save();
    // Emit pollResults event for this question
    try {
      const Answer = require('../models/Answer');
      const answers = await Answer.find({ question: q._id });
      const counts = {};
      q.options.forEach(opt => { counts[opt] = 0; });
      answers.forEach(a => { counts[a.answer] = (counts[a.answer] || 0) + 1; });
      const io = app && app.get ? app.get('io') : null;
      if (io) {
        io.emit('pollResults', { questionId: q._id.toString(), counts });
      }
    } catch (err) {
      // ignore
    }
  }
}

module.exports = { closeExpiredQuestions };
