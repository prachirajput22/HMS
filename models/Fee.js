// ============================================================
// Fee Model — Tracks hostel fee payments with auto late-fee
// ============================================================
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const feeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  receiptId: { type: String, default: () => 'REC-' + uuidv4().slice(0, 8).toUpperCase() },
  dueDate: { type: Date, required: true },
  lateFee: { type: Number, default: 0 },
  paidAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Fee', feeSchema);
