// ============================================================
// Complaint Model — Public/private complaints with voting
// ============================================================
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['Washroom Issue', 'Water Issue', 'Electricity Issue', 'Maintenance', 'Roommate Complaint'],
    required: true,
  },
  // 'public' | 'private'
  type: { type: String, enum: ['public', 'private'], required: true },
  floor: { type: Number },
  roomNumber: { type: String },
  description: { type: String, required: true },
  image: { type: String, default: '' },
  // 'Open' | 'In Progress' | 'Resolved'
  status: { type: String, default: 'Open' },

  // Voting (public only)
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  voteCount: { type: Number, default: 0 },

  // Room change request (private/roommate complaints only)
  isRoomChangeRequested: { type: Boolean, default: false },
  roomChangeStatus: { type: String, enum: ['None', 'Pending', 'Approved', 'Rejected'], default: 'None' },

  createdAt: { type: Date, default: Date.now },
});

// Priority virtual based on vote count
complaintSchema.virtual('priority').get(function () {
  if (this.voteCount >= 6) return 'High';
  if (this.voteCount >= 3) return 'Medium';
  return 'Low';
});

module.exports = mongoose.model('Complaint', complaintSchema);
