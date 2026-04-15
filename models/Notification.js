// ============================================================
// Notification Model — System-wide notifications with read tracking
// ============================================================
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  // 'event' | 'announcement' | 'alert' | 'system'
  type: { type: String, default: 'announcement' },
  // Users who have read this notification
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
