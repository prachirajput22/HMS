// ============================================================
// Attendance Controller — Daily attendance by admin
// ============================================================
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Admin = require('../models/Admin');

// GET /admin/attendance
exports.getAttendance = async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    const users = await User.find().sort({ name: 1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = await Attendance.find({
      date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
    });

    const markedIds = todayRecords.map((r) => r.userId.toString());

    // Recent attendance (last 7 days)
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const recentRecords = await Attendance.find({ date: { $gte: since } })
      .populate('userId', 'name')
      .sort({ date: -1 });

    res.render('admin/attendance', {
      title: 'Attendance Management',
      admin,
      users,
      todayRecords,
      markedIds,
      recentRecords,
      today: today.toISOString().split('T')[0],
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/attendance
exports.markAttendance = async (req, res) => {
  try {
    const { date, attendance } = req.body;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const ops = Object.entries(attendance || {}).map(([userId, status]) => ({
      updateOne: {
        filter: { userId, date: attendanceDate },
        update: { $set: { userId, date: attendanceDate, status, markedBy: req.session.adminId } },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }

    req.flash('success', `Attendance marked for ${Object.keys(attendance || {}).length} students.`);
    res.redirect('/admin/attendance');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to mark attendance.');
    res.redirect('/admin/attendance');
  }
};
