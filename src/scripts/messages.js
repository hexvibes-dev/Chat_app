import { appendHour } from './hour.js';
import { blurExceptTargetForDuration } from './answer.js';
import {
  applyEmojiStyle,
  isSingleHeart,
  applyHeartAnimation,
  getSpecialEmojiType,
  applySpecialEmojiAnimation
} from './emojiMessage.js';
import { clearPendingEdit, editMessageRemotely as editMessageRemotelyFn } from './editModal.js';
import { getCustomEmojiByShortcode } from './CustomEmojiPicker.js';
import { convertShortcodesToImages } from './emojiUtils.js';

if (typeof window.isAtBottom === 'undefined') window.isAtBottom = true;
if (typeof window.smoothScrollToBottom !== 'function') window.smoothScrollToBottom = () => {};
if (typeof window.keyboardOpen === 'undefined') window.keyboardOpen = false;
if (typeof window.ensureLastMessageAboveInput !== 'function') window.ensureLastMessageAboveInput = () => {};

export const messages = document.getElementById('messages');
export const spacer = document.getElementById('spacer');

function blurInputOnMessageClick(e) {
  const target = e.target;
  if (!target) return;
  const isInput = target.closest('#input, #sendBtn');
  if (!isInput) {
    const inputEl = document.getElementById('input');
    if (inputEl && document.activeElement === inputEl) {
      inputEl.blur();
    }
  }
}

if (messages) {
  messages.addEventListener('click', blurInputOnMessageClick);
}

function updateLastMessageMargin() {
  const allMessages = document.querySelectorAll('.message');
  allMessages.forEach(msg => {
    msg.style.marginBottom = '10px';
  });
  if (allMessages.length > 0) {
    const lastMsg = allMessages[allMessages.length - 1];
    if (lastMsg) lastMsg.style.marginBottom = '20px';
  }
}

function processCustomEmojis(text) {
  return convertShortcodesToImages(text);
}

export function appendMessage(text, opts = {}) {
  if (!messages || !spacer) return;

  const msgId = opts.msgId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (messages.querySelector(`[data-msg-id="${msgId}"]`)) return;

  const div = document.createElement('div');
  div.className = 'message' + (opts.me ? ' me' : '');
  div.dataset.msgId = msgId;

  const dragWrap = document.createElement('div');
  dragWrap.className = 'msg-drag';

  const processedText = processCustomEmojis(text);
  const isEmojiOnly = applyEmojiStyle(dragWrap, processedText);

  const isSingleHeartEmoji = isSingleHeart(processedText);
  if (isSingleHeartEmoji) {
    setTimeout(() => {
      applyHeartAnimation(div, dragWrap);
    }, 100);
  }

  const specialEmojiType = getSpecialEmojiType(processedText);
  if (specialEmojiType && !isSingleHeartEmoji) {
    setTimeout(() => {
      applySpecialEmojiAnimation(div, dragWrap, specialEmojiType);
    }, 100);
  }

  if (opts.replyTo && opts.replyTo.id && opts.replyTo.author && opts.replyTo.text) {
    const replyBlock = document.createElement('div');
    replyBlock.className = 'reply-quote';
    
    let quotedContent = opts.replyTo.text;
    if (!quotedContent.includes('<img')) {
      quotedContent = processCustomEmojis(quotedContent);
    }
    
    replyBlock.innerHTML = `
      <div class="reply-quote-author">${escapeHtml(opts.replyTo.author)}</div>
      <div class="reply-quote-text">${quotedContent}</div>
    `;
    replyBlock.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const inputEl = document.getElementById('input');
      if (inputEl && document.activeElement === inputEl) inputEl.blur();
      const originalMsg = document.querySelector(`[data-msg-id="${opts.replyTo.id}"]`);
      if (originalMsg) {
        blurExceptTargetForDuration(originalMsg, 1000);
        originalMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    dragWrap.appendChild(replyBlock);

    const separator = document.createElement('div');
    separator.className = 'reply-separator';
    dragWrap.appendChild(separator);
  }

  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.innerHTML = processedText;
  dragWrap.appendChild(messageText);

  appendHour(dragWrap);
  div.appendChild(dragWrap);
  messages.insertBefore(div, spacer);

  if (isEmojiOnly) {
    const hour = dragWrap.querySelector('.msg-hour');
    if (hour && dragWrap.classList.contains('emoji-single')) {
      hour.style.position = 'relative';
      hour.style.marginTop = '4px';
    }
  }

  updateLastMessageMargin();

  requestAnimationFrame(() => {
    if (window.isAtBottom) {
      if (typeof window.smoothScrollToBottom === 'function') window.smoothScrollToBottom();
      if (window.keyboardOpen) {
        const kb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
        setTimeout(() => {
          if (typeof window.ensureLastMessageAboveInput === 'function') window.ensureLastMessageAboveInput(kb);
        }, 60);
      }
    }
  });

  return div;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function deleteMessageRemotely(msgId) {
  const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) return;
  const textEl = msgEl.querySelector('.message-text');
  if (textEl) textEl.innerText = 'Mensaje eliminado';
  msgEl.dataset.deletedForAll = 'true';
}

export function editMessageRemotely(msgId, newText) {
  editMessageRemotelyFn(msgId, newText);
}