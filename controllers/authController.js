const bcrypt = require('bcryptjs');
const User = require('../models/User');

// How long a "Remember me" session should last (30 days).
const REMEMBER_ME_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

// A secret only you know, set in .env as TUTOR_SIGNUP_CODE. Nobody can create
// a tutor account without it, so students can't just find /register and sign
// up as a tutor. Leaving it unset disables self-registration entirely.
const TUTOR_SIGNUP_CODE = process.env.TUTOR_SIGNUP_CODE;

// GET /login
function getLogin(req, res) {
  // Already have a valid session (e.g. reloaded the page, or came back later
  // within the "remember me" window) - skip the form and go straight in.
  if (req.session && req.session.tutorId) {
    return res.redirect('/tutor/dashboard');
  }
  res.render('login', { error: null, mode: 'login' });
}

// GET /register  (kept simple/unlisted - SRS lists tutor auth generically;
// this lets you create the first tutor account without touching the DB by hand)
function getRegister(req, res) {
  if (req.session && req.session.tutorId) {
    return res.redirect('/tutor/dashboard');
  }
  if (!TUTOR_SIGNUP_CODE) {
    return res.status(404).render('login', {
      error: 'Tutor registration is currently closed.',
      mode: 'login'
    });
  }
  res.render('login', { error: null, mode: 'register' });
}

// POST /login
async function postLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    const tutor = await User.findOne({ email: (email || '').toLowerCase().trim() });

    if (!tutor) {
      return res.status(401).render('login', { error: 'Invalid email or password.', mode: 'login' });
    }

    const isMatch = await bcrypt.compare(password || '', tutor.passwordHash);
    if (!isMatch) {
      return res.status(401).render('login', { error: 'Invalid email or password.', mode: 'login' });
    }

    req.session.tutorId = tutor._id.toString();
    req.session.tutorName = tutor.name;

    // "Remember me" checked -> keep the session (and its cookie) alive for 30
    // days so a reload or a return visit later doesn't ask for login again.
    // Left unchecked -> falls back to the default session lifetime set in server.js.
    if (rememberMe) {
      req.session.cookie.maxAge = REMEMBER_ME_MAX_AGE;
    }

    res.redirect('/tutor/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).render('login', { error: 'Something went wrong. Please try again.', mode: 'login' });
  }
}

// POST /register
async function postRegister(req, res) {
  try {
    const { name, email, password, confirmPassword, signupCode } = req.body;

    if (!TUTOR_SIGNUP_CODE) {
      return res.status(404).render('login', { error: 'Tutor registration is currently closed.', mode: 'login' });
    }
    if ((signupCode || '').trim() !== TUTOR_SIGNUP_CODE) {
      return res.status(403).render('login', { error: 'Invalid tutor signup code.', mode: 'register' });
    }
    if (!name || !email || !password) {
      return res.status(400).render('login', { error: 'All fields are required.', mode: 'register' });
    }
    if (password !== confirmPassword) {
      return res.status(400).render('login', { error: 'Passwords do not match.', mode: 'register' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).render('login', { error: 'An account with this email already exists.', mode: 'register' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tutor = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash });

    req.session.tutorId = tutor._id.toString();
    req.session.tutorName = tutor.name;
    res.redirect('/tutor/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).render('login', { error: 'Something went wrong. Please try again.', mode: 'register' });
  }
}

// POST /logout
function postLogout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

module.exports = { getLogin, getRegister, postLogin, postRegister, postLogout };