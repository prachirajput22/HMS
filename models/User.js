// ============================================================
// User Model — Student schema for hostel management
// ============================================================
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  course: { type: String },
  phone: { type: String, default: '' },
  profileImage: { type: String, default: '' },

  // Roommate matching preferences
  preferences: {
    sleepSchedule: { type: String, enum: ['Early Bird', 'Night Owl'], default: 'Early Bird' },
    food:          { type: String, enum: ['Veg'], default: 'Veg' },
    lifestyle:     { type: String, enum: ['Quiet', 'Social'], default: 'Quiet' },

    // Priority weights: 1 = Low, 2 = Medium, 3 = High
    // Used by the weighted matching engine
    priorities: {
      sleepSchedule: { type: Number, default: 1, min: 1, max: 3 },
      food:          { type: Number, default: 1, min: 1, max: 3 },
      lifestyle:     { type: Number, default: 1, min: 1, max: 3 },
    },
  },

  // Room status: 'Not Requested' | 'Waiting' | 'Allocated'
  roomStatus: { type: String, default: 'Not Requested' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
