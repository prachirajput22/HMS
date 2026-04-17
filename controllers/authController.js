ge// ============================================================
// Auth Controller — User & Admin authentication
// ============================================================
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');

// ===================== USER AUTH =====================

// GET /register
exports.getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    errors: req.flash('error'),
    success: req.flash('success'),
  });
};

// POST /register
exports.postRegister = async (req, res) => {
  try {
    const {
      name, email, password, age, gender, course, phone,
      sleepSchedule, food, lifestyle,
      sleepPriority, foodPriority, lifestylePriority,
    } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      req.flash('error', 'Email already registered.');
      return res.redirect('/register');
    }

    const hashed = await bcrypt.hash(password, 10);
    const profileImage = req.file ? '/uploads/profiles/' + req.file.filename : '';

    const user = await User.create({
      name,
      email,
      password: hashed,
      age,
      gender,
      course,
      phone,
      profileImage,
      preferences: {
        sleepSchedule,
        food,
        lifestyle,
        priorities: {
          sleepSchedule: Math.min(3, Math.max(1, parseInt(sleepPriority) || 1)),
          food:          Math.min(3, Math.max(1, parseInt(foodPriority) || 1)),
          lifestyle:     Math.min(3, Math.max(1, parseInt(lifestylePriority) || 1)),
        },
      },
    });

    req.session.userId = user._id;
    req.flash('success', 'Welcome to MITS Hostel! Your account has been created.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
};

// GET /login
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    errors: req.flash('error'),
    success: req.flash('success'),
  });
};

// POST /login
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    req.session.userId = user._id;
    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/login');
  }
};

// GET /logout
exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

// ===================== ADMIN AUTH =====================

// GET /admin/register
exports.getAdminRegister = (req, res) => {
  res.render('admin/register', {
    title: 'Admin Register',
    errors: req.flash('error'),
    success: req.flash('success'),
  });
};

// POST /admin/register
exports.postAdminRegister = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/admin/register');
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      req.flash('error', 'Admin email already exists.');
      return res.redirect('/admin/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    req.flash('success', 'Admin account registered securely! Please log in.');
    res.redirect('/admin/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed.');
    res.redirect('/admin/register');
  }
};

// GET /admin/login
exports.getAdminLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    errors: req.flash('error'),
    success: req.flash('success'),
  });
};

// POST /admin/login
exports.postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[Admin Login] Attempt:', email);
    const admin = await Admin.findOne({ email });
    console.log('[Admin Login] Admin found:', !!admin);

    if (!admin) {
      req.flash('error', 'Invalid admin credentials.');
      return res.redirect('/admin/login');
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    console.log('[Admin Login] Password match:', passwordMatch);

    if (!passwordMatch) {
      req.flash('error', 'Invalid admin credentials.');
      return res.redirect('/admin/login');
    }

    req.session.adminId = admin._id;
    req.flash('success', `Welcome, Admin ${admin.name}!`);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Admin login failed.');
    res.redirect('/admin/login');
  }
};

// GET /admin/logout
exports.adminLogout = (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
};
