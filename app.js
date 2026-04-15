// ============================================================
// MITS Hostel Room Allocation & Fee Management System
// Main Application Entry Point
// ============================================================
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const methodOverride = require('method-override');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE via forms
app.use(methodOverride('_method'));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'mits_hostel_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

// Flash messages
app.use(flash());

// Global locals for views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.errors = req.flash('error');
  res.locals.session = req.session;
  next();
});

// Landing page
app.get('/', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('landing', { title: 'Welcome' });
});

// Routes
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Error', message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MITS Hostel Management System running at http://localhost:${PORT}`);
});
