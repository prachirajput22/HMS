# MITS Hostel Room Allocation & Fee Management System

> **Madhav Institute of Technology and Science** — A production-ready hostel management platform with intelligent automation, scalable architecture, and a premium futuristic UI.

---

## 🚀 Features

### Student Features
- **Smart Room Allocation** — Preference-based roommate matching (sleep schedule, food, lifestyle)
- **Fee Management** — View payments, auto late-fee calculation, simulated payment
- **Complaint System** — Public complaints with voting + private complaints with room change requests
- **Roommate Chat** — WhatsApp-style polling-based messaging between roommates
- **Feedback** — Star rating system for hostel experience
- **Notifications** — Real-time notification bell with read tracking
- **Profile Management** — Photo upload, preference editing

### Admin Features
- **Dashboard** — Stats, charts (Chart.js), revenue tracking
- **Room Management** — CRUD operations with occupancy tracking
- **Smart Allocation** — Auto-allocate all waiting students or manual assignment
- **Payment Tracking** — View all fees, auto late-fee application
- **Complaint Management** — Status updates, room change request handling
- **Attendance** — Daily bulk attendance marking
- **Notifications** — Broadcast announcements to all users
- **Feedback Analysis** — Average ratings and all responses
- **Student Search** — Search by name, email, or room number

### UI/UX Highlights
- **Glassmorphism + Neumorphism** hybrid design
- **Dark Mode** with smooth transitions (localStorage persistence)
- **Floating card animations** (antigravity effect)
- **Responsive design** — Mobile-first with collapsible sidebar
- **Micro-interactions** — Hover lift, glow effects, ripple animations
- **Background blobs** with animated gradients

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | EJS, HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | express-session, bcryptjs |
| Flash | connect-flash |
| Upload | Multer |
| Charts | Chart.js |
| Fonts | Inter (Google Fonts) |
| Icons | Font Awesome 6 |

---

## 📁 Project Structure

```
hostelMS/
├── app.js                    # Main application entry
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── authController.js     # User & Admin auth
│   ├── userController.js     # Dashboard, profile, room, payment
│   ├── adminController.js    # Admin dashboard, rooms, allocation
│   ├── complaintController.js
│   ├── chatController.js
│   ├── feedbackController.js
│   ├── attendanceController.js
│   └── notificationController.js
├── middleware/
│   ├── authMiddleware.js     # Session guards
│   └── uploadMiddleware.js   # Multer config
├── models/
│   ├── User.js, Room.js, Admin.js
│   ├── Fee.js, Complaint.js, Chat.js
│   ├── Feedback.js, Attendance.js
│   └── Notification.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   └── adminRoutes.js
├── utils/
│   └── smartMatch.js         # Roommate matching algorithm
├── public/
│   ├── css/style.css         # Complete design system
│   ├── js/main.js            # Client-side interactions
│   └── uploads/              # Uploaded images
├── views/
│   ├── partials/             # header, footer, sidebar, topbar
│   ├── auth/                 # login, register
│   ├── user/                 # dashboard, profile, room, payment, complaint, chat, feedback
│   ├── admin/                # dashboard, profile, rooms, allocate, payments, complaints, attendance, notifications, feedback, search, login
│   ├── landing.ejs
│   ├── 404.ejs
│   └── error.ejs
├── scripts/
│   └── seed.js               # Database seeder
├── .env
└── package.json
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or MongoDB Atlas)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Seed the database (creates admin + rooms)
npm run seed

# 3. Start the server
npm run dev
```


## 🎯 Routes

### User Routes
| Route | Description |
|-------|-----------|
| `/` | Landing page |
| `/register` | Student registration |
| `/login` | Student login |
| `/dashboard` | Student dashboard |
| `/profile` | Profile management |
| `/request-room` | Room allocation |
| `/payment` | Fee & payment |
| `/complaint` | Complaints |
| `/chat` | Roommate chat |
| `/feedback` | Feedback form |

### Admin Routes
| Route | Description |
|-------|-----------|
| `/admin/login` | Admin login |
| `/admin/dashboard` | Admin dashboard |
| `/admin/rooms` | Room management |
| `/admin/allocate` | Room allocation |
| `/admin/payments` | Payment tracking |
| `/admin/complaints` | Complaint management |
| `/admin/attendance` | Attendance marking |
| `/admin/notifications` | Broadcast notifications |
| `/admin/feedback` | Feedback analysis |
| `/admin/search` | Student search |

---

## 📄 License

MIT License — Built for MITS Hostel Management.
