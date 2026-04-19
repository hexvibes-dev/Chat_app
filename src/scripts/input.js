// src/scripts/input.js
import { appendMessage } from './messages.js';
import { getAndClearQuotedMessage, hideReplyPopup } from './answer.js';
import { connectToBackend, sendMessageViaSocket, isSocketConnected, disconnectSocket } from './socket.js';

if (typeof window.isAtBottom === 'undefined') window.isAtBottom = true;
if (typeof window.smoothScrollToBottom !== 'function') window.smoothScrollToBottom = () => {};
if (typeof window.keyboardOpen === 'undefined') window.keyboardOpen = false;
if (typeof window.ensureLastMessageAboveInput !== 'function') window.ensureLastMessageAboveInput = () => {};

export const MAX_TEXTAREA_HEIGHT = 120;

export const input = document.getElementById('input');
export const sendBtn = document.getElementById('sendBtn');
export const layerInput = document.querySelector('.layer-input');

let editingMessageId = null;

export function adjustTextareaHeight() {
  if (!input) return;
  input.style.height = 'auto';
  const newH = Math.min(input.scrollHeight, MAX_TEXTAREA_HEIGHT);
  input.style.height = newH + 'px';
}

export function keepFocusOnInput() {
  if (!input) return;
  input.focus();
  const len = input.value.length;
  try { input.setSelectionRange(len, len); } catch (err) {}
}

let _notifEl = null;
let _notifT = null;
function showTransientNotification(text, duration = 1000) {
  if (!_notifEl) {
    _notifEl = document.createElement('div');
    _notifEl.className = 'transient-notif';
    document.body.appendChild(_notifEl);
  }
  _notifEl.textContent = text;
  _notifEl.classList.add('visible');
  if (_notifT) clearTimeout(_notifT);
  _notifT = setTimeout(() => {
    _notifEl.classList.remove('visible');
  }, duration);
}

export function sendMessageFromInput() {
  if (!input) return;
  const text = input.value.trim();

  if (text.startsWith('/connect')) {
    const parts = text.split(' ');
    const url = parts[1];
    if (!url) {
      showTransientNotification('Debes especificar una URL');
    } else {
      connectToBackend(url);
    }
    input.value = '';
    adjustTextareaHeight();
    return;
  }

  if (text === '/disconnect') {
    disconnectSocket();
    input.value = '';
    adjustTextareaHeight();
    return;
  }

  if (editingMessageId) {
    const msgEl = document.querySelector(`[data-msg-id="${editingMessageId}"]`);
    if (msgEl) {
      const textEl = msgEl.querySelector('.message-text');
      if (textEl) textEl.textContent = text;
      const hourEl = msgEl.querySelector('.msg-hour');
      if (hourEl) hourEl.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      showTransientNotification('Mensaje editado');
    }
    editingMessageId = null;
    input.value = '';
    adjustTextareaHeight();
    keepFocusOnInput();
    return;
  }

  if (!text) {
    keepFocusOnInput();
    return;
  }

  const quoted = getAndClearQuotedMessage ? getAndClearQuotedMessage() : null;
  const wasInputFocused = document.activeElement === input;

  if (isSocketConnected()) {
    const sent = sendMessageViaSocket(text, quoted);
    if (sent) {
      input.value = '';
      adjustTextareaHeight();
      if (typeof hideReplyPopup === 'function') hideReplyPopup();
      // Mantener el foco solo si ya lo tenía
      if (wasInputFocused) {
        keepFocusOnInput();
      }
    }
    return;
  }

  appendMessage(text, { me: true, replyTo: quoted || undefined });

  input.value = '';
  adjustTextareaHeight();
  if (typeof hideReplyPopup === 'function') hideReplyPopup();

  if (window.isAtBottom && typeof window.smoothScrollToBottom === 'function') {
    window.smoothScrollToBottom();
  }

  if (wasInputFocused) {
    keepFocusOnInput();
  }
  const kb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
  if (window.keyboardOpen && typeof window.ensureLastMessageAboveInput === 'function') {
    setTimeout(() => window.ensureLastMessageAboveInput(kb), 60);
  }
}

function onMessageEdit(e) {
  const id = e?.detail?.id;
  if (!id) return;
  const msgEl = document.querySelector(`[data-msg-id="${id}"]`);
  if (!msgEl) return;
  const textEl = msgEl.querySelector('.message-text');
  if (!textEl) return;
  editingMessageId = id;
  input.value = textEl.textContent.trim();
  adjustTextareaHeight();
  keepFocusOnInput();
}

if (input) {
  input.addEventListener('input', adjustTextareaHeight);
  input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessageFromInput();
    } else if (e.key === 'Escape') {
      if (editingMessageId) {
        editingMessageId = null;
        input.value = '';
        adjustTextareaHeight();
        keepFocusOnInput();
        showTransientNotification('Edición cancelada');
      } else {
        input.blur();
      }
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sendMessageFromInput();
  });
  sendBtn.addEventListener('click', (e) => e.preventDefault());
}

window.addEventListener('message-edit', onMessageEdit);