// src/scripts/scroll.js

export const SCROLL_THRESHOLD = 100;

window.isAtBottom = true;

export function updateIsAtBottom() {
  const messages = document.getElementById('messages');
  if (!messages) return;
  const distance = messages.scrollHeight - messages.clientHeight - messages.scrollTop;
  window.isAtBottom = distance <= SCROLL_THRESHOLD;
  messages.classList.toggle('not-at-bottom', !window.isAtBottom);
}

export function smoothScrollToBottom() {
  const messages = document.getElementById('messages');
  if (!messages) return;
  messages.classList.add('smooth-scroll');
  messages.scrollTop = messages.scrollHeight;
  clearTimeout(smoothScrollToBottom._t);
  smoothScrollToBottom._t = setTimeout(() => messages.classList.remove('smooth-scroll'), 300);
}
window.smoothScrollToBottom = smoothScrollToBottom;

export function ensureLastMessageVisible() {
  const messages = document.getElementById('messages');
  if (!messages) return;
  const lastMessage = messages.querySelector('.message:last-of-type');
  if (lastMessage) {
    lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
window.ensureLastMessageVisible = ensureLastMessageVisible;

export function ensureLastMessageAboveInput(keyboardHeight = 0) {
  const messages = document.getElementById('messages');
  if (!messages) return;
  const lastMessage = messages.querySelector('.message:last-of-type');
  if (!lastMessage) return;
  const containerRect = messages.getBoundingClientRect();
  const messageRect = lastMessage.getBoundingClientRect();
  const bottomOffset = containerRect.bottom - messageRect.bottom;
  if (bottomOffset < keyboardHeight + 20) {
    lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
window.ensureLastMessageAboveInput = ensureLastMessageAboveInput;
