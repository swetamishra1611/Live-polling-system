const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
});

module.exports = mongoose.model('Question', QuestionSchema);