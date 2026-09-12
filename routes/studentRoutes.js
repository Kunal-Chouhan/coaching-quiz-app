const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/quizzes', studentController.getJoinPage);
router.post('/quizzes/join', studentController.postJoin);
router.get('/quizzes/:id', studentController.getQuizDetail);
router.post('/quizzes/:id/attempt', studentController.startQuiz);
router.post('/quizzes/:id/submit', studentController.submitQuiz);
router.get('/results/:id', studentController.getResult);

module.exports = router;
