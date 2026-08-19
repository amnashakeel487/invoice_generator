/**
 * app.js — Tab Router & Global Utilities
 * Handles navigation, toast notifications, and shared state.
 */

// ── Tab Router ────────────────────────────────────────────────
const navBtns   = document.querySelectorAll('.nav-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function showTab(tabId) {
  tabPanels.forEach(p => p.classList.remove('active'));
  navBtns.forEach(b => b.classList.remove('active'));

  const panel = document.getElementById(`tab-${tabId}`);
  const btn   = document.querySelector(`[data-tab="${tabId}"]`);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');

  // Trigger tab-specific refresh
  if (tabId === 'history' && typeof refreshHistory === 'function') refreshHistory();
  if (tabId === 'settings' && typeof loadSettings === 'function') loadSettings();
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// ── Toast Notifications ───────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2800);
}

// ── Confirm Dialog (native) ───────────────────────────────────
function confirmAction(msg) {
  return confirm(msg);
}
