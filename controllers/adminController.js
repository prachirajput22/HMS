
// Admin Controller — Dashboard, Profile, Rooms, Allocation, Payments, Search

const Admin = require('../models/Admin');
const User = require('../models/User');
const Room = require('../models/Room');
const Fee = require('../models/Fee');
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const { findBestRoom, getRoomSuggestions, calculateMatchScore, compatibilityPercentage } = require('../utils/smartMatch');

// ===================== DASHBOARD =====================
exports.getDashboard = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);

    const [totalStudents, totalRooms, waitingUsers, pendingFees, paidFees, openComplaints] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      User.find({ roomStatus: 'Waiting' }),
      Fee.countDocuments({ status: 'Pending' }),
      Fee.countDocuments({ status: 'Paid' }),
      Complaint.countDocuments({ status: 'Open' }),
    ]);

    const waitingCount = waitingUsers.length;

    const rooms = await Room.find().populate('occupants', 'name email preferences matchScore');
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
      waitingUsers,
      roomsWithOccupants: rooms,
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
    const rooms = await Room.find().populate('occupants', 'name email preferences').sort({ roomNumber: 1 });

    const stats = {
      total: rooms.length,
      available: rooms.filter((r) => r.status === 'Available' && r.occupants.length < r.capacity).length,
      full: rooms.filter((r) => r.status === 'Full').length,
      maintenance: rooms.filter((r) => r.status === 'Maintenance').length,
    };

    const roomsData = rooms.map(room => {
      const rData = room.toObject();
      if (rData.occupants && rData.occupants.length > 1) {
        let totalPairs = 0;
        let totalScore = 0;
        for (let i = 0; i < rData.occupants.length; i++) {
          for (let j = i + 1; j < rData.occupants.length; j++) {
            if (rData.occupants[i].preferences && rData.occupants[j].preferences) {
              totalScore += compatibilityPercentage(rData.occupants[i].preferences, rData.occupants[j].preferences);
              totalPairs++;
            }
          }
        }
        rData.matchPercentage = totalPairs > 0 ? Math.round(totalScore / totalPairs) : null;
      } else {
        rData.matchPercentage = null;
      }
      return rData;
    });

    res.render('admin/rooms', {
      title: 'Room Management',
      admin,
      rooms: roomsData,
      stats,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    res.redirect('/admin/dashboard');
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, floor, block, type, capacity, monthlyFee, amenities } = req.body;
    const amenitiesArr = amenities ? amenities.split(',').map((a) => a.trim()).filter(Boolean) : [];
    await Room.create({ roomNumber, floor: Number(floor), block, type, capacity: Number(capacity), monthlyFee: Number(monthlyFee), amenities: amenitiesArr });
    req.flash('success', `Room ${roomNumber} created.`);
    res.redirect('/admin/rooms');
  } catch (err) {
    req.flash('error', 'Failed to create room. Room number may already exist.');
    res.redirect('/admin/rooms');
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { roomNumber, floor, block, type, capacity, status, monthlyFee, amenities } = req.body;
    const amenitiesArr = amenities ? amenities.split(',').map((a) => a.trim()).filter(Boolean) : [];
    await Room.findByIdAndUpdate(req.params.id, {
      roomNumber, floor: Number(floor), block, type, capacity: Number(capacity), status, monthlyFee: Number(monthlyFee), amenities: amenitiesArr,
    });
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
    const availableRooms = await Room.find({ status: 'Available' }).populate('occupants', 'name preferences');

    const filteredRooms = availableRooms.filter((r) => r.occupants.length < r.capacity);

    // Pre-compute top-3 suggestions per waiting student
    const suggestions = {};
    for (const user of waitingUsers) {
      const scored = getRoomSuggestions(user, availableRooms).slice(0, 3);
      suggestions[user._id.toString()] = scored.map((s) => ({
        roomId:     s.room._id,
        roomNumber: s.room.roomNumber,
        floor:      s.room.floor,
        block:      s.room.block,
        type:       s.room.type,
        occupancy:  `${s.room.occupants.length}/${s.room.capacity}`,
        monthlyFee: s.room.monthlyFee,
        percentage: s.score.percentage,
        matched:    s.score.matched,
        unmatched:  s.score.unmatched,
        emptyRoom:  s.score.emptyRoom,
      }));
    }

    res.render('admin/allocate', {
      title: 'Room Allocation',
      admin,
      waitingUsers,
      availableRooms: filteredRooms,
      suggestions: JSON.stringify(suggestions),
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};

// AJAX: Get suggestions for a single student (used by allocate page JS)
exports.getAllocateSuggestions = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ suggestions: [] });

    const user = await User.findById(userId);
    if (!user) return res.json({ suggestions: [] });

    const availableRooms = await Room.find({ status: 'Available' }).populate('occupants', 'name preferences');
    const scored = getRoomSuggestions(user, availableRooms).slice(0, 5);

    const suggestions = scored.map((s) => ({
      roomId:     s.room._id,
      roomNumber: s.room.roomNumber,
      floor:      s.room.floor,
      block:      s.room.block,
      type:       s.room.type,
      occupancy:  `${s.room.occupants.length}/${s.room.capacity}`,
      monthlyFee: s.room.monthlyFee,
      percentage: s.score.percentage,
      matched:    s.score.matched,
      unmatched:  s.score.unmatched,
      emptyRoom:  s.score.emptyRoom,
    }));

    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.json({ suggestions: [] });
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

    // Targeted personal notifications
    await Notification.create({
      userId: user._id,
      title: '🏠 Room Allocated',
      message: `You have been allocated Room ${room.roomNumber} (Floor ${room.floor}). Your monthly fee is ₹${room.monthlyFee}.`,
      type: 'system',
    });
    await Notification.create({
      userId: user._id,
      title: '💰 Fee Generated',
      message: `Your hostel fee of ₹${room.monthlyFee} has been generated with due date ${dueDate.toLocaleDateString('en-IN')}.`,
      type: 'payment',
    });

    req.flash('success', `${user.name} allocated to Room ${room.roomNumber}.`);
    res.redirect('/admin/allocate');
  } catch (err) {
    req.flash('error', 'Allocation failed.');
    res.redirect('/admin/allocate');
  }
};

// Reassign a student to a different room
exports.reassignRoom = async (req, res) => {
  try {
    const { userId, roomId } = req.body;
    const user = await User.findById(userId).populate('roomId');
    const newRoom = await Room.findById(roomId);

    if (!user || !newRoom || newRoom.occupants.length >= newRoom.capacity) {
      req.flash('error', 'Invalid reassignment: room full or not found.');
      return res.redirect('/admin/allocate');
    }

    // Remove from old room
    if (user.roomId) {
      await Room.findByIdAndUpdate(user.roomId._id, {
        $pull: { occupants: user._id },
        $set: { status: 'Available' },
      });
    }

    // Add to new room
    newRoom.occupants.push(user._id);
    if (newRoom.occupants.length >= newRoom.capacity) newRoom.status = 'Full';
    await newRoom.save();

    user.roomId = newRoom._id;
    user.roomStatus = 'Allocated';
    await user.save();

    await Notification.create({
      userId: user._id,
      title: 'Room Reassigned',
      message: `You have been reassigned to Room ${newRoom.roomNumber}.`,
      type: 'system',
    });

    req.flash('success', `${user.name} reassigned to Room ${newRoom.roomNumber}.`);
    res.redirect('/admin/allocate');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Reassignment failed.');
    res.redirect('/admin/allocate');
  }
};

// Auto allocate all waiting users (Legacy AI)
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

        await Notification.create({
          userId: user._id,
          title: '🏠 Room Allocated',
          message: `Great news! You have been allocated Room ${bestRoom.roomNumber} (Floor ${bestRoom.floor}).`,
          type: 'system',
        });
        await Notification.create({
          userId: user._id,
          title: '💰 Fee Generated',
          message: `Your hostel fee of ₹${bestRoom.monthlyFee} is due by ${dueDate.toLocaleDateString('en-IN')}.`,
          type: 'payment',
        });
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

// ===================== CORE SMART ALLOCATION ENGINE =====================
exports.executeSmartAllocation = async () => {
  let waitingUsers = await User.find({ roomStatus: 'Waiting' });
  const availableRooms = await Room.find({ status: 'Available' });
  let allocatedList = [];

  const getMatchScore = (uPrefs, oPrefs) => {
    let sc = 0;
    if (uPrefs.sleepSchedule === oPrefs.sleepSchedule) sc++;
    if (uPrefs.food === oPrefs.food) sc++;
    if (uPrefs.lifestyle === oPrefs.lifestyle) sc++;
    return sc;
  };

  const getRoomMutualScore = async (user, room) => {
    if (room.occupants.length === 0) return 3;
    let minScore = 3;
    for (let occId of room.occupants) {
      const occ = await User.findById(occId);
      if(!occ) continue;
      const sc = getMatchScore(user.preferences, occ.preferences);
      if (sc < minScore) minScore = sc;
    }
    return minScore;
  };

  const fillPartiallyWithScore = async (minScore) => {
    for (let room of availableRooms) {
      if (room.occupants.length >= room.capacity) continue;
      if (minScore === 3 && room.occupants.length === 0) continue; 

      for (let i = waitingUsers.length - 1; i >= 0; i--) {
        if (room.occupants.length >= room.capacity) break;
        const user = waitingUsers[i];
        const sc = await getRoomMutualScore(user, room);
        if (sc >= minScore) {
          room.occupants.push(user._id);
          allocatedList.push({ user, room });
          waitingUsers.splice(i, 1);
        }
      }
    }
  };

  const groupByPrefs = (users) => {
    const groups = {};
    users.forEach(u => {
      const hash = `${u.preferences.sleepSchedule}|${u.preferences.food}|${u.preferences.lifestyle}`;
      if (!groups[hash]) groups[hash] = [];
      groups[hash].push(u);
    });
    return Object.values(groups).sort((a,b) => b.length - a.length);
  };

  // PASS 1: Score 3 on partially filled rooms
  await fillPartiallyWithScore(3);

  // PASS 2: Score 3 clustering into completely empty rooms
  for (let room of availableRooms) {
    if (room.occupants.length > 0) continue; 
    let groups = groupByPrefs(waitingUsers);
    if (groups.length === 0) break;

    let bestGroup = groups[0];
    while (room.occupants.length < room.capacity && bestGroup.length > 0) {
      let user = bestGroup.pop();
      room.occupants.push(user._id);
      allocatedList.push({ user, room });
      waitingUsers = waitingUsers.filter(u => u._id.toString() !== user._id.toString());
    }
  }

  // PASS 3: Score >= 2 partial filling on ALL remaining slots
  await fillPartiallyWithScore(2);

  // Database Commits
  for (let room of availableRooms) {
    if (room.isModified('occupants')) {
      room.status = room.occupants.length >= room.capacity ? 'Full' : 'Available';
      await room.save();
    }
  }

  for (let record of allocatedList) {
    let u = record.user;
    u.roomId = record.room._id;
    u.roomStatus = 'Allocated';
    await u.save();
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    await Fee.create({ userId: u._id, roomId: record.room._id, amount: record.room.monthlyFee, dueDate });

    // Targeted notification per student
    await Notification.create({
      userId: u._id,
      title: '🏠 Room Allocated',
      message: `You have been successfully allocated Room ${record.room.roomNumber} (Floor ${record.room.floor}) via Smart Allocation.`,
      type: 'system',
    });
    await Notification.create({
      userId: u._id,
      title: '💰 Fee Generated',
      message: `Your hostel fee of ₹${record.room.monthlyFee} is due by ${dueDate.toLocaleDateString('en-IN')}. Pay on time to avoid late fees.`,
      type: 'payment',
    });
  }

  console.log(`[Algorithm Summary] Total Allocated: ${allocatedList.length} | Remainder Waitlisted: ${waitingUsers.length}`);
  return { allocatedList, remainingUsers: waitingUsers };
};

// ===================== RUN SMART ALLOCATION =====================
// Advanced Priority-Based Allocation Algorithm (Group Clustering)
exports.runSmartAllocation = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    
    // Execute abstracted helper
    let { allocatedList, remainingUsers } = await exports.executeSmartAllocation();

    // Render Detailed Summary
    res.render('admin/allocationSummary', {
      title: 'Smart Allocation Report',
      admin,
      allocatedList,
      remainingUsers,
      totalWaitCount: remainingUsers.length + allocatedList.length,
      errors: req.flash('error'),
      success: [{ msg: `Smart allocation complete! Accurately allocated ${allocatedList.length} user(s).` }]
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Critical Error during Allocation processing.');
    res.redirect('/admin/dashboard');
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

    let totalAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;

    for (const fee of fees) {
      if (fee.status === 'Pending' && fee.dueDate < new Date() && fee.lateFee === 0) {
        fee.lateFee = Math.round(fee.amount * 0.1);
        await fee.save();
      }

      if (fee.status === 'Paid') {
        paidCount++;
        totalAmount += fee.amount + fee.lateFee;
      } else {
        pendingCount++;
      }
    }

    res.render('admin/payments', {
      title: 'Payment Management',
      admin,
      fees,
      totalAmount,
      paidCount,
      pendingCount,
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

// ===================== MARK FEE AS PAID (Admin) =====================
exports.markFeePaid = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) {
      req.flash('error', 'Fee record not found.');
      return res.redirect('/admin/payments');
    }
    if (fee.status === 'Paid') {
      req.flash('error', 'This fee is already marked as paid.');
      return res.redirect('/admin/payments');
    }

    fee.status = 'Paid';
    fee.paidAt = new Date();
    await fee.save();

    await Notification.create({
      userId: fee.userId,
      title: '✅ Payment Confirmed by Admin',
      message: `Your hostel fee of ₹${fee.amount + fee.lateFee} has been confirmed by the administrator. Receipt ID: ${fee.receiptId}`,
      type: 'payment',
    });

    req.flash('success', `Fee marked as paid. Receipt: ${fee.receiptId}`);
    res.redirect('/admin/payments');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to mark fee as paid.');
    res.redirect('/admin/payments');
  }
};
