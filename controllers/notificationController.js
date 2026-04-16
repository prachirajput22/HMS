// ============================================================
// Notification Controller — Admin notification management
// ============================================================
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const User = require('../models/User');

// ===================== ADMIN ROUTES =====================

// GET /admin/notifications
exports.getNotifications = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const users = await User.find().select('name email').sort({ name: 1 });
    const notifications = await Notification.find().populate('userId', 'name').sort({ createdAt: -1 }).limit(50);

    res.render('admin/notifications', {
      title: 'Notifications',
      admin,
      users,
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
    const { title, message, type, targetUserId } = req.body;
    let userId = null;
    if (targetUserId && targetUserId !== 'all') {
      userId = targetUserId;
    }
    
    await Notification.create({ title, message, type, userId });

    req.flash('success', userId ? 'Notification specifically dispatched.' : 'Notification broadcasted to all users.');
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

// ===================== USER ROUTES =====================

// GET /notifications (View all)
exports.getUserNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const notifications = await Notification.find({
      $or: [
        { userId: user._id },
        { userId: null }
      ]
    }).sort({ createdAt: -1 });

    res.render('user/notifications', {
      title: 'My Notifications',
      user: user,
      notifications
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

// GET /api/notifications/poll (AJAX strictly for Unread badge)
exports.pollUnreadCount = async (req, res) => {
  try {
    if (!req.session.userId) return res.json({ unreadCount: 0, html: '' });

    const notifications = await Notification.find({
      $or: [{ userId: req.session.userId }, { userId: null }]
    }).sort({ createdAt: -1 }).limit(10);

    let unreadCount = 0;
    notifications.forEach(n => {
      const isRead = n.userId ? n.isRead : (n.readBy || []).map(id => id.toString()).includes(req.session.userId.toString());
      if (!isRead) unreadCount++;
    });

    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
};

// POST /notifications/read/:id
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.json({ success: false });

    if (notification.userId) {
      // Personal
      notification.isRead = true;
      await notification.save();
    } else {
      // Broadcast
      if (!(notification.readBy || []).map(id => id.toString()).includes(req.session.userId.toString())) {
        notification.readBy = notification.readBy || [];
        notification.readBy.push(req.session.userId);
        await notification.save();
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// POST /notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    const unreadPersonal = await Notification.find({ userId: req.session.userId, isRead: false });
    for (const n of unreadPersonal) {
      n.isRead = true;
      await n.save();
    }

    const unreadBroadcast = await Notification.find({ userId: null, readBy: { $ne: req.session.userId } });
    for (const n of unreadBroadcast) {
      n.readBy.push(req.session.userId);
      await n.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
