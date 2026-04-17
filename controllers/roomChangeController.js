// ============================================================
// Room Change Controller — Process User reallocation requests
// ============================================================
const RoomChange = require('../models/RoomChange');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Room = require('../models/Room');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const { executeSmartAllocation } = require('./adminController');

// ===================== USER ROUTES =====================

exports.requestRoomChange = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (user.roomStatus !== 'Allocated' || !user.roomId) {
      req.flash('error', 'You must be currently allocated to a room to request a change.');
      return res.redirect('/dashboard');
    }

    const authCheck = await RoomChange.findOne({ userId: user._id, status: 'Pending' });
    if (authCheck) {
      req.flash('error', 'You already have a pending room change request.');
      return res.redirect('/dashboard');
    }

    const existingComplaintRequest = await Complaint.findOne({
      userId: user._id,
      category: 'Roommate Complaint',
      isRoomChangeRequested: true,
      roomChangeStatus: 'Pending'
    });
    if (existingComplaintRequest) {
      req.flash('error', 'You already have a pending roommate complaint for room change.');
      return res.redirect('/dashboard');
    }

    const actualReason = (req.body.reason || '').trim();
    if (!actualReason) {
      req.flash('error', 'Please describe the roommate complaint before requesting a room change.');
      return res.redirect('/dashboard');
    }

    const complaintData = {
      userId: user._id,
      category: 'Roommate Complaint',
      type: 'private',
      description: actualReason,
      isRoomChangeRequested: true,
      roomChangeStatus: 'Pending'
    };

    if (user.roomId) {
      const currentRoom = await Room.findById(user.roomId);
      if (currentRoom) {
        complaintData.roomNumber = currentRoom.roomNumber;
        complaintData.floor = currentRoom.floor;
      }
    }

    const complaint = await Complaint.create(complaintData);

    await RoomChange.create({
      userId: user._id,
      currentRoomId: user.roomId,
      complaintId: complaint._id,
      reason: actualReason
    });

    await Notification.create({
      userId: user._id,
      title: 'Room Change Request Submitted',
      message: 'Your roommate complaint and room change request have been submitted to the administration for review.',
      type: 'system'
    });

    req.flash('success', 'Your roommate complaint and room change request have been submitted successfully.');
    // Check where they posted from. If from dashboard, go dashboard. If from complaint, go complaint.
    const referer = req.headers.referer || '/dashboard';
    res.redirect(referer.includes('complaint') ? '/complaint' : '/dashboard');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to submit room change request.');
    res.redirect('/dashboard');
  }
};

// ===================== ADMIN ROUTES =====================

exports.getRoomChangeRequests = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const requests = await RoomChange.find()
      .populate('userId', 'name email profileImage')
      .populate('currentRoomId', 'roomNumber floor capacity')
      .populate('complaintId', 'description category roomChangeStatus')
      .sort({ createdAt: -1 });

    res.render('admin/roomChange', {
      title: 'Room Change Requests',
      admin,
      requests,
      errors: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to fetch Room Change configurations.');
    res.redirect('/admin/dashboard');
  }
};

exports.approveRoomChange = async (req, res) => {
  try {
    const request = await RoomChange.findById(req.params.id);
    if (!request || request.status !== 'Pending') {
      req.flash('error', 'Invalid or already processed room change request.');
      return res.redirect('/admin/room-change');
    }

    // 1. Wipe User out of existing room
    const room = await Room.findById(request.currentRoomId);
    if (room) {
      room.occupants.pull(request.userId);
      room.status = room.occupants.length >= room.capacity ? 'Full' : 'Available';
      await room.save();
    }

    // 2. Clear user state and convert to Wait pool
    const user = await User.findById(request.userId);
    user.roomId = null;
    user.roomStatus = 'Waiting';
    await user.save();

    // 3. Mark request successfully adjudicated
    request.status = 'Approved';
    await request.save();

    if (request.complaintId) {
      await Complaint.findByIdAndUpdate(request.complaintId, {
        roomChangeStatus: 'Approved',
        status: 'Resolved'
      });
    }

    await Notification.create({
      userId: user._id,
      title: 'Room Change Approved',
      message: 'Your room change request has been approved. You are moved to the waiting list! Our Smart Allocation will match you momentarily.',
      type: 'alert'
    });

    // 4. Auto-fire reallocation seamlessly!
    await executeSmartAllocation();

    req.flash('success', 'Room change formally approved! User transferred to Waiting pool and Smart Allocation cycled successfully.');
    res.redirect('/admin/room-change');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Encountered failure processing approval flow.');
    res.redirect('/admin/room-change');
  }
};

exports.rejectRoomChange = async (req, res) => {
  try {
    const request = await RoomChange.findById(req.params.id);
    if (!request || request.status !== 'Pending') {
      req.flash('error', 'Invalid request layout or parameters.');
      return res.redirect('/admin/room-change');
    }

    request.status = 'Rejected';
    await request.save();

    if (request.complaintId) {
      await Complaint.findByIdAndUpdate(request.complaintId, {
        roomChangeStatus: 'Rejected'
      });
    }

    await Notification.create({
      userId: request.userId,
      title: 'Room Change Rejected',
      message: 'Your room change request was reviewed but fundamentally declined due to capacity routing constraints or internal policies.',
      type: 'system'
    });

    req.flash('success', 'Room change officially rejected.');
    res.redirect('/admin/room-change');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed cleanly processing the rejection.');
    res.redirect('/admin/room-change');
  }
};
