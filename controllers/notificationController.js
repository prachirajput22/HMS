// ============================================================
// Notification Controller — Admin notification management
// ============================================================
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');

// GET /admin/notifications
exports.getNotifications = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);

    res.render('admin/notifications', {
      title: 'Notifications',
      admin,
      notifications,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/notifications
exports.sendNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    await Notification.create({ title, message, type });

    req.flash('success', 'Notification sent to all users.');
    res.redirect('/admin/notifications');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to send notification.');
    res.redirect('/admin/notifications');
  }
};

// DELETE /admin/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    req.flash('success', 'Notification deleted.');
    res.redirect('/admin/notifications');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete notification.');
    res.redirect('/admin/notifications');
  }
};
