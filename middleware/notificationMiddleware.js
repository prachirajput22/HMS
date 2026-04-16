// ============================================================
// Notification Middleware — injects user notifications into res.locals
// so topbar.ejs and sidebar.ejs always have them available
// ============================================================
const Notification = require('../models/Notification');

const injectUserNotifications = async (req, res, next) => {
  // Only run for logged-in users
  if (!req.session || !req.session.userId) {
    res.locals.notifications = [];
    res.locals.unreadCount = 0;
    return next();
  }

  try {
    const userId = req.session.userId;

    const notifications = await Notification.find({
      $or: [{ userId }, { userId: null }]
    }).sort({ createdAt: -1 }).limit(10);

    const unreadCount = notifications.filter(n => {
      if (n.userId) return !n.isRead; // personal
      return !(n.readBy || []).map(id => id.toString()).includes(userId.toString()); // broadcast
    }).length;

    res.locals.notifications = notifications;
    res.locals.unreadCount = unreadCount;
  } catch (err) {
    // Silent fail — never block the request
    console.error('[NotifMiddleware Error]', err.message);
    res.locals.notifications = [];
    res.locals.unreadCount = 0;
  }

  next();
};

module.exports = { injectUserNotifications };
