import { appendMessage } from './messages.js';
import { getAndClearQuotedMessage, hideReplyPopup } from './answer.js';
import { connectToBackend, sendMessageViaSocket, isSocketConnected, disconnectSocket } from './socket.js';
import { convertShortcodesToImages, convertShortcodesToImagesInNode } from './emojiUtils.js';
import { showNotification } from './notifications.js';
import { playMessageSend, playClick, playError, playKeyboard } from './soundManager.js';
import { initEmojiSuggestions, refreshEmojiKeywords } from './EmojiSuggestions.js';

export const input = document.getElementById('input');
export const sendBtn = document.getElementById('sendBtn');

let editingMessageId = null;
let lastCursorPosition = null;
let isUserTyping = false;
let preventFocus = false;
let lastKeyboardSoundTime = 0;
const KEYBOARD_SOUND_DEBOUNCE = 80;

window._ignoreBlurForPicker = false;

if (input) {
  input.contentEditable = 'false';
  input.style.cursor = 'text';
  input.style.wordWrap = 'break-word';
  input.style.whiteSpace = 'pre-wrap';
  input.style.overflowWrap = 'break-word';
  input.blur();
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

function clearInputText() {
  if (!input) return;
  preventFocus = true;
  const wasEditable = input.contentEditable === 'true';
  if (!wasEditable) input.contentEditable = 'true';
  
  input.innerText = '';
  const range = document.createRange();
  range.selectNodeContents(input);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(() => convertShortcodesToImagesInNode(input), 10);
  
  if (!wasEditable) {
    input.contentEditable = 'false';
  }
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
  showNotification(text, duration);
}

function playKeyboardSound() {
  const now = Date.now();
  if (now - lastKeyboardSoundTime >= KEYBOARD_SOUND_DEBOUNCE) {
    lastKeyboardSoundTime = now;
    playKeyboard();
  }
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
    clearInputText();
    adjustTextareaHeight();
    input.blur();
    input.contentEditable = 'false';
    return;
  }

  if (text === '/disconnect') {
    disconnectSocket();
    clearInputText();
    adjustTextareaHeight();
    input.blur();
    input.contentEditable = 'false';
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
    clearInputText();
    adjustTextareaHeight();
    if (input.contentEditable !== 'true') {
      input.contentEditable = 'true';
      input.focus();
    }
    return;
  }

  if (!text) return;

  const quoted = getAndClearQuotedMessage();
  const wasActive = (input.contentEditable === 'true' && document.activeElement === input);

  if (isSocketConnected()) {
    sendMessageViaSocket(text, quoted);
    playMessageSend();
    clearInputText();
    adjustTextareaHeight();
    if (typeof hideReplyPopup === 'function') hideReplyPopup();
  } else {
    appendMessage(text, { me: true, replyTo: quoted || undefined });
    playMessageSend();
    clearInputText();
    adjustTextareaHeight();
    if (typeof hideReplyPopup === 'function') hideReplyPopup();
    if (window.isAtBottom && typeof window.smoothScrollToBottom === 'function') window.smoothScrollToBottom();
  }

  if (wasActive) {
    if (input.contentEditable !== 'true') input.contentEditable = 'true';
    input.focus();
  } else {
    input.blur();
    input.contentEditable = 'false';
  }
}

if (sendBtn) {
  sendBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });
  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    playClick();
    sendMessageFromInput();
  });
}

if (input) {
  input.addEventListener('input', () => {
    adjustTextareaHeight();
    if (input.contentEditable === 'true') {
      playKeyboardSound();
    }
  });
  
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
        clearInputText();
        adjustTextareaHeight();
        showTransientNotification('Edición cancelada');
      } else {
        input.blur();
        input.contentEditable = 'false';
      }
    }
  });

  input.addEventListener('click', () => {
    saveCursorPosition();
    if (input.contentEditable !== 'true') {
      input.contentEditable = 'true';
      input.focus();
    }
  });
  input.addEventListener('keyup', saveCursorPosition);
  input.addEventListener('paste', (e) => {
    setTimeout(() => convertShortcodesToImagesInNode(input), 10);
  });

  input.addEventListener('blur', () => {
    input.contentEditable = 'false';
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
  clearInputText(); 
  if (input.contentEditable !== 'true') input.contentEditable = 'true';
  input.innerText = plainText;
  const range = document.createRange();
  range.selectNodeContents(input);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  adjustTextareaHeight();
  input.focus();
});

setTimeout(() => {
  initEmojiSuggestions();
}, 100);