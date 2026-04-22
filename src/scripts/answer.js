// src/scripts/answer.js
import { appendMessage } from './messages.js';
import { getUsername } from './user.js';
import { getCustomEmojiByShortcode } from './CustomEmojiPicker.js';
import { convertShortcodesToImages } from './emojiUtils.js';

let currentQuotedMessage = null;

export function enableAnswerGestures() {
  const messages = document.getElementById('messages');
  if (!messages) return;
  messages.addEventListener('pointerdown', startDrag);
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
          dragWrap.style.transform = '';
        }
      } else {
        if (diffX > 0) {
          lastDiff = Math.min(diffX, maxDiff);
          dragWrap.style.transform = `translate3d(${lastDiff}px,0,0)`;
          dragWrap.style.opacity = 0.9;
        } else {
          dragWrap.style.transform = '';
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
      const plainText = extractPlainText(dragWrap);
      const htmlContent = convertShortcodesToImages(plainText);
      
      const popup = document.getElementById('replyPopup');
      if (popup && keyboardWasOpen) {
        popup.style.pointerEvents = 'none';
      }
      
      showReplyPopup(target, htmlContent);
      setQuotedMessage(target, htmlContent);
      
      if (popup && keyboardWasOpen) {
        popup.style.pointerEvents = 'auto';
        setTimeout(() => {
          const input = document.getElementById('input');
          if (input && window.keyboardOpen) {
            input.focus();
          }
        }, 50);
      }
      
      dragWrap.style.transform = 'translate3d(0,0,0)';
      dragWrap.style.opacity = 1;
      setTimeout(() => {
        dragWrap.style.transition = '';
      }, 250);
    } else {
      dragWrap.style.transform = '';
      dragWrap.style.opacity = 1;
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
  
  clone.querySelectorAll('img').forEach(img => {
    const alt = img.getAttribute('alt') || 'imagen';
    const textNode = document.createTextNode(`[${alt}]`);
    img.parentNode.replaceChild(textNode, img);
  });
  
  let text = clone.textContent || '';
  text = text.replace(/\s*\(editado\)/g, '').trim();
  return text || '[Mensaje]';
}

function convertShortcodesToImagesLegacy(text) {
  // Usamos la función importada de emojiUtils
  return convertShortcodesToImages(text);
}

function showReplyPopup(messageElement, content) {
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
  span.innerHTML = content;
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
    hideReplyPopup();
    popup.dataset.targetMsg = '';
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
      hideReplyPopup();
      clearQuotedMessage();
    }
  };
}

export function hideReplyPopup() {
  const popup = document.getElementById('replyPopup');
  if (!popup) return;
  popup.classList.remove('visible');
  popup.setAttribute('aria-hidden', 'true');
  popup.innerHTML = '';
  popup.dataset.targetMsg = '';
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
  const plainText = extractPlainText(targetMsg.querySelector('.msg-drag'));
  const quotedHtml = convertShortcodesToImages(plainText);
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