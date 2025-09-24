// List all polls, optionally filter by createdBy
exports.listPolls = async (req, res) => {
  try {
    const filter = {};
    if (req.query.createdBy) {
      filter.createdBy = req.query.createdBy;
    }
    const polls = await Poll.find(filter).sort({ createdAt: -1 });
    res.json({ data: polls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const Poll = require('../models/Poll');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Teacher = require('../models/Teacher');

// Create a new poll
exports.createPoll = async (req, res) => {
  try {
    const { title, createdBy } = req.body;
    const poll = new Poll({ title, createdBy });
    await poll.save();
    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ask a new question (only if allowed)
exports.askQuestion = async (req, res) => {
  try {
    const { text, options } = req.body;
    const { pollId } = req.params;
    const poll = await Poll.findById(pollId).populate('questions');
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // Only allow if no question or all students have answered previous
    const lastQuestion = poll.questions[poll.questions.length - 1];
    if (lastQuestion) {
      const question = await Question.findById(lastQuestion._id);
      if (question.isActive) {
        return res.status(400).json({ error: 'Previous question still active' });
      }
    }

    const expiresAt = new Date(Date.now() + 60000); // 60 seconds from now
    const question = new Question({ text, options, poll: poll._id, isActive: true, expiresAt });
    await question.save();
    poll.questions.push(question._id);
    await poll.save();
    // Emit new question event
    const io = req.app.get('io');
    if (io) {
      console.log('[Socket.io] Emitting new-question:', { pollId: poll._id, question });
      io.emit('new-question', { pollId: poll._id, question });
    } else {
      console.log('[Socket.io] io not found on app');
    }
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// View live polling results
exports.getResults = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findById(pollId).populate({
      path: 'questions',
      populate: { path: 'answers' }
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // For each question, count answers
    const results = await Promise.all(
      poll.questions.map(async (q) => {
        const answers = await Answer.find({ question: q._id });
        const counts = {};
        q.options.forEach(opt => { counts[opt] = 0; });
        answers.forEach(a => { counts[a.answer] = (counts[a.answer] || 0) + 1; });
        return {
          question: q.text,
          options: q.options,
          counts,
          isActive: q.isActive,
          expiresAt: q.expiresAt
        };
      })
    );
    res.json({ poll: poll.title, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Register a new teacher
exports.register = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const teacher = new Teacher({ name });
    await teacher.save();
    res.status(201).json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
