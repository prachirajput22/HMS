
// Auth Middleware — protect user and admin routes

const isUser = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please login to continue.');
  res.redirect('/login');
};

/*
  Require logged-in admin session
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.flash('error', 'Admin access required.');
  res.redirect('/admin/login');
};

/*
  Redirect already-logged-in users away from login/register
 */
const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

/*
  Redirect already-logged-in admins away from admin login
 */
const isAdminGuest = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

module.exports = { isUser, isAdmin, isGuest, isAdminGuest };
