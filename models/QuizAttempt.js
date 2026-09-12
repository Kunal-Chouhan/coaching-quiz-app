const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId, // references the sub-document _id inside Quiz.questions
    required: true
  },
  selectedOptionIndex: {
    type: Number, // null/undefined if the student left it blank
    default: null
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: {
    type: [answerSchema],
    default: []
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  percentage: {
    type: Number,
    required: true,
    default: 0
  },
  // Time taken in seconds.
  timeTaken: {
    type: Number,
    required: true,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
