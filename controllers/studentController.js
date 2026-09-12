const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { evaluateQuiz } = require('../utils/evaluate');

// GET /quizzes - the "enter your code" landing page. This is the only way
// a student finds a quiz; there is no public listing to browse.
function getJoinPage(req, res) {
  res.render('student/join', { error: null, codeValue: '' });
}

// POST /quizzes/join - looks the code up and hands off to the name-entry screen.
async function postJoin(req, res) {
  const rawCode = (req.body.accessCode || '').trim().toUpperCase();

  if (!rawCode) {
    return res.status(400).render('student/join', { error: 'Enter the code your tutor gave you.', codeValue: '' });
  }

  const quiz = await Quiz.findOne({ accessCode: rawCode, isPublished: true });
  if (!quiz) {
    return res.status(404).render('student/join', {
      error: "That code doesn't match an open quiz. Double-check it with your tutor.",
      codeValue: rawCode
    });
  }

  res.redirect(`/quizzes/${quiz._id}`);
}

// GET /quizzes/:id - quiz detail / name entry screen
async function getQuizDetail(req, res) {
  const quiz = await Quiz.findOne({ _id: req.params.id, isPublished: true });
  if (!quiz) return res.status(404).send('Quiz not available');
  res.render('student/quizDetail', { quiz, error: null });
}

// POST /quizzes/:id/attempt - student enters name, starts the quiz
async function startQuiz(req, res) {
  const quiz = await Quiz.findOne({ _id: req.params.id, isPublished: true });
  if (!quiz) return res.status(404).send('Quiz not available');

  const studentName = (req.body.studentName || '').trim();
  if (!studentName) {
    return res.status(400).render('student/quizDetail', { quiz, error: 'Please enter your name.' });
  }

  res.render('student/attempt', {
    quiz,
    studentName,
    startedAt: Date.now()
  });
}

// POST /quizzes/:id/submit - evaluate and store the attempt
async function submitQuiz(req, res) {
  const quiz = await Quiz.findOne({ _id: req.params.id, isPublished: true });
  if (!quiz) return res.status(404).send('Quiz not available');

  const studentName = (req.body.studentName || 'Anonymous').trim();
  const startedAt = Number(req.body.startedAt) || Date.now();
  const timeTaken = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

  // req.body.answers is expected as answers[<questionId>]=<optionIndex>
  const submittedAnswers = req.body.answers || {};

  const { answers, score, percentage } = evaluateQuiz(quiz, submittedAnswers);

  const attempt = await QuizAttempt.create({
    studentName,
    quiz: quiz._id,
    answers,
    score,
    percentage,
    timeTaken
  });

  res.redirect(`/results/${attempt._id}`);
}

// GET /results/:id - show a single student's result
async function getResult(req, res) {
  const attempt = await QuizAttempt.findById(req.params.id).populate('quiz');
  if (!attempt) return res.status(404).send('Result not found');

  const totalQuestions = attempt.quiz.questions.length;
  const correctCount = attempt.answers.filter((a) => a.isCorrect).length;
  const wrongCount = totalQuestions - correctCount;

  const minutes = Math.floor(attempt.timeTaken / 60);
  const seconds = attempt.timeTaken % 60;
  const timeTakenFormatted = `${minutes}:${String(seconds).padStart(2, '0')}`;

  // Build a review list: question text, options, student's pick, correct answer.
  const review = attempt.quiz.questions.map((q) => {
    const answer = attempt.answers.find((a) => a.question.toString() === q._id.toString());
    return {
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      selectedOptionIndex: answer ? answer.selectedOptionIndex : null,
      isCorrect: answer ? answer.isCorrect : false
    };
  });

  res.render('student/result', {
    attempt,
    totalQuestions,
    correctCount,
    wrongCount,
    timeTakenFormatted,
    review
  });
}

module.exports = { getJoinPage, postJoin, getQuizDetail, startQuiz, submitQuiz, getResult };
