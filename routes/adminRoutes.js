// ============================================================
// Admin Routes — All admin/warden routes
// ============================================================
const express = require('express');
const router = express.Router();
const { isAdmin, isAdminGuest } = require('../middleware/authMiddleware');
const { uploadProfile } = require('../middleware/uploadMiddleware');

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const complaintController = require('../controllers/complaintController');
const attendanceController = require('../controllers/attendanceController');
const notificationController = require('../controllers/notificationController');
const feedbackController = require('../controllers/feedbackController');

// Admin Root Redirect
router.get('/', (req, res) => res.redirect('/admin/login'));

// Admin Auth (no isAdmin guard — user is logging in)
router.get('/login', isAdminGuest, authController.getAdminLogin);
router.post('/login', isAdminGuest, authController.postAdminLogin);
router.get('/logout', authController.adminLogout);

// Dashboard
router.get('/dashboard', isAdmin, adminController.getDashboard);

// Profile
router.get('/profile', isAdmin, adminController.getProfile);
router.post('/profile', isAdmin, uploadProfile.single('profileImage'), adminController.updateProfile);

// Rooms
router.get('/rooms', isAdmin, adminController.getRooms);
router.post('/rooms', isAdmin, adminController.createRoom);
router.post('/rooms/:id/update', isAdmin, adminController.updateRoom);
router.post('/rooms/:id/delete', isAdmin, adminController.deleteRoom);

// Allocation
router.get('/allocate', isAdmin, adminController.getAllocate);
router.get('/allocate/suggestions', isAdmin, adminController.getAllocateSuggestions);
router.post('/allocate/manual', isAdmin, adminController.manualAllocate);
router.post('/allocate/auto', isAdmin, adminController.autoAllocate);
router.post('/allocate', isAdmin, adminController.runSmartAllocation); // New route
router.post('/allocate/reassign', isAdmin, adminController.reassignRoom);

// Payments
router.get('/payments', isAdmin, adminController.getPayments);

// Complaints
router.get('/complaints', isAdmin, complaintController.adminGetComplaints);
router.post('/complaints/:id/status', isAdmin, complaintController.updateComplaintStatus);
router.post('/complaints/:id/room-change', isAdmin, complaintController.handleRoomChange);

// Attendance
router.get('/attendance', isAdmin, attendanceController.getAttendance);
router.post('/attendance', isAdmin, attendanceController.markAttendance);

// Notifications
router.get('/notifications', isAdmin, notificationController.getNotifications);
router.post('/notifications', isAdmin, notificationController.sendNotification);
router.post('/notifications/:id/delete', isAdmin, notificationController.deleteNotification);

// Feedback
router.get('/feedback', isAdmin, feedbackController.adminGetFeedback);
router.post('/feedback/:id/delete', isAdmin, feedbackController.deleteFeedback);

// Search
router.get('/search', isAdmin, adminController.getSearch);

module.exports = router;
