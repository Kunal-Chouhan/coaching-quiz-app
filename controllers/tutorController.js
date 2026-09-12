const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

// Characters chosen to avoid look-alikes a student could mistype (0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// Generates an access code guaranteed not to collide with an existing quiz.
async function generateUniqueAccessCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Quiz.findOne({ accessCode: code }).select('_id');
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique access code. Please try again.');
}

// GET /tutor/dashboard
async function getDashboard(req, res) {
  const tutorId = req.session.tutorId;

  const [totalQuizzes, publishedQuizzes, quizzes] = await Promise.all([
    Quiz.countDocuments({ createdBy: tutorId }),
    Quiz.countDocuments({ createdBy: tutorId, isPublished: true }),
    Quiz.find({ createdBy: tutorId }).sort({ createdAt: -1 }).limit(5)
  ]);

  const quizIds = (await Quiz.find({ createdBy: tutorId }).select('_id')).map((q) => q._id);
  const totalAttempts = await QuizAttempt.countDocuments({ quiz: { $in: quizIds } });

  res.render('tutor/dashboard', {
    totalQuizzes,
    publishedQuizzes,
    totalAttempts,
    recentQuizzes: quizzes
  });
}

// GET /tutor/quizzes
async function listQuizzes(req, res) {
  const quizzes = await Quiz.find({ createdBy: req.session.tutorId }).sort({ createdAt: -1 });
  res.render('tutor/quizzes', { quizzes });
}

// GET /tutor/quizzes/create
function getCreateQuiz(req, res) {
  res.render('tutor/quizForm', { quiz: null, error: null });
}

// POST /tutor/quizzes
async function createQuiz(req, res) {
  try {
    const { title, description, duration } = req.body;
    const questions = parseQuestionsFromBody(req.body);

    if (!title || !duration) {
      return res.status(400).render('tutor/quizForm', {
        quiz: req.body,
        error: 'Title and duration are required.'
      });
    }

    const accessCode = await generateUniqueAccessCode();

    await Quiz.create({
      title: title.trim(),
      description: (description || '').trim(),
      duration: Number(duration),
      questions,
      createdBy: req.session.tutorId,
      accessCode,
      isPublished: false
    });

    res.redirect('/tutor/quizzes');
  } catch (err) {
    console.error(err);
    res.status(500).render('tutor/quizForm', { quiz: req.body, error: 'Could not create quiz.' });
  }
}

// GET /tutor/quizzes/:id/edit
async function getEditQuiz(req, res) {
  const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.session.tutorId });
  if (!quiz) return res.status(404).send('Quiz not found');
  res.render('tutor/quizForm', { quiz, error: null });
}

// PUT /tutor/quizzes/:id
async function updateQuiz(req, res) {
  try {
    const { title, description, duration } = req.body;
    const questions = parseQuestionsFromBody(req.body);

    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.session.tutorId },
      {
        title: (title || '').trim(),
        description: (description || '').trim(),
        duration: Number(duration),
        questions
      },
      { new: true, runValidators: true }
    );

    if (!quiz) return res.status(404).send('Quiz not found');
    res.redirect('/tutor/quizzes');
  } catch (err) {
    console.error(err);
    const quiz = await Quiz.findById(req.params.id);
    res.status(500).render('tutor/quizForm', { quiz, error: 'Could not update quiz.' });
  }
}

// DELETE /tutor/quizzes/:id
async function deleteQuiz(req, res) {
  await Quiz.findOneAndDelete({ _id: req.params.id, createdBy: req.session.tutorId });
  await QuizAttempt.deleteMany({ quiz: req.params.id });
  res.redirect('/tutor/quizzes');
}

// PATCH /tutor/quizzes/:id/publish
async function togglePublish(req, res) {
  const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.session.tutorId });
  if (!quiz) return res.status(404).send('Quiz not found');
  quiz.isPublished = !quiz.isPublished;
  await quiz.save();
  res.redirect('/tutor/quizzes');
}

// PATCH /tutor/quizzes/:id/regenerate-code
async function regenerateCode(req, res) {
  const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.session.tutorId });
  if (!quiz) return res.status(404).send('Quiz not found');
  quiz.accessCode = await generateUniqueAccessCode();
  await quiz.save();
  res.redirect('/tutor/quizzes');
}

// GET /tutor/quizzes/:id/results
async function getQuizResults(req, res) {
  const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.session.tutorId });
  if (!quiz) return res.status(404).send('Quiz not found');

  const attempts = await QuizAttempt.find({ quiz: quiz._id }).sort({ submittedAt: -1 });

  const avgPercentage = attempts.length
    ? Math.round((attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length) * 100) / 100
    : 0;

  res.render('tutor/results', { quiz, attempts, avgPercentage });
}

// Helper: rebuild the questions array from the dynamic form fields.
// Expected body shape (arrays, same index across fields):
// questionText[], option1[], option2[], option3[], option4[], correctAnswerIndex[]
function parseQuestionsFromBody(body) {
  const toArray = (val) => (Array.isArray(val) ? val : val !== undefined ? [val] : []);

  const questionTexts = toArray(body.questionText);
  const opt1 = toArray(body.option1);
  const opt2 = toArray(body.option2);
  const opt3 = toArray(body.option3);
  const opt4 = toArray(body.option4);
  const correctIdx = toArray(body.correctAnswerIndex);

  const questions = [];
  for (let i = 0; i < questionTexts.length; i += 1) {
    const text = (questionTexts[i] || '').trim();
    if (!text) continue; // skip empty rows
    questions.push({
      questionText: text,
      options: [opt1[i] || '', opt2[i] || '', opt3[i] || '', opt4[i] || ''],
      correctAnswerIndex: Number(correctIdx[i] || 0)
    });
  }
  return questions;
}

module.exports = {
  getDashboard,
  listQuizzes,
  getCreateQuiz,
  createQuiz,
  getEditQuiz,
  updateQuiz,
  deleteQuiz,
  togglePublish,
  regenerateCode,
  getQuizResults
};
