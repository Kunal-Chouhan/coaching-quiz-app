const mongoose = require('mongoose');

// A single MCQ question with exactly four options.
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length === 4,
      message: 'Each question must have exactly 4 options.'
    }
  },
  // Index (0-3) of the correct option within `options`.
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  }
}, { _id: true });

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  questions: {
    type: [questionSchema],
    default: []
  },
  // Duration in minutes.
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Short code students enter to reach this quiz without logging in.
  accessCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Quiz', quizSchema);
