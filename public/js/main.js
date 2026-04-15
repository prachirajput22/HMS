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

// ---------- Dark Mode Toggle ----------
function toggleDarkMode() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);

  // Update toggle icon
  const icon = document.querySelector('.dark-toggle i');
  if (icon) {
    icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// Restore saved theme
(function () {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
})();

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

function initChat(userId) {
  currentUserId = userId;
  scrollToBottom();
  // Start polling every 3 seconds
  chatPollingInterval = setInterval(pollMessages, 3000);
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

  const div = document.createElement('div');
  div.className = 'chat-msg ' + (isMe ? 'chat-msg-me' : 'chat-msg-other');

  const initial = msg.sender.name ? msg.sender.name.charAt(0).toUpperCase() : '?';
  const time = new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (!isMe) {
    const avatarHtml = msg.sender.profileImage
      ? '<img src="' + msg.sender.profileImage + '" alt="' + escapeHtml(msg.sender.name) + '" />'
      : '<span>' + initial + '</span>';
    div.innerHTML =
      '<div class="chat-avatar">' + avatarHtml + '</div>' +
      '<div class="chat-bubble-wrap">' +
      '<span class="chat-name">' + escapeHtml(msg.sender.name) + '</span>' +
      '<div class="chat-bubble">' + escapeHtml(msg.message) + '</div>' +
      '<span class="chat-time">' + time + '</span>' +
      '</div>';
  } else {
    div.innerHTML =
      '<div class="chat-bubble-wrap">' +
      '<div class="chat-bubble">' + escapeHtml(msg.message) + '</div>' +
      '<span class="chat-time">' + time + '</span>' +
      '</div>';
  }

  container.appendChild(div);
}

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

  // Update dark mode icon on load
  const theme = document.documentElement.getAttribute('data-theme');
  const icon = document.querySelector('.dark-toggle i');
  if (icon) {
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
});
