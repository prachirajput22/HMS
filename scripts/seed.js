// ============================================================
// Seed Script — Create default admin and rooms
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const Admin = require('../models/Admin');
const Room = require('../models/Room');

const seed = async () => {
  await connectDB();

  // --- Seed Admin ---
  const existingAdmin = await Admin.findOne({ email: 'admin@mits.com' });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash('admin123', 10);
    await Admin.create({
      name: 'Super Admin',
      email: 'admin@mits.com',
      password: hashed,
      phone: '9876543210',
    });
    console.log('✅ Admin created: admin@mits.com / admin123');
  } else {
    console.log('ℹ️  Admin already exists.');
  }

  // --- Seed Rooms ---
  const roomCount = await Room.countDocuments();
  if (roomCount === 0) {
    const rooms = [];
    // Floor 1: Rooms 101-110
    for (let i = 1; i <= 10; i++) {
      rooms.push({ roomNumber: `1${String(i).padStart(2, '0')}`, floor: 1, capacity: 2, monthlyFee: 5000 });
    }
    // Floor 2: Rooms 201-210
    for (let i = 1; i <= 10; i++) {
      rooms.push({ roomNumber: `2${String(i).padStart(2, '0')}`, floor: 2, capacity: 2, monthlyFee: 5500 });
    }
    // Floor 3: Rooms 301-305 (triple occupancy)
    for (let i = 1; i <= 5; i++) {
      rooms.push({ roomNumber: `3${String(i).padStart(2, '0')}`, floor: 3, capacity: 3, monthlyFee: 4000 });
    }
    // Floor 4: Rooms 401-405 (single occupancy, premium)
    for (let i = 1; i <= 5; i++) {
      rooms.push({ roomNumber: `4${String(i).padStart(2, '0')}`, floor: 4, capacity: 1, monthlyFee: 8000 });
    }
    await Room.insertMany(rooms);
    console.log(`✅ ${rooms.length} rooms seeded.`);
  } else {
    console.log(`ℹ️  Rooms already exist (${roomCount} found).`);
  }

  console.log('🎉 Seed complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
