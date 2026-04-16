// ============================================================
// Complaint Controller — Public/private complaints with voting
// ============================================================
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// GET /complaint
exports.getComplaints = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('roomId');

    // Public complaints sorted by votes
    const publicComplaints = await Complaint.find({ type: 'public' })
      .populate('userId', 'name profileImage')
      .sort({ voteCount: -1 });

    // Private complaints for this user only
    const privateComplaints = await Complaint.find({
      type: 'private',
      userId: req.session.userId,
    }).populate('userId', 'name');

    res.render('user/complaint', {
      title: 'Complaints',
      user,
      publicComplaints,
      privateComplaints,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

// POST /complaint (create)
exports.postComplaint = async (req, res) => {
  try {
    const { category, type, description } = req.body;
    const user = await User.findById(req.session.userId).populate('roomId');

    const complaintData = {
      userId: req.session.userId,
      category,
      type,
      description,
    };

    if (req.file) {
      complaintData.image = '/uploads/complaints/' + req.file.filename;
    }

    // Auto-fill room info for private complaints
    if (type === 'private' && user.roomId) {
      complaintData.roomNumber = user.roomId.roomNumber;
      complaintData.floor = user.roomId.floor;

      // Only roommate complaints can request room change
      if (category === 'Roommate Complaint') {
        complaintData.isRoomChangeRequested = req.body.requestRoomChange === 'on';
        if (complaintData.isRoomChangeRequested) {
          complaintData.roomChangeStatus = 'Pending';
        }
      }
    }

    await Complaint.create(complaintData);
    req.flash('success', 'Complaint submitted successfully.');
    res.redirect('/complaint');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to submit complaint.');
    res.redirect('/complaint');
  }
};

// POST /complaint/:id/vote
exports.voteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint || complaint.type !== 'public') {
      return res.status(400).json({ success: false, message: 'Invalid complaint.' });
    }

    const userId = req.session.userId.toString();
    const alreadyVoted = complaint.votes.map((v) => v.toString()).includes(userId);

    if (alreadyVoted) {
      complaint.votes = complaint.votes.filter((v) => v.toString() !== userId);
      complaint.voteCount = complaint.votes.length;
    } else {
      complaint.votes.push(req.session.userId);
      complaint.voteCount = complaint.votes.length;
    }

    await complaint.save();
    res.json({ success: true, voteCount: complaint.voteCount, voted: !alreadyVoted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ===================== ADMIN COMPLAINT MANAGEMENT =====================

exports.adminGetComplaints = async (req, res) => {
  try {
    const admin = await require('../models/Admin').findById(req.session.adminId);
    const publicComplaints = await Complaint.find({ type: 'public' })
      .populate('userId', 'name email')
      .sort({ voteCount: -1 });
    const privateComplaints = await Complaint.find({ type: 'private' })
      .populate('userId', 'name email roomId')
      .sort({ createdAt: -1 });

    res.render('admin/complaints', {
      title: 'Complaint Management',
      admin,
      publicComplaints,
      privateComplaints,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await Complaint.findByIdAndUpdate(req.params.id, { status });
    req.flash('success', 'Complaint status updated.');
    res.redirect('/admin/complaints');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Update failed.');
    res.redirect('/admin/complaints');
  }
};

exports.handleRoomChange = async (req, res) => {
  try {
    const { action } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('userId');

    if (!complaint) {
      req.flash('error', 'Complaint not found.');
      return res.redirect('/admin/complaints');
    }

    if (action === 'approve') {
      const user = complaint.userId;
      if (user.roomId) {
        const Room = require('../models/Room');
        await Room.findByIdAndUpdate(user.roomId, {
          $pull: { occupants: user._id },
          status: 'Available',
        });
      }

      await require('../models/User').findByIdAndUpdate(user._id, {
        roomId: null,
        roomStatus: 'Waiting',
      });

      complaint.roomChangeStatus = 'Approved';
      complaint.status = 'Resolved';

      await require('../models/Notification').create({
        userId: user._id,
        title: 'Room Change Approved',
        message: 'Your room change request has been approved. Please request a new room.',
        type: 'system',
      });
    } else {
      complaint.roomChangeStatus = 'Rejected';
      await require('../models/Notification').create({
        userId: complaint.userId,
        title: 'Room Change Rejected',
        message: 'Your room change request has been reviewed and rejected.',
        type: 'alert',
      });
    }

    await complaint.save();
    req.flash('success', `Room change request ${action}d.`);
    res.redirect('/admin/complaints');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Action failed.');
    res.redirect('/admin/complaints');
  }
};
