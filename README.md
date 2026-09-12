# Coaching Quiz & Student Performance Management System

Built from the SRS: HTML/CSS/JS + Bootstrap + EJS on the frontend, Node.js + Express on the backend, MongoDB + Mongoose for data, MVC architecture.

## Features implemented (MVP from the SRS)

- **Tutor**: register/login (session-based auth, bcrypt-hashed passwords), dashboard with stats, create/edit/delete quizzes, add/edit MCQ questions (4 options + correct answer), publish/unpublish, view per-quiz student results.
- **AI quiz generation**: tutor gives a topic, uploads an image (textbook page, notes, diagram), or both, plus a question count and difficulty — Google Gemini (free tier) drafts the MCQs, and the tutor lands on the normal quiz-edit screen to review/tweak everything before saving.
- **Student**: no account needed — browse published quizzes, enter name, take a timed quiz with question navigation and a progress palette, auto-submit when the timer hits zero, automatic evaluation, and a detailed result + answer review screen.
- **Architecture**: `models/` (Mongoose schemas matching the SRS's `User`, `Quiz`, `QuizAttempt`), `controllers/`, `routes/`, `views/` (EJS) — classic MVC, exactly as diagrammed in section 8 of the SRS.

## Project structure

```
coaching-quiz-app/
├── server.js                 # App entry point
├── config/db.js              # MongoDB connection
├── models/                   # User, Quiz, QuizAttempt (Mongoose schemas)
├── controllers/               # authController, tutorController, studentController
├── routes/                    # authRoutes, tutorRoutes, studentRoutes
├── middleware/authMiddleware.js
├── utils/evaluate.js          # Scoring/evaluation logic
├── views/                     # EJS templates (partials, tutor/, student/)
└── public/                    # css, js (timer.js, quizForm.js)
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   - `MONGO_URI`: your MongoDB connection string (local `mongodb://127.0.0.1:27017/coaching_quiz_db` or a MongoDB Atlas URI).
   - `SESSION_SECRET`: any long random string.
   - `GEMINI_API_KEY`: only needed for the "Generate with AI" feature — get a **free** key at https://aistudio.google.com/apikey (no credit card required). Everything else works fine without it; that one feature will just show a friendly error if the key is missing.
   - `GEMINI_MODEL`: defaults to `gemini-3.6-flash`, which sits on Gemini's free tier and supports both text and image input. Change it if you want a different model. (Google occasionally retires older model IDs — if you get a 404 "model no longer available" error, check https://ai.google.dev/gemini-api/docs/models for the current free-tier model name.)

3. **Make sure MongoDB is running**
   - Local: install MongoDB Community Server and run `mongod`.
   - Or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and paste its connection string into `MONGO_URI`.

4. **Run the app**
   ```bash
   npm start
   # or, for auto-reload during development:
   npm run dev
   ```
   Visit `http://localhost:3000`.

5. **Create your first tutor account**
   Go to `http://localhost:3000/register` (this route isn't in the nav bar on purpose — bookmark it or type it directly) and create your tutor login. After that, use `/login`.

## Routes

| Route | Who | Purpose |
|---|---|---|
| `/register`, `/login` | Tutor | Account creation / sign-in |
| `/tutor/dashboard` | Tutor | Stats overview |
| `/tutor/quizzes` | Tutor | List/manage own quizzes |
| `/tutor/quizzes/create`, `/tutor/quizzes/:id/edit` | Tutor | Create/edit quiz + questions |
| `/tutor/quizzes/generate` | Tutor | AI-generate questions from a topic and/or image |
| `/tutor/quizzes/:id/results` | Tutor | Per-quiz student results |
| `/quizzes` | Student | Browse published quizzes |
| `/quizzes/:id` → `/quizzes/:id/attempt` | Student | Enter name, take quiz |
| `/results/:id` | Student | View score + answer review |

## Notes / next steps

- The SRS's "AI quiz generation" and other future features (leaderboard, analytics, etc.) are intentionally left out of this MVP, matching the SRS's phased plan.
- Sessions are stored in MongoDB via `connect-mongo`, so tutor logins survive server restarts.
- Basic client-side validation exists, but you should add rate-limiting and stricter server-side input validation before deploying publicly.
