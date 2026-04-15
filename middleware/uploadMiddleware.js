// ============================================================
// Upload Middleware — Multer configuration for file uploads
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir('public/uploads/profiles');
ensureDir('public/uploads/complaints');

// ----- Profile image storage -----
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/profiles/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + unique + path.extname(file.originalname));
  },
});

// ----- Complaint image storage -----
const complaintStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/complaints/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'complaint-' + unique + path.extname(file.originalname));
  },
});

// File filter: jpg/png only
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed.'), false);
  }
};

const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

const uploadProfile = multer({ storage: profileStorage, fileFilter, limits });
const uploadComplaint = multer({ storage: complaintStorage, fileFilter, limits });

module.exports = { uploadProfile, uploadComplaint };
