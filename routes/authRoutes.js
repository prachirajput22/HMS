// ============================================================
// Auth Routes — User and Admin authentication
// ============================================================
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest, isAdminGuest } = require('../middleware/authMiddleware');
const { uploadProfile } = require('../middleware/uploadMiddleware');

// User auth
router.get('/register', isGuest, authController.getRegister);
router.post('/register', isGuest, uploadProfile.single('profileImage'), authController.postRegister);
router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, authController.postLogin);
router.get('/logout', authController.logout);

module.exports = router;
