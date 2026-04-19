// src/scripts/answer.js
import { appendMessage } from './messages.js';
import { getUsername } from './user.js';

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
      const text = extractMessageText(dragWrap);
      showReplyPopup(target, text);
      setQuotedMessage(target, text);
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

function extractMessageText(dragWrap) {
  const clone = dragWrap.cloneNode(true);
  const quotes = clone.querySelectorAll('.reply-quote');
  quotes.forEach(q => q.remove());
  const hour = clone.querySelector('.msg-hour');
  if (hour) hour.remove();
  const reactionsWrap = clone.querySelector('.reactions-wrap');
  if (reactionsWrap) reactionsWrap.remove();
  let txt = clone.textContent || '';
  txt = txt.replace(/\s*\(editado\)/g, '');
  return txt.replace(/\s+/g, ' ').trim();
}

function showReplyPopup(messageElement, text) {
  const popup = document.getElementById('replyPopup');
  if (!popup) return;

  if (!messageElement.dataset.msgId) {
    messageElement.dataset.msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  }
  popup.dataset.targetMsg = messageElement.dataset.msgId;

  popup.innerHTML = '';

  const active = document.activeElement;
  const wasInputFocused = !!(active && (
    active.tagName === 'TEXTAREA' ||
    active.tagName === 'INPUT' ||
    active.isContentEditable
  ));

  const span = document.createElement('span');
  span.className = 'text';
  span.textContent = text;
  popup.appendChild(span);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Cerrar respuesta');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('tabindex', '-1');
  closeBtn.addEventListener('pointerdown', (ev) => ev.preventDefault(), { passive: false });

  closeBtn.onclick = (ev) => {
    ev.stopPropagation();
    hideReplyPopup();
    popup.dataset.targetMsg = '';
    clearQuotedMessage();

    if (wasInputFocused) {
      const inputEl = document.getElementById('input');
      try {
        if (inputEl && typeof inputEl.focus === 'function') {
          inputEl.focus({ preventScroll: true });
        } else if (active && typeof active.focus === 'function') {
          active.focus({ preventScroll: true });
        }
      } catch (err) {}
    }
  };
  popup.appendChild(closeBtn);

  popup.classList.add('visible');
  popup.setAttribute('aria-hidden', 'false');

  if (!window.keyboardOpen) {
    try { popup.focus(); } catch (err) {}
  }

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

function setQuotedMessage(messageElement, quotedText) {
  currentQuotedMessage = {
    element: messageElement,
    text: quotedText,
    id: messageElement.dataset.msgId,
    author: messageElement.classList.contains('me') ? 'Tú' : 'Contacto'
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

// --- RESPUESTAS REMOTAS ---
export function addReplyRemotely(targetMsgId, replyText, replyAuthor, senderId) {
  const targetMsg = document.querySelector(`[data-msg-id="${targetMsgId}"]`);
  if (!targetMsg) {
    console.warn('addReplyRemotely: mensaje objetivo no encontrado', targetMsgId);
    return;
  }

  const currentUser = getUsername();
  const isMe = (senderId === currentUser);
  const quotedText = extractMessageText(targetMsg.querySelector('.msg-drag'));

  appendMessage(replyText, {
    me: isMe,
    replyTo: {
      id: targetMsgId,
      author: replyAuthor,
      text: quotedText
    },
    fromSocket: true
    // msgId se asignará automáticamente en appendMessage (o por el servidor cuando llegue el new-message)
  });
}
