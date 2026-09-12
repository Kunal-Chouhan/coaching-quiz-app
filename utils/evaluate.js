/**
 * Evaluates a student's submitted answers against a quiz's questions.
 * @param {Object} quiz - Mongoose Quiz document (with .questions array).
 * @param {Object} submittedAnswers - Map of { [questionId]: selectedOptionIndex }.
 * @returns {Object} { answers, score, percentage, correctCount, wrongCount }
 */
function evaluateQuiz(quiz, submittedAnswers = {}) {
  const answers = [];
  let correctCount = 0;

  quiz.questions.forEach((question) => {
    const qId = question._id.toString();
    const raw = submittedAnswers[qId];
    const selectedOptionIndex = raw === undefined || raw === null || raw === ''
      ? null
      : parseInt(raw, 10);

    const isCorrect = selectedOptionIndex !== null
      && !Number.isNaN(selectedOptionIndex)
      && selectedOptionIndex === question.correctAnswerIndex;

    if (isCorrect) correctCount += 1;

    answers.push({
      question: question._id,
      selectedOptionIndex: Number.isNaN(selectedOptionIndex) ? null : selectedOptionIndex,
      isCorrect
    });
  });

  const totalQuestions = quiz.questions.length;
  const wrongCount = totalQuestions - correctCount;
  const percentage = totalQuestions === 0
    ? 0
    : Math.round((correctCount / totalQuestions) * 10000) / 100; // 2 decimal places

  return {
    answers,
    score: correctCount,
    percentage,
    correctCount,
    wrongCount,
    totalQuestions
  };
}

module.exports = { evaluateQuiz };
