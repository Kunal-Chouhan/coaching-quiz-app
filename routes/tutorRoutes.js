const express = require('express');
const multer = require('multer');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const aiController = require('../controllers/aiController');
const { requireTutorAuth } = require('../middleware/authMiddleware');

// Images are only ever forwarded to the Claude API, never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

router.use(requireTutorAuth);

router.get('/dashboard', tutorController.getDashboard);

// AI-assisted quiz generation - placed before "/quizzes/create" so the static
// "/generate" path isn't swallowed by any future "/:id" style route.
router.get('/quizzes/generate', aiController.getGenerateForm);
router.post('/quizzes/generate', upload.single('image'), aiController.postGenerate);

router.get('/quizzes', tutorController.listQuizzes);
router.get('/quizzes/create', tutorController.getCreateQuiz);
router.post('/quizzes', tutorController.createQuiz);
router.get('/quizzes/:id/edit', tutorController.getEditQuiz);
router.put('/quizzes/:id', tutorController.updateQuiz);
router.delete('/quizzes/:id', tutorController.deleteQuiz);
router.patch('/quizzes/:id/publish', tutorController.togglePublish);
router.patch('/quizzes/:id/regenerate-code', tutorController.regenerateCode);
router.get('/quizzes/:id/results', tutorController.getQuizResults);

module.exports = router;
