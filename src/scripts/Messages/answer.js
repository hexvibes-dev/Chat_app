import { appendMessage } from './messages.js';
import { getUsername } from '../Server/user.js';
import { getCustomEmojiByShortcode } from '../Emojis/CustomEmojiPicker.js';
import { convertShortcodesToImages } from '../Emojis/emojiUtils.js';
import { isStickerSaved, getStickerCategoryByUrl } from '../Stickers/StickerManager.js';
import { showQuickStickerUpload } from '../Stickers/StickerModal.js';
import { normalizeReplacedEmojisToText } from './emojiReplacement.js';
import { showNotification, hideNotification } from '../Utils/notifications.js';
import { playPopupClose } from '../Sounds/soundManager.js';

let currentQuotedMessage = null;
let activePopup = null;
let popupUpdateListener = null;
let lastKeyboardHeight = 0;
let lastPickerHeight = 0;
const POPUP_GAP = 30;

function getKeyboardHeight() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
}

function getPickerHeight() {
  const container = document.getElementById('mobile-picker-container');
  if (!container || !container.classList.contains('open')) return 0;
  return 400;
}

function getEffectiveBottomOffset() {
  const keyboard = getKeyboardHeight();
  const picker = getPickerHeight();
  return keyboard + picker;
}

function updatePopupPosition() {
  if (!activePopup) return;
  const layerInput = document.getElementById('layerInput');
  if (!layerInput) return;
  
  const rect = layerInput.getBoundingClientRect();
  const effectiveBottomOffset = getEffectiveBottomOffset();
  const inputTop = rect.top;
  const baseBottom = 60;
  const totalOffset = baseBottom + effectiveBottomOffset;
  
  const topPosition = inputTop - POPUP_GAP;
  const bottomPosition = totalOffset + POPUP_GAP;
  
  if (topPosition > 0 && effectiveBottomOffset > 0) {
    activePopup.style.bottom = 'auto';
    activePopup.style.top = `${topPosition}px`;
  } else {
    activePopup.style.top = 'auto';
    activePopup.style.bottom = `${bottomPosition}px`;
  }
}

function forcePopupReposition() {
  if (activePopup) {
    updatePopupPosition();
  }
}

function showReplyPopup(messageElement, content, isSticker = false) {
  hideReplyPopup();
  
  const popup = document.getElementById('replyPopup');
  if (!popup) return;
  if (!messageElement.dataset.msgId) {
    messageElement.dataset.msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  }
  popup.dataset.targetMsg = messageElement.dataset.msgId;
  popup.innerHTML = '';

  const active = document.activeElement;
  const wasInputFocused = !!(active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.isContentEditable));

  const span = document.createElement('span');
  span.className = 'text';
  if (isSticker) {
    span.textContent = '📷 Sticker';
  } else {
    span.innerHTML = content;
  }
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.gap = '4px';
  span.style.flexWrap = 'wrap';
  popup.appendChild(span);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Cerrar respuesta');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    playPopupClose();
    hideReplyPopup();
    clearQuotedMessage();
    if (wasInputFocused) {
      const inputEl = document.getElementById('input');
      if (inputEl) inputEl.focus({ preventScroll: true });
    }
  });
  popup.appendChild(closeBtn);

  popup.classList.add('visible');
  popup.setAttribute('aria-hidden', 'false');

  popup.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  const onActivate = () => {
    const id = popup.dataset.targetMsg;
    if (!id) return;
    const target = document.querySelector(`[data-msg-id="${id}"]`);
    if (target) {
      blurExceptTargetForDuration(target, 1000);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  span.onclick = onActivate;
  span.onkeydown = (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      onActivate();
    } else if (ev.key === 'Escape') {
      playPopupClose();
      hideReplyPopup();
      clearQuotedMessage();
    }
  };

  activePopup = popup;
  updatePopupPosition();
  
  if (popupUpdateListener) {
    window.removeEventListener('resize', popupUpdateListener);
    window.removeEventListener('scroll', popupUpdateListener);
    window.removeEventListener('keyboardchange', popupUpdateListener);
    window.removeEventListener('update-floating-elements', popupUpdateListener);
    window.removeEventListener('picker-opened', popupUpdateListener);
    window.removeEventListener('picker-closed', popupUpdateListener);
  }
  
  popupUpdateListener = () => updatePopupPosition();
  window.addEventListener('resize', popupUpdateListener);
  window.addEventListener('scroll', popupUpdateListener);
  window.addEventListener('keyboardchange', popupUpdateListener);
  window.addEventListener('update-floating-elements', popupUpdateListener);
  window.addEventListener('picker-opened', popupUpdateListener);
  window.addEventListener('picker-closed', popupUpdateListener);
}

export function hideReplyPopup() {
  if (popupUpdateListener) {
    window.removeEventListener('resize', popupUpdateListener);
    window.removeEventListener('scroll', popupUpdateListener);
    window.removeEventListener('keyboardchange', popupUpdateListener);
    window.removeEventListener('update-floating-elements', popupUpdateListener);
    window.removeEventListener('picker-opened', popupUpdateListener);
    window.removeEventListener('picker-closed', popupUpdateListener);
    popupUpdateListener = null;
  }
  
  const popup = document.getElementById('replyPopup');
  if (popup) {
    popup.classList.remove('visible');
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = '';
    popup.dataset.targetMsg = '';
  }
  activePopup = null;
}

function setQuotedMessage(messageElement, quotedHtml) {
  currentQuotedMessage = {
    id: messageElement.dataset.msgId,
    author: messageElement.classList.contains('me') ? 'Tú' : 'Contacto',
    text: quotedHtml
  };
}

function clearQuotedMessage() {
  currentQuotedMessage = null;
}

export function getAndClearQuotedMessage() {
  const msg = currentQuotedMessage;
  currentQuotedMessage = null;
  return msg;
}

export function blurExceptTargetForDuration(target, duration = 1000) {
  if (!target || duration <= 0) return;
  const msgEl = target.closest('.message') || target;
  if (!msgEl) return;
  const container = document.querySelector('.layer-messages') || document.body;
  const allMessages = Array.from(container.querySelectorAll('.message'));
  const prevStyles = new Map();
  allMessages.forEach((m) => {
    prevStyles.set(m, {
      filter: m.style.filter || '',
      opacity: m.style.opacity || '',
      transition: m.style.transition || '',
      zIndex: m.style.zIndex || '',
      position: m.style.position || ''
    });
  });
  allMessages.forEach((m) => {
    if (m === msgEl) {
      m.style.transition = 'filter 80ms ease, opacity 80ms ease';
      m.style.filter = 'none';
      m.style.opacity = '1';
      if (!m.style.position || m.style.position === 'static') m.style.position = 'relative';
      m.style.zIndex = '1400';
    } else {
      m.style.transition = 'filter 80ms ease, opacity 80ms ease';
      m.style.filter = 'blur(6px)';
      m.style.opacity = '0.92';
      m.style.zIndex = '';
    }
  });
  const dim = document.createElement('div');
  dim.className = 'reply-blur-dim';
  dim.style.cssText = [
    'position:fixed',
    'inset:0',
    'background: rgba(0,0,0,0.12)',
    'pointer-events:none',
    'z-index:1140',
    'opacity:0',
    'transition: opacity 80ms ease'
  ].join(';');
  document.body.appendChild(dim);
  dim.getBoundingClientRect();
  dim.style.opacity = '1';
  setTimeout(() => {
    dim.style.opacity = '0';
    setTimeout(() => {
      allMessages.forEach((m) => {
        const prev = prevStyles.get(m) || {};
        m.style.filter = prev.filter;
        m.style.opacity = prev.opacity;
        m.style.transition = prev.transition;
        m.style.zIndex = prev.zIndex;
        m.style.position = prev.position;
      });
      if (dim && dim.parentNode) dim.parentNode.removeChild(dim);
    }, 100);
  }, duration);
}

export function addReplyRemotely(targetMsgId, replyText, replyAuthor, senderId) {
  const targetMsg = document.querySelector(`[data-msg-id="${targetMsgId}"]`);
  if (!targetMsg) {
    console.warn('addReplyRemotely: mensaje objetivo no encontrado', targetMsgId);
    return;
  }
  const currentUser = getUsername();
  const isMe = (senderId === currentUser);
  let quotedHtml;
  const isSticker = targetMsg.querySelector('.sticker-message-wrapper') !== null;
  if (isSticker) {
    quotedHtml = '📷 Sticker';
  } else {
    const plainText = extractPlainText(targetMsg.querySelector('.msg-drag'));
    quotedHtml = convertShortcodesToImages(plainText);
  }
  appendMessage(replyText, {
    me: isMe,
    replyTo: {
      id: targetMsgId,
      author: replyAuthor,
      text: quotedHtml
    },
    fromSocket: true
  });
}

export function enableAnswerGestures() {
  const messages = document.getElementById('messages');
  if (!messages) return;
  messages.addEventListener('pointerdown', startDrag);
  
  window.forcePopupReposition = forcePopupReposition;
}

function startDrag(e) {
  if (!e.target) return;
  if (e.target.closest('.reply-quote')) return;
  if (window.isDraggingModal) return;

  const dragWrap = e.target.closest('.msg-drag');
  if (!dragWrap) return;
  const target = dragWrap.closest('.message');
  if (!target) return;

  const keyboardWasOpen = window.keyboardOpen;

  let startX = e.clientX;
  let startY = e.clientY;
  let dragging = false;
  let lastDiff = 0;
  const maxDiff = 100;
  const minDragDistance = 15;

  let hasPointerCapture = false;
  let originalTransform = dragWrap.style.transform;
  let originalOpacity = dragWrap.style.opacity;
  let originalTransition = dragWrap.style.transition;

  function onMove(ev) {
    const diffX = ev.clientX - startX;
    const diffY = ev.clientY - startY;

    if (!dragging && (Math.abs(diffX) > minDragDistance && Math.abs(diffX) > Math.abs(diffY) + 10)) {
      dragging = true;
      ev.preventDefault();
      try {
        if (typeof e.target.setPointerCapture === 'function') {
          e.target.setPointerCapture(e.pointerId);
          hasPointerCapture = true;
        } else if (typeof target.setPointerCapture === 'function') {
          target.setPointerCapture(e.pointerId);
          hasPointerCapture = true;
        }
      } catch (err) {}
    }

    if (dragging) {
      if (target.classList.contains('me')) {
        if (diffX < 0) {
          lastDiff = Math.max(diffX, -maxDiff);
          dragWrap.style.transform = `translate3d(${lastDiff}px,0,0)`;
          dragWrap.style.opacity = 0.9;
        } else {
          dragWrap.style.transform = originalTransform;
          dragWrap.style.opacity = originalOpacity;
        }
      } else {
        if (diffX > 0) {
          lastDiff = Math.min(diffX, maxDiff);
          dragWrap.style.transform = `translate3d(${lastDiff}px,0,0)`;
          dragWrap.style.opacity = 0.9;
        } else {
          dragWrap.style.transform = originalTransform;
          dragWrap.style.opacity = originalOpacity;
        }
      }
    }
  }

  function onUp(ev) {
    if (hasPointerCapture) {
      try {
        if (typeof e.target.releasePointerCapture === 'function') {
          e.target.releasePointerCapture(e.pointerId);
        } else if (typeof target.releasePointerCapture === 'function') {
          target.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }

    if (dragging && Math.abs(lastDiff) === maxDiff) {
      dragWrap.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      let contentForPopup;
      const isSticker = dragWrap.classList.contains('sticker-message-wrapper');
      if (isSticker) {
        contentForPopup = '📷 Sticker';
      } else {
        const plainText = extractPlainText(dragWrap);
        contentForPopup = convertShortcodesToImages(plainText);
      }
      const popup = document.getElementById('replyPopup');
      if (popup && keyboardWasOpen) {
        popup.style.pointerEvents = 'none';
      }
      showReplyPopup(target, contentForPopup, isSticker);
      setQuotedMessage(target, contentForPopup);
      if (popup && keyboardWasOpen) {
        popup.style.pointerEvents = 'auto';
        setTimeout(() => {
          const input = document.getElementById('input');
          if (input && window.keyboardOpen) {
            input.focus();
          }
        }, 50);
      }
      dragWrap.style.transform = originalTransform;
      dragWrap.style.opacity = originalOpacity;
      setTimeout(() => {
        dragWrap.style.transition = originalTransition;
      }, 250);
    } else {
      dragWrap.style.transform = originalTransform;
      dragWrap.style.opacity = originalOpacity;
      dragWrap.style.transition = originalTransition;
    }

    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

function extractPlainText(dragWrap) {
  const clone = dragWrap.cloneNode(true);
  clone.querySelectorAll('.reply-quote, .msg-hour, .reactions-wrap').forEach(el => el.remove());
  clone.querySelectorAll('img[data-shortcode]').forEach(img => {
    const shortcode = img.getAttribute('data-shortcode');
    const textNode = document.createTextNode(shortcode);
    img.parentNode.replaceChild(textNode, img);
  });
  clone.querySelectorAll('img.replaced-emoji').forEach(img => {
    const originalEmoji = img.getAttribute('alt');
    if (originalEmoji) {
      const textNode = document.createTextNode(originalEmoji);
      img.parentNode.replaceChild(textNode, img);
    }
  });
  clone.querySelectorAll('img').forEach(img => {
    const alt = img.getAttribute('alt') || 'imagen';
    const textNode = document.createTextNode(`[${alt}]`);
    img.parentNode.replaceChild(textNode, img);
  });
  let text = clone.textContent || '';
  text = text.replace(/\s*\(editado\)/g, '').trim();
  return text || '[Mensaje]';
}