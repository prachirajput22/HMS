// ============================================================
// MITS Hostel Management — Main Client-Side JavaScript
// ============================================================

// ---------- Sidebar Toggle ----------
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('visible');
}





// ---------- Notification Dropdown ----------
function toggleNotifDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.notif-bell-wrapper')) {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.classList.remove('open');
  }
});

// ---------- Mark Notification Read ----------
function markRead(notifId) {
  fetch(`/notification/${notifId}/read`, { method: 'POST' })
    .then(() => {
      const item = document.querySelector(`.notif-item[data-id="${notifId}"]`);
      if (item) item.classList.replace('unread', 'read');

      const badge = document.querySelector('.notif-badge');
      if (badge) {
        const count = parseInt(badge.textContent) - 1;
        if (count <= 0) badge.remove();
        else badge.textContent = count;
      }
    })
    .catch(console.error);
}

// ---------- Image Preview ----------
function previewImage(input, previewId) {
  previewId = previewId || 'imagePreview';
  const preview = document.getElementById(previewId);
  if (!preview) return;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ---------- Tabs ----------
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));

  const content = document.getElementById('tab-' + tabId);
  if (content) content.classList.add('active');

  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach((btn) => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    }
  });
}

// ---------- Modals ----------
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function openEditModal(data) {
  document.getElementById('editRoomNumber').value = data.roomNumber;
  document.getElementById('editFloor').value = data.floor;
  document.getElementById('editCapacity').value = data.capacity;
  document.getElementById('editStatus').value = data.status;
  if (document.getElementById('editMonthlyFee')) {
    document.getElementById('editMonthlyFee').value = data.monthlyFee || 5000;
  }

  const form = document.getElementById('editRoomForm');
  if (form) form.action = '/admin/rooms/' + data.id + '/update';

  openModal('editRoomModal');
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ---------- Complaint Vote ----------
function voteComplaint(complaintId, btn) {
  fetch('/complaint/' + complaintId + '/vote', { method: 'POST' })
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        const countEl = btn.querySelector('.vote-count');
        if (countEl) countEl.textContent = data.voteCount;
        btn.classList.toggle('voted', data.voted);
      }
    })
    .catch(console.error);
}

// ---------- Complaint: Toggle Room Change Section ----------
function toggleRoomChange() {
  const typeSelect = document.getElementById('complaintType');
  const categorySelect = document.getElementById('complaintCategory');
  const section = document.getElementById('roomChangeSection');
  if (!typeSelect || !section) return;
  if (typeSelect.value === 'private' && categorySelect && categorySelect.value === 'Roommate Complaint') {
    section.classList.remove('hidden');
  } else {
    section.classList.add('hidden');
  }
}

// ---------- Lightbox ----------
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (lb && img) {
    img.src = src;
    lb.classList.remove('hidden');
  }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.add('hidden');
}

// ---------- Chat System (Polling) ----------
let lastTimestamp = new Date(0).toISOString();
let currentUserId = '';
let chatPollingInterval = null;

function timeAgo(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const seconds = Math.round((new Date() - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 30) return 'Just now';
  if (seconds < 60) return seconds + ' secs ago';
  if (minutes < 60) return minutes + ' mins ago';
  if (hours < 24) return hours + ' hours ago';
  if (days === 1) return 'Yesterday';
  return days + ' days ago';
}

function updateTimestamps() {
  document.querySelectorAll('.chat-time[data-timestamp]').forEach(el => {
    el.textContent = timeAgo(el.getAttribute('data-timestamp'));
  });
}

function initChat(userId, initialTimestamp) {
  currentUserId = userId;
  if (initialTimestamp) lastTimestamp = initialTimestamp;
  updateTimestamps();
  scrollToBottom();
  // Start polling every 3 seconds
  chatPollingInterval = setInterval(pollMessages, 3000);
  // Update timestamps every minute
  setInterval(updateTimestamps, 60000);
}

function scrollToBottom() {
  const container = document.getElementById('chatMessages');
  if (container) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim()) return;

  try {
    const resp = await fetch('/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.value.trim() }),
    });
    const data = await resp.json();
    if (data.success) {
      appendMessage(data.chat, true);
      input.value = '';
      if (data.chat.timestamp) lastTimestamp = data.chat.timestamp;
      scrollToBottom();
    }
  } catch (err) {
    console.error('Chat send error:', err);
  }
}

async function pollMessages() {
  try {
    const resp = await fetch('/chat/messages?since=' + encodeURIComponent(lastTimestamp));
    const data = await resp.json();
    if (data.messages && data.messages.length > 0) {
      data.messages.forEach((msg) => {
        if (msg.sender._id !== currentUserId) {
          appendMessage(msg, false);
        }
        lastTimestamp = msg.timestamp;
      });
      scrollToBottom();
    }
  } catch (err) {
    // Silently ignore polling errors
  }
}

function appendMessage(msg, isMe) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const emptyState = container.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const div = document.createElement('div');
  div.className = 'chat-msg ' + (isMe ? 'chat-msg-me' : 'chat-msg-other');

  const initial = msg.sender.name ? msg.sender.name.charAt(0).toUpperCase() : '?';
  const time = timeAgo(msg.timestamp);
  const timeAttr = 'data-timestamp="' + escapeHtml(msg.timestamp) + '"';

  if (!isMe) {
    const avatarHtml = msg.sender.profileImage
      ? '<img src="' + msg.sender.profileImage + '" alt="' + escapeHtml(msg.sender.name) + '" />'
      : '<span>' + initial + '</span>';
    div.innerHTML =
      '<div class="chat-avatar">' + avatarHtml + '</div>' +
      '<div class="chat-bubble-wrap">' +
      '<span class="chat-name">' + escapeHtml(msg.sender.name) + '</span>' +
      '<div class="chat-bubble">' + escapeHtml(msg.message) + '</div>' +
      '<span class="chat-time" ' + timeAttr + '>' + time + '</span>' +
      '</div>';
  } else {
    div.innerHTML =
      '<div class="chat-bubble-wrap">' +
      '<div class="chat-bubble">' + escapeHtml(msg.message) + '</div>' +
      '<span class="chat-time" ' + timeAttr + '>' + time + '</span>' +
      '</div>';
  }

  container.appendChild(div);
}

// Emoji Picker Toggle logic
function toggleEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  if (picker) picker.classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value += emoji;
    input.focus();
  }
}

// Hide emoji picker if clicked outside
document.addEventListener('click', (e) => {
  const picker = document.getElementById('emojiPicker');
  const btn = document.getElementById('emojiBtn');
  if (picker && !picker.classList.contains('hidden')) {
    if (!picker.contains(e.target) && (!btn || !btn.contains(e.target))) {
      picker.classList.add('hidden');
    }
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Animated Counters ----------
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.getAttribute('data-count'));
    let current = 0;
    const increment = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current.toLocaleString();
    }, 30);
  });
}

// ---------- Star Rating Interactive ----------
function initStarRating() {
  const stars = document.querySelectorAll('.star-rating label');
  stars.forEach((star) => {
    star.addEventListener('mouseenter', function () {
      this.style.transform = 'scale(1.2)';
    });
    star.addEventListener('mouseleave', function () {
      this.style.transform = 'scale(1)';
    });
  });
}

// ---------- Auto-dismiss Alerts ----------
document.addEventListener('DOMContentLoaded', () => {
  // Auto-dismiss alerts
  setTimeout(() => {
    document.querySelectorAll('.alert').forEach((el) => {
      el.style.transition = 'opacity .5s, transform .5s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      setTimeout(() => el.remove(), 500);
    });
  }, 5000);

  // Initialize counters
  animateCounters();

  // Initialize star rating
  initStarRating();



  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Theme Toggle Logic (Global)
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  
  // Set initial icon based on current class
  const isDark = document.documentElement.classList.contains('dark-mode');
  themeToggleBtns.forEach(btn => {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.remove(isDark ? 'fa-moon' : 'fa-sun');
      icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
    }
  });

  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark-mode');
      const currentlyDark = document.documentElement.classList.contains('dark-mode');
      
      if (currentlyDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }

      // Update all toggle buttons
      document.querySelectorAll('.theme-toggle-btn i').forEach(icon => {
        icon.classList.remove(currentlyDark ? 'fa-moon' : 'fa-sun');
        icon.classList.add(currentlyDark ? 'fa-sun' : 'fa-moon');
      });
    });
  });
});
