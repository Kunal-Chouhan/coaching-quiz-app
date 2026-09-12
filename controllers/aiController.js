const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// GET /tutor/quizzes/generate
function getGenerateForm(req, res) {
  res.render('tutor/generateQuiz', { error: null, formValues: { topic: '', numQuestions: 5, difficulty: 'medium' } });
}

// POST /tutor/quizzes/generate
async function postGenerate(req, res) {
  const { topic, numQuestions, difficulty } = req.body;
  const formValues = { topic: topic || '', numQuestions: numQuestions || 5, difficulty: difficulty || 'medium' };
  const imageFile = req.file; // set by multer when an image was uploaded

  try {
    if (!GEMINI_API_KEY) {
      return res.status(400).render('tutor/generateQuiz', {
        error: 'GEMINI_API_KEY is not set on the server. Add it to your .env file to use AI generation (free key at https://aistudio.google.com/apikey).',
        formValues
      });
    }

    const count = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 1), 25);

    if (!topic && !imageFile) {
      return res.status(400).render('tutor/generateQuiz', {
        error: 'Please provide a topic, upload an image, or both.',
        formValues
      });
    }

    if (imageFile && !ALLOWED_IMAGE_TYPES.includes(imageFile.mimetype)) {
      return res.status(400).render('tutor/generateQuiz', {
        error: 'Unsupported image type. Please upload a JPG, PNG, WEBP, or GIF.',
        formValues
      });
    }

    const generated = await generateQuestions({ topic, count, difficulty, imageFile });

    // Hand off to the existing quiz form for review/editing before it's actually saved.
    // No `_id` on this object, so quizForm.ejs treats it as a new (not-yet-created) quiz.
    const draftQuiz = {
      title: topic ? capitalize(topic) : 'Generated Quiz',
      description: topic ? `AI-generated quiz on: ${topic}` : 'AI-generated quiz from uploaded image',
      duration: Math.max(5, count * 2),
      questions: generated
    };

    res.render('tutor/quizForm', { quiz: draftQuiz, error: null });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).render('tutor/generateQuiz', {
      error: `Could not generate questions: ${err.message || 'unknown error'}. Please try again.`,
      formValues
    });
  }
}

// Calls Gemini to produce `count` MCQ questions and returns them in the shape
// the Quiz model / quizForm expects: [{ questionText, options: [4], correctAnswerIndex }]
async function generateQuestions({ topic, count, difficulty, imageFile }) {
  const instructions = [
    `Generate exactly ${count} multiple-choice questions at a ${difficulty || 'medium'} difficulty level.`,
    topic ? `Topic: ${topic}` : 'Base the questions on the content of the attached image (e.g. a textbook page, diagram, or notes).',
    'Each question must have exactly 4 answer options, with exactly one correct answer.',
    'Respond with ONLY a raw JSON array (no markdown code fences, no commentary, no explanation) in this exact shape:',
    '[{"questionText": "...", "options": ["...", "...", "...", "..."], "correctAnswerIndex": 0}]',
    '"correctAnswerIndex" must be the 0-based index (0-3) of the correct option within "options".',
    'Questions should be clear, unambiguous, and educational. Avoid trick questions.'
  ].join('\n');

  const parts = [];
  if (imageFile) {
    parts.push({
      inline_data: {
        mime_type: imageFile.mimetype,
        data: imageFile.buffer.toString('base64')
      }
    });
  }
  parts.push({ text: instructions });

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Gemini API request failed (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) {
    throw new Error('No text response from the model.');
  }

  const parsed = parseQuestionsJson(text);
  return validateAndNormalize(parsed);
}

// Strips any accidental markdown fences and parses the JSON array.
function parseQuestionsJson(rawText) {
  const cleaned = rawText.trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Fall back to extracting the first [...] block if the model added stray text.
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('The model did not return valid JSON.');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of questions.');
  }
  return parsed;
}

// Defensive validation - drops malformed entries rather than letting bad data reach the DB.
function validateAndNormalize(questions) {
  const valid = questions
    .filter((q) => q && typeof q.questionText === 'string'
      && Array.isArray(q.options) && q.options.length === 4
      && q.options.every((opt) => typeof opt === 'string' && opt.trim() !== '')
      && Number.isInteger(q.correctAnswerIndex)
      && q.correctAnswerIndex >= 0 && q.correctAnswerIndex <= 3)
    .map((q) => ({
      questionText: q.questionText.trim(),
      options: q.options.map((opt) => opt.trim()),
      correctAnswerIndex: q.correctAnswerIndex
    }));

  if (valid.length === 0) {
    throw new Error('The model did not return any usable questions. Try a more specific topic.');
  }
  return valid;
}

function capitalize(str) {
  const trimmed = str.trim();
  return trimmed.length ? trimmed[0].toUpperCase() + trimmed.slice(1) : trimmed;
}

module.exports = { getGenerateForm, postGenerate };
