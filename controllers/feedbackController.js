// ============================================================
// Feedback Controller — User feedback with admin analytics
// ============================================================
const Feedback = require('../models/Feedback');
const User = require('../models/User');

// GET /feedback
exports.getFeedback = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const myFeedback = await Feedback.findOne({ userId: req.session.userId });

    res.render('user/feedback', {
      title: 'Feedback',
      user,
      myFeedback,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

// POST /feedback
exports.postFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    // Upsert: one feedback per user
    await Feedback.findOneAndUpdate(
      { userId: req.session.userId },
      { rating: parseInt(rating), comment, createdAt: new Date() },
      { upsert: true, new: true }
    );

    req.flash('success', 'Thank you for your feedback!');
    res.redirect('/feedback');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to submit feedback.');
    res.redirect('/feedback');
  }
};

// ===================== ADMIN =====================

exports.adminGetFeedback = async (req, res) => {
  try {
    const admin = await require('../models/Admin').findById(req.session.adminId);
    const feedbacks = await Feedback.find().populate('userId', 'name email').sort({ createdAt: -1 });

    const avgRating =
      feedbacks.length > 0
        ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
        : 0;

    res.render('admin/feedback', {
      title: 'Feedback Analysis',
      admin,
      feedbacks,
      avgRating,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};
