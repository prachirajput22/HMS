// ============================================================
// User Routes — All student-facing routes
// ============================================================
const express = require('express');
const router = express.Router();
const { isUser } = require('../middleware/authMiddleware');
const { uploadProfile, uploadComplaint } = require('../middleware/uploadMiddleware');

const userController = require('../controllers/userController');
const complaintController = require('../controllers/complaintController');
const chatController = require('../controllers/chatController');
const feedbackController = require('../controllers/feedbackController');

// Dashboard
router.get('/dashboard', isUser, userController.getDashboard);

// Profile
router.get('/profile', isUser, userController.getProfile);
router.post('/profile', isUser, uploadProfile.single('profileImage'), userController.updateProfile);

// Room
router.get('/request-room', isUser, userController.getRoomRequest);
router.post('/request-room', isUser, userController.postRoomRequest);

// Payment
router.get('/payment', isUser, userController.getPayment);
router.post('/payment', isUser, userController.postPayment);

// Complaints
router.get('/complaint', isUser, complaintController.getComplaints);
router.post('/complaint', isUser, uploadComplaint.single('image'), complaintController.postComplaint);
router.post('/complaint/:id/vote', isUser, complaintController.voteComplaint);

// Chat
router.get('/chat', isUser, chatController.getChat);
router.post('/chat/send', isUser, chatController.sendMessage);
router.get('/chat/messages', isUser, chatController.getMessages);

// Feedback
router.get('/feedback', isUser, feedbackController.getFeedback);
router.post('/feedback', isUser, feedbackController.postFeedback);

// Notification read
router.post('/notification/:notifId/read', isUser, userController.markNotificationRead);

module.exports = router;
