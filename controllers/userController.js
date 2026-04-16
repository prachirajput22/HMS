// ============================================================
// User Controller — Dashboard, Profile, Room, Payment
// ============================================================
const User = require('../models/User');
const Room = require('../models/Room');
const Fee = require('../models/Fee');
const Notification = require('../models/Notification');
const { findBestRoom, compatibilityPercentage } = require('../utils/smartMatch');

// ===================== DASHBOARD =====================

exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('roomId');
    const fee = await Fee.findOne({ userId: user._id, status: 'Pending' }).sort({ createdAt: -1 });

    // Auto apply late fee
    if (fee && fee.dueDate < new Date() && fee.lateFee === 0) {
      fee.lateFee = Math.round(fee.amount * 0.1); // 10% late fee
      await fee.save();
    }

    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
    const unreadCount = notifications.filter(
      (n) => !n.readBy.map((id) => id.toString()).includes(req.session.userId.toString())
    ).length;

    // Get roommates for compatibility display
    let roommates = [];
    if (user.roomId) {
      const room = await Room.findById(user.roomId._id).populate('occupants');
      roommates = room.occupants
        .filter((o) => o._id.toString() !== user._id.toString())
        .map((mate) => ({
          name: mate.name,
          profileImage: mate.profileImage,
          compatibility: compatibilityPercentage(user.preferences, mate.preferences),
          preferences: mate.preferences,
        }));
    }

    res.render('user/dashboard', {
      title: 'My Dashboard',
      user,
      fee,
      notifications,
      unreadCount,
      roommates,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
};

// ===================== PROFILE =====================

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('roomId');
    res.render('user/profile', {
      title: 'My Profile',
      user,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      name, age, gender, course, phone,
      sleepSchedule, food, lifestyle,
      sleepPriority, foodPriority, lifestylePriority,
    } = req.body;
    const update = {
      name,
      age,
      gender,
      course,
      phone,
      preferences: {
        sleepSchedule,
        food,
        lifestyle,
        priorities: {
          sleepSchedule: Math.min(3, Math.max(1, parseInt(sleepPriority) || 1)),
          food:          Math.min(3, Math.max(1, parseInt(foodPriority) || 1)),
          lifestyle:     Math.min(3, Math.max(1, parseInt(lifestylePriority) || 1)),
        },
      },
    };
    if (req.file) {
      update.profileImage = '/uploads/profiles/' + req.file.filename;
    }
    await User.findByIdAndUpdate(req.session.userId, update);
    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update profile.');
    res.redirect('/profile');
  }
};

// ===================== ROOM REQUEST =====================

exports.getRoomRequest = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('roomId');

    // Get roommates for compatibility
    let roommates = [];
    if (user.roomId) {
      const room = await Room.findById(user.roomId).populate('occupants');
      roommates = room.occupants
        .filter((o) => o._id.toString() !== user._id.toString())
        .map((mate) => ({
          name: mate.name,
          profileImage: mate.profileImage,
          compatibility: compatibilityPercentage(user.preferences, mate.preferences),
          preferences: mate.preferences,
        }));
    }

    res.render('user/room', {
      title: 'Room Request',
      user,
      roommates,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

exports.postRoomRequest = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (user.roomStatus === 'Waiting' || user.roomStatus === 'Allocated') {
      req.flash('error', 'You have already requested or been allocated a room.');
      return res.redirect('/request-room');
    }

    // Add to waiting pool
    user.roomStatus = 'Waiting';
    user.roomId = null;
    await user.save();

    await Notification.create({
      title: 'Room Request Received',
      message: 'You have been added to the waiting list. Allocation will be done soon.',
      type: 'system',
    });

    req.flash('success', 'You are in waiting list. Allocation will be done soon.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Room request failed. Please try again.');
    res.redirect('/request-room');
  }
};

// ===================== PAYMENT =====================

exports.getPayment = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const fees = await Fee.find({ userId: user._id }).sort({ createdAt: -1 });

    // Auto apply late fee on load
    for (const fee of fees) {
      if (fee.status === 'Pending' && fee.dueDate < new Date() && fee.lateFee === 0) {
        fee.lateFee = Math.round(fee.amount * 0.1);
        await fee.save();
      }
    }

    res.render('user/payment', {
      title: 'Fee & Payment',
      user,
      fees,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

exports.postPayment = async (req, res) => {
  try {
    const { feeId } = req.body;
    const fee = await Fee.findById(feeId);

    if (!fee || fee.userId.toString() !== req.session.userId.toString()) {
      req.flash('error', 'Invalid payment request.');
      return res.redirect('/payment');
    }

    fee.status = 'Paid';
    fee.paidAt = new Date();
    await fee.save();

    req.flash('success', `Payment successful! Receipt ID: ${fee.receiptId}`);
    res.redirect('/payment');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Payment failed. Please try again.');
    res.redirect('/payment');
  }
};

// ===================== NOTIFICATIONS =====================

exports.markNotificationRead = async (req, res) => {
  try {
    const { notifId } = req.params;
    await Notification.findByIdAndUpdate(notifId, {
      $addToSet: { readBy: req.session.userId },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
