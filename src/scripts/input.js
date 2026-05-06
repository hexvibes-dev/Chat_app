import { appendMessage } from './messages.js';
import { getAndClearQuotedMessage, hideReplyPopup } from './answer.js';
import { connectToBackend, sendMessageViaSocket, isSocketConnected, disconnectSocket } from './socket.js';
import { convertShortcodesToImages, convertShortcodesToImagesInNode } from './emojiUtils.js';

export const input = document.getElementById('input');
export const sendBtn = document.getElementById('sendBtn');

let editingMessageId = null;
let lastCursorPosition = null;
let isUserTyping = false;
let preventFocus = false;

window._ignoreBlurForPicker = false;

if (input) {
  input.contentEditable = 'false';
  input.style.cursor = 'text';
  input.style.wordWrap = 'break-word';
  input.style.whiteSpace = 'pre-wrap';
  input.style.overflowWrap = 'break-word';
}

function saveCursorPosition() {
  if (preventFocus) return;
  const sel = window.getSelection();
  if (sel.rangeCount > 0 && input.contains(sel.anchorNode)) {
    lastCursorPosition = sel.getRangeAt(0).cloneRange();
  }
}

function restoreCursorPosition() {
  if (lastCursorPosition && input.contains(lastCursorPosition.startContainer)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastCursorPosition);
    return true;
  }
  return false;
}

function getInputText() {
  if (!input) return '';
  const wasEditable = input.contentEditable === 'true';
  if (!wasEditable) input.contentEditable = 'true';
  const clone = input.cloneNode(true);
  if (!wasEditable) input.contentEditable = 'false';
  
  clone.querySelectorAll('img[data-shortcode]').forEach(img => {
    const shortcode = img.getAttribute('data-shortcode');
    const textNode = document.createTextNode(shortcode);
    img.parentNode.replaceChild(textNode, img);
  });
  clone.querySelectorAll('.sticker-message').forEach(img => {
    const imgClone = img.cloneNode(true);
    img.parentNode.replaceChild(imgClone, img);
  });
  let text = clone.innerText || '';
  return text.trim();
}

function setInputText(text) {
  if (!input) return;
  preventFocus = true;
  const wasEditable = input.contentEditable === 'true';
  if (!wasEditable) input.contentEditable = 'true';
  
  input.innerText = text;
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(input);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(() => convertShortcodesToImagesInNode(input), 10);
  
  if (!wasEditable) input.contentEditable = 'false';
  if (document.activeElement === input) input.blur();
  preventFocus = false;
}

export function insertAtCursor(html, shouldKeepFocus = false) {
  if (!input) return;
  preventFocus = true;
  const wasEditable = input.contentEditable === 'true';
  if (!wasEditable) input.contentEditable = 'true';

  let processedHtml = html;
  if (typeof html === 'string' && html.match(/^:[a-zA-Z0-9_]+:$/)) {
    processedHtml = convertShortcodesToImages(html);
  }

  let range;
  const sel = window.getSelection();
  let validSelection = false;
  if (sel.rangeCount > 0) {
    const testRange = sel.getRangeAt(0);
    if (input.contains(testRange.commonAncestorContainer)) {
      range = testRange;
      validSelection = true;
    }
  }
  if (!validSelection && lastCursorPosition && input.contains(lastCursorPosition.startContainer)) {
    range = lastCursorPosition;
    validSelection = true;
    sel.removeAllRanges();
    sel.addRange(range);
  }
  if (!validSelection) {
    range = document.createRange();
    range.selectNodeContents(input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  range.deleteContents();
  const fragment = range.createContextualFragment(processedHtml);
  range.insertNode(fragment);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);

  input.dispatchEvent(new Event('input', { bubbles: true }));
  saveCursorPosition();
  setTimeout(() => convertShortcodesToImagesInNode(input), 10);

  if (!wasEditable) input.contentEditable = 'false';
  if (document.activeElement === input) input.blur();
  preventFocus = false;
  
  if (shouldKeepFocus) {
    setTimeout(() => input.focus(), 0);
  }
}

export function adjustTextareaHeight() {
  if (!input) return;
  input.style.height = 'auto';
  const newH = Math.min(input.scrollHeight, 120);
  input.style.height = newH + 'px';
}

function showTransientNotification(text, duration = 1000) {
  let notifEl = document.querySelector('.transient-notif');
  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.className = 'transient-notif';
    document.body.appendChild(notifEl);
  }
  notifEl.textContent = text;
  notifEl.classList.add('visible');
  if (window._notifT) clearTimeout(window._notifT);
  window._notifT = setTimeout(() => {
    notifEl.classList.remove('visible');
  }, duration);
}

export function sendMessageFromInput() {
  window._ignoreBlurForPicker = true;
  setTimeout(() => {
    window._ignoreBlurForPicker = false;
  }, 300);

  let text = getInputText();

  if (text.startsWith('/connect')) {
    const parts = text.split(' ');
    const url = parts[1];
    if (!url) showTransientNotification('Debes especificar una URL');
    else connectToBackend(url);
    setInputText('');
    adjustTextareaHeight();
    return;
  }

  if (text === '/disconnect') {
    disconnectSocket();
    setInputText('');
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
    setInputText('');
    adjustTextareaHeight();
    return;
  }

  if (!text) return;

  const quoted = getAndClearQuotedMessage();

  if (isSocketConnected()) {
    sendMessageViaSocket(text, quoted);
    setInputText('');
    adjustTextareaHeight();
    if (typeof hideReplyPopup === 'function') hideReplyPopup();
    return;
  }

  appendMessage(text, { me: true, replyTo: quoted || undefined });
  setInputText('');
  adjustTextareaHeight();
  if (typeof hideReplyPopup === 'function') hideReplyPopup();
  if (window.isAtBottom && typeof window.smoothScrollToBottom === 'function') window.smoothScrollToBottom();
}

if (sendBtn) {
  sendBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });
  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sendMessageFromInput();
  });
}

if (input) {
  input.addEventListener('input', adjustTextareaHeight);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      adjustTextareaHeight();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessageFromInput();
    } else if (e.key === 'Escape') {
      if (editingMessageId) {
        editingMessageId = null;
        setInputText('');
        adjustTextareaHeight();
        showTransientNotification('Edición cancelada');
      } else {
        input.blur();
      }
    }
  });

  input.addEventListener('click', saveCursorPosition);
  input.addEventListener('keyup', saveCursorPosition);
  input.addEventListener('paste', (e) => {
    setTimeout(() => convertShortcodesToImagesInNode(input), 10);
  });

  input.addEventListener('mousedown', () => {
    if (input.contentEditable !== 'true') {
      input.contentEditable = 'true';
    }
    isUserTyping = true;
    preventFocus = false;
  });

  input.addEventListener('focus', () => {
    if ((!isUserTyping || preventFocus) && input.contentEditable === 'false') {
      input.blur();
    }
  });

  input.addEventListener('mouseup', () => {
    setTimeout(() => {
      isUserTyping = false;
    }, 100);
  });

  input.addEventListener('blur', () => {
    if (!editingMessageId && !isUserTyping) {
      input.contentEditable = 'false';
    }
    isUserTyping = false;
  });
}

window.addEventListener('message-edit', (e) => {
  const id = e?.detail?.id;
  if (!id) return;
  const msgEl = document.querySelector(`[data-msg-id="${id}"]`);
  if (!msgEl) return;
  const textEl = msgEl.querySelector('.message-text');
  if (!textEl) return;
  editingMessageId = id;
  const plainText = textEl.textContent.trim();
  input.contentEditable = 'true';
  setInputText(plainText);
  adjustTextareaHeight();
  input.focus();
});