// ============================================================
// Notification Model — System-wide notifications with read tracking
// ============================================================
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'announcement' },
  isRead: { type: Boolean, default: false }, // for targeted users
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // for broadcasts
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
