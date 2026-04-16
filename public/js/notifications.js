// ============================================================
// notifications.js — Client-side AJAX polling + mark-read logic
// ============================================================

// Mark single notification as read
async function markRead(id) {
  try {
    const res = await fetch('/notifications/read/' + id, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.classList.remove('unread');
        el.classList.add('read');
        const title = el.querySelector('.notif-title');
        if (title) { title.style.fontWeight = ''; title.style.color = ''; }
      }
      refreshBadge();
    }
  } catch (e) { /* silent */ }
}

// Mark all as read
async function markAllRead() {
  try {
    await fetch('/notifications/read-all', { method: 'POST' });
    document.querySelectorAll('.notif-item.unread').forEach(el => {
      el.classList.remove('unread');
      el.classList.add('read');
      const title = el.querySelector('.notif-title');
      if (title) { title.style.fontWeight = ''; title.style.color = ''; }
    });
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
  } catch (e) { /* silent */ }
}

// Refresh unread badge count via AJAX
async function refreshBadge() {
  try {
    const res = await fetch('/api/notifications/poll');
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById('notifBadge');
    if (badge) {
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount;
        badge.style.display = '';
        badge.classList.add('bounce');
        setTimeout(() => badge.classList.remove('bounce'), 400);
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) { /* silent */ }
}

// Poll every 15 seconds to refresh the unread badge
setInterval(refreshBadge, 15000);
