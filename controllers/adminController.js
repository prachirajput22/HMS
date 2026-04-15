// ============================================================
// Admin Controller — Dashboard, Profile, Rooms, Allocation, Payments, Search
// ============================================================
const Admin = require('../models/Admin');
const User = require('../models/User');
const Room = require('../models/Room');
const Fee = require('../models/Fee');
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const { findBestRoom } = require('../utils/smartMatch');

// ===================== DASHBOARD =====================
exports.getDashboard = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);

    const [totalStudents, totalRooms, waitingCount, pendingFees, paidFees, openComplaints] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      User.countDocuments({ roomStatus: 'Waiting' }),
      Fee.countDocuments({ status: 'Pending' }),
      Fee.countDocuments({ status: 'Paid' }),
      Complaint.countDocuments({ status: 'Open' }),
    ]);

    const rooms = await Room.find();
    const allocatedRooms = rooms.filter((r) => r.occupants.length > 0).length;
    const availableRooms = rooms.filter((r) => r.status === 'Available' && r.occupants.length < r.capacity).length;
    const fullRooms = rooms.filter((r) => r.status === 'Full').length;
    const maintenanceRooms = rooms.filter((r) => r.status === 'Maintenance').length;

    const allocatedStudents = await User.countDocuments({ roomStatus: 'Allocated' });

    // Revenue calculations
    const paidFeesData = await Fee.find({ status: 'Paid' });
    const totalRevenue = paidFeesData.reduce((sum, f) => sum + f.amount + f.lateFee, 0);

    const pendingFeesData = await Fee.find({ status: 'Pending' });
    const pendingAmount = pendingFeesData.reduce((sum, f) => sum + f.amount + f.lateFee, 0);

    // Chart data
    const chartData = {
      occupancy: {
        labels: ['Allocated', 'Available', 'Full', 'Maintenance'],
        data: [allocatedRooms, availableRooms, fullRooms, maintenanceRooms],
      },
      payments: {
        labels: ['Paid', 'Pending'],
        data: [paidFees, pendingFees],
      },
    };

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      admin,
      stats: {
        totalStudents,
        allocatedStudents,
        totalRooms,
        availableRooms,
        waitingCount,
        pendingFees,
        paidFees,
        openComplaints,
        totalRevenue,
        pendingAmount,
      },
      chartData: JSON.stringify(chartData),
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/login');
  }
};

// ===================== PROFILE =====================
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    res.render('admin/profile', {
      title: 'Admin Profile',
      admin,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    res.redirect('/admin/dashboard');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const update = { name, phone };
    if (req.file) update.profileImage = '/uploads/profiles/' + req.file.filename;
    await Admin.findByIdAndUpdate(req.session.adminId, update);
    req.flash('success', 'Profile updated.');
    res.redirect('/admin/profile');
  } catch (err) {
    req.flash('error', 'Update failed.');
    res.redirect('/admin/profile');
  }
};

// ===================== ROOM MANAGEMENT =====================
exports.getRooms = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const rooms = await Room.find().populate('occupants', 'name email').sort({ roomNumber: 1 });
    res.render('admin/rooms', {
      title: 'Room Management',
      admin,
      rooms,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    res.redirect('/admin/dashboard');
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, floor, capacity, monthlyFee } = req.body;
    await Room.create({ roomNumber, floor, capacity, monthlyFee });
    req.flash('success', `Room ${roomNumber} created.`);
    res.redirect('/admin/rooms');
  } catch (err) {
    req.flash('error', 'Failed to create room. Room number may already exist.');
    res.redirect('/admin/rooms');
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { roomNumber, floor, capacity, status, monthlyFee } = req.body;
    await Room.findByIdAndUpdate(req.params.id, { roomNumber, floor, capacity, status, monthlyFee });
    req.flash('success', 'Room updated.');
    res.redirect('/admin/rooms');
  } catch (err) {
    req.flash('error', 'Update failed.');
    res.redirect('/admin/rooms');
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (room.occupants.length > 0) {
      req.flash('error', 'Cannot delete a room with occupants.');
      return res.redirect('/admin/rooms');
    }
    await Room.findByIdAndDelete(req.params.id);
    req.flash('success', 'Room deleted.');
    res.redirect('/admin/rooms');
  } catch (err) {
    req.flash('error', 'Delete failed.');
    res.redirect('/admin/rooms');
  }
};

// ===================== ALLOCATION =====================
exports.getAllocate = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const waitingUsers = await User.find({ roomStatus: 'Waiting' });
    const availableRooms = await Room.find({ status: 'Available' }).populate('occupants', 'name');

    res.render('admin/allocate', {
      title: 'Room Allocation',
      admin,
      waitingUsers,
      availableRooms: availableRooms.filter((r) => r.occupants.length < r.capacity),
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    res.redirect('/admin/dashboard');
  }
};

// Manual allocation
exports.manualAllocate = async (req, res) => {
  try {
    const { userId, roomId } = req.body;
    const user = await User.findById(userId);
    const room = await Room.findById(roomId);

    if (!room || room.occupants.length >= room.capacity) {
      req.flash('error', 'Room is full or not found.');
      return res.redirect('/admin/allocate');
    }

    room.occupants.push(userId);
    if (room.occupants.length >= room.capacity) room.status = 'Full';
    await room.save();

    user.roomId = room._id;
    user.roomStatus = 'Allocated';
    await user.save();

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    await Fee.create({ userId: user._id, roomId: room._id, amount: room.monthlyFee, dueDate });

    await Notification.create({
      title: 'Room Allocated by Admin',
      message: `You have been manually allocated Room ${room.roomNumber}.`,
      type: 'system',
    });

    req.flash('success', `${user.name} allocated to Room ${room.roomNumber}.`);
    res.redirect('/admin/allocate');
  } catch (err) {
    req.flash('error', 'Allocation failed.');
    res.redirect('/admin/allocate');
  }
};

// Auto allocate all waiting users
exports.autoAllocate = async (req, res) => {
  try {
    const waitingUsers = await User.find({ roomStatus: 'Waiting' });
    let allocated = 0;

    for (const user of waitingUsers) {
      const bestRoom = await findBestRoom(user);
      if (bestRoom) {
        bestRoom.occupants.push(user._id);
        if (bestRoom.occupants.length >= bestRoom.capacity) bestRoom.status = 'Full';
        await bestRoom.save();

        user.roomId = bestRoom._id;
        user.roomStatus = 'Allocated';
        await user.save();

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        await Fee.create({ userId: user._id, roomId: bestRoom._id, amount: bestRoom.monthlyFee, dueDate });
        allocated++;
      }
    }

    req.flash('success', `Auto-allocation complete. ${allocated} student(s) allocated.`);
    res.redirect('/admin/allocate');
  } catch (err) {
    req.flash('error', 'Auto-allocation failed.');
    res.redirect('/admin/allocate');
  }
};

// ===================== PAYMENTS =====================
exports.getPayments = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const fees = await Fee.find()
      .populate('userId', 'name email')
      .populate('roomId', 'roomNumber')
      .sort({ createdAt: -1 });

    // Auto-apply late fees
    for (const fee of fees) {
      if (fee.status === 'Pending' && fee.dueDate < new Date() && fee.lateFee === 0) {
        fee.lateFee = Math.round(fee.amount * 0.1);
        await fee.save();
      }
    }

    res.render('admin/payments', {
      title: 'Payment Management',
      admin,
      fees,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    res.redirect('/admin/dashboard');
  }
};

// ===================== SEARCH =====================
exports.getSearch = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const { q } = req.query;
    let results = [];

    if (q) {
      const roomsByNumber = await Room.find({
        roomNumber: { $regex: q, $options: 'i' },
      });
      const roomIds = roomsByNumber.map((r) => r._id);

      results = await User.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { roomId: { $in: roomIds } },
        ],
      }).populate('roomId', 'roomNumber floor');
    }

    res.render('admin/search', {
      title: 'Student Search',
      admin,
      results,
      query: q || '',
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    res.redirect('/admin/dashboard');
  }
};
