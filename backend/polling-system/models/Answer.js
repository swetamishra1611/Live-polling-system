const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  answer: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Answer', AnswerSchema);