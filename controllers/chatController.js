// ============================================================
// Chat Controller — Polling-based roommate chat
// ============================================================
const Chat = require('../models/Chat');
const User = require('../models/User');
const Room = require('../models/Room');

// GET /chat
exports.getChat = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('roomId');

    if (user.roomStatus !== 'Allocated' || !user.roomId) {
      req.flash('error', 'Chat is only available after room allocation.');
      return res.redirect('/dashboard');
    }

    const roomId = user.roomId._id;

    // Get roommates
    const room = await Room.findById(roomId).populate('occupants', 'name profileImage');
    const roommates = room.occupants.filter(
      (o) => o._id.toString() !== req.session.userId.toString()
    );

    // Get last 50 messages
    const messages = await Chat.find({ roomId })
      .populate('sender', 'name profileImage')
      .sort({ timestamp: 1 })
      .limit(50);

    res.render('user/chat', {
      title: 'Roommate Chat',
      user,
      room,
      roommates,
      messages,
      errors: req.flash('error'),
      success: req.flash('success'),
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

// POST /chat/send
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const user = await User.findById(req.session.userId);

    if (user.roomStatus !== 'Allocated' || !user.roomId) {
      return res.status(403).json({ success: false, message: 'Not allocated.' });
    }

    const chat = await Chat.create({
      roomId: user.roomId,
      sender: req.session.userId,
      message: message.trim(),
    });

    const populated = await Chat.findById(chat._id).populate('sender', 'name profileImage');

    res.json({ success: true, chat: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// GET /chat/messages (polling)
exports.getMessages = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user.roomId) return res.json({ messages: [] });

    const since = req.query.since ? new Date(req.query.since) : new Date(0);

    const messages = await Chat.find({
      roomId: user.roomId,
      timestamp: { $gt: since },
    })
      .populate('sender', 'name profileImage')
      .sort({ timestamp: 1 });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ messages: [] });
  }
};
