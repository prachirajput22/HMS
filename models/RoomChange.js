const mongoose = require('mongoose');

const roomChangeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }, // Optional explicit link
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoomChange', roomChangeSchema);
