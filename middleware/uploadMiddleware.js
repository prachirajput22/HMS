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

// File filter for Profiles: jpg/png/webp
const profileFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed for profiles.'), false);
  }
};

// File filter for Complaints: STRICTLY jpg/png
const complaintFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG and PNG images are allowed for complaints.'), false);
  }
};

const profileLimits = { fileSize: 5 * 1024 * 1024 }; // 5MB
const complaintLimits = { fileSize: 2 * 1024 * 1024 }; // 2MB

const uploadProfile = multer({ storage: profileStorage, fileFilter: profileFileFilter, limits: profileLimits });
const uploadComplaint = multer({ storage: complaintStorage, fileFilter: complaintFileFilter, limits: complaintLimits });

module.exports = { uploadProfile, uploadComplaint };
