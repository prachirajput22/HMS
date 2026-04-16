// ============================================================
// Room Model — Represents hostel rooms with capacity tracking
// ============================================================
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  floor:      { type: Number, required: true },
  block:      { type: String, default: 'A' },
  type:       { type: String, enum: ['Single', 'Double', 'Triple', 'Dormitory'], default: 'Double' },
  capacity:   { type: Number, required: true, default: 2 },
  occupants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  amenities:  [{ type: String }], // e.g. ['AC', 'WiFi', 'Attached Bath']
  // 'Available' | 'Full' | 'Maintenance'
  status:     { type: String, default: 'Available' },
  monthlyFee: { type: Number, default: 5000 },
  createdAt:  { type: Date, default: Date.now },
});

// Virtual: available slots
roomSchema.virtual('availableSlots').get(function () {
  return this.capacity - this.occupants.length;
});

module.exports = mongoose.model('Room', roomSchema);
