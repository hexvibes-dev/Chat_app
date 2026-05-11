import { playNotification } from '../Sounds/soundManager.js';

let notificationElement = null;
let notificationTimeout = null;
let currentCallback = null;
let isVisible = false;

function getKeyboardHeight() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
}

function getPickerHeight() {
  const container = document.getElementById('mobile-picker-container');
  if (!container || !container.classList.contains('open')) return 0;
  return 400;
}

function getEffectiveBottomOffset() {
  return getKeyboardHeight() + getPickerHeight();
}

function updateNotificationPosition(keepIfVisible = false) {
  if (!notificationElement) return;
  
  const effectiveOffset = getEffectiveBottomOffset();
  const extraBottom = effectiveOffset;
  const newBottom = `calc(60px + ${extraBottom}px + 10px)`;
  
  notificationElement.style.transition = 'bottom 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
  notificationElement.style.bottom = newBottom;
  
  if (keepIfVisible && !isVisible) {
    notificationElement.classList.add('visible');
    isVisible = true;
  }
}

function createNotificationElementIfNeeded() {
  if (notificationElement) return notificationElement;
  
  notificationElement = document.querySelector('.transient-notif');
  if (!notificationElement) {
    notificationElement = document.createElement('div');
    notificationElement.className = 'transient-notif';
    document.body.appendChild(notificationElement);
  }
  
  updateNotificationPosition();
  return notificationElement;
}

export function showNotification(text, duration = 2000, onTimeout = null) {
  const el = createNotificationElementIfNeeded();
  
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
  
  if (currentCallback && typeof currentCallback === 'function') {
    try { currentCallback(); } catch(e) {}
    currentCallback = null;
  }
  
  el.textContent = text;
  el.classList.add('visible');
  isVisible = true;
  updateNotificationPosition(true);
  
  playNotification();
  
  currentCallback = onTimeout;
  
  notificationTimeout = setTimeout(() => {
    hideNotification();
  }, duration);
}

export function hideNotification() {
  if (!notificationElement) return;
  
  notificationElement.classList.remove('visible');
  isVisible = false;
  
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
  
  if (currentCallback && typeof currentCallback === 'function') {
    const callback = currentCallback;
    currentCallback = null;
    callback();
  }
}

export function showPersistentNotification(text, buttons = []) {
  const el = createNotificationElementIfNeeded();
  
  if (notificationTimeout) clearTimeout(notificationTimeout);
  
  el.innerHTML = `
    <span class="notification-text">${escapeHtml(text)}</span>
    ${buttons.length ? `<div class="notif-buttons">${buttons.map(btn => `<button class="notif-btn" data-action="${btn.action}">${escapeHtml(btn.label)}</button>`).join('')}</div>` : ''}
  `;
  el.classList.add('visible');
  isVisible = true;
  updateNotificationPosition(true);
  
  playNotification();
  
  if (buttons.length) {
    el.querySelectorAll('.notif-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const found = buttons.find(b => b.action === action);
        if (found && found.onClick) found.onClick();
        hideNotification();
      });
    });
  }
  
  return () => hideNotification();
}

export function updateNotificationPositionOnEvent() {
  if (isVisible && notificationElement) {
    updateNotificationPosition(true);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.addEventListener('keyboardchange', () => updateNotificationPositionOnEvent());
window.addEventListener('resize', () => updateNotificationPositionOnEvent());
window.addEventListener('picker-opened', () => updateNotificationPositionOnEvent());
window.addEventListener('picker-closed', () => updateNotificationPositionOnEvent());
window.addEventListener('update-floating-elements', () => updateNotificationPositionOnEvent());