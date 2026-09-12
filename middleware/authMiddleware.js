// Protects tutor-only routes. Requires an active session set at login.
function requireTutorAuth(req, res, next) {
  if (req.session && req.session.tutorId) {
    return next();
  }
  req.flash = req.flash || {};
  return res.redirect('/login');
}

// Makes the logged-in tutor's info available to every EJS view.
function attachTutorToLocals(req, res, next) {
  res.locals.currentTutor = req.session && req.session.tutorName
    ? { id: req.session.tutorId, name: req.session.tutorName }
    : null;
  next();
}

module.exports = { requireTutorAuth, attachTutorToLocals };
