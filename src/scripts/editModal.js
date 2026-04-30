// src/scripts/editModal.js
import { emitSocketEvent, isSocketConnected } from './socketUtils.js';

let modal = null;
let blurOverlay = null;
let keyboardListener = null;
const pendingEdits = new Map();

function getEditText(editor) {
  if (!editor) return '';
  const clone = editor.cloneNode(true);
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
  return clone.innerText.trim();
}

function normalizeReplacedEmojis(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('img.replaced-emoji').forEach(img => {
    const originalEmoji = img.getAttribute('alt');
    if (originalEmoji) {
      const textNode = document.createTextNode(originalEmoji);
      img.parentNode.replaceChild(textNode, img);
    }
  });
  return div.innerHTML;
}

export function showEditModal(messageEl, onSave) {
  window.dispatchEvent(new CustomEvent('close-all-popups'));
  if (modal) return;

  const textEl = messageEl.querySelector('.message-text');
  let originalHtml = textEl ? textEl.innerHTML : '';
  originalHtml = originalHtml.replace(/\s*\(editado\)/g, '');
  originalHtml = normalizeReplacedEmojis(originalHtml);

  blurOverlay = document.createElement('div');
  blurOverlay.className = 'modal-blur-overlay';
  document.body.appendChild(blurOverlay);
  blurOverlay.getBoundingClientRect();
  blurOverlay.classList.add('visible');

  modal = document.createElement('div');
  modal.className = 'edit-modal enter';
  modal.innerHTML = `
    <div class="edit-card">
      <h1>Editar mensaje</h1>
      <div id="editMessageInput" contenteditable="true" class="edit-contenteditable" style="padding: 10px; border-radius: 8px; background: var(--modal-input-bg); color: var(--modal-text); border: 1px solid var(--modal-input-border); min-height: 100px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; line-height: 1.4;"></div>
      <div class="edit-actions" style="margin-top: 12px; display: flex; justify-content: flex-end; gap: 12px;">
        <button id="editCancel" class="btn">Cancelar</button>
        <button id="editSave" class="btn primary">Editar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.classList.remove('enter');

  const editor = modal.querySelector('#editMessageInput');
  const btnCancel = modal.querySelector('#editCancel');
  const btnSave = modal.querySelector('#editSave');

  if (!editor || !btnCancel || !btnSave) {
    hideModal();
    return;
  }

  editor.innerHTML = originalHtml;
  editor.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(editor);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);

  btnCancel.addEventListener('click', () => hideModal());

  btnSave.addEventListener('click', () => {
    const newText = getEditText(editor).trim();
    const originalText = textEl ? textEl.textContent.trim().replace(/\s*\(editado\)/g, '') : '';
    if (!newText || newText === originalText) {
      hideModal();
      return;
    }

    const msgId = messageEl.dataset.msgId;
    const textNode = messageEl.querySelector('.message-text');
    const originalFullText = textNode.textContent;

    textNode.textContent = newText;
    messageEl.dataset.edited = 'true';
    const hourEl = messageEl.querySelector('.msg-hour');
    let originalHourText = hourEl.innerText;
    if (hourEl) {
      let baseHour = hourEl.innerText.split(' (')[0];
      hourEl.innerText = baseHour + ' (editado)';
    }
    hideModal();
    showTransientNotification('Mensaje editado');

    if (pendingEdits.has(msgId)) {
      clearTimeout(pendingEdits.get(msgId).timeoutId);
    }
    const timeoutId = setTimeout(() => {
      if (pendingEdits.has(msgId)) {
        textNode.textContent = originalFullText;
        messageEl.dataset.edited = 'false';
        if (hourEl) hourEl.innerText = originalHourText;
        pendingEdits.delete(msgId);
        showTransientNotification('Error de conexión. Edición revertida.', 2000);
      }
    }, 15000);
    pendingEdits.set(msgId, { originalText: originalFullText, newText, timeoutId });

    if (isSocketConnected()) {
      emitSocketEvent('message:edit', { msgId, newText });
      if (typeof onSave === 'function') onSave(newText);
    } else {
      textNode.textContent = originalFullText;
      messageEl.dataset.edited = 'false';
      if (hourEl) hourEl.innerText = originalHourText;
      pendingEdits.delete(msgId);
      showTransientNotification('Sin conexión. No se pudo editar.', 2000);
    }
  });

  function updateModalPosition() {
    if (!modal) return;
    const vv = window.visualViewport;
    if (!vv) {
      modal.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
    const offset = keyboardHeight * 0.6;
    modal.style.transform = `translate(-50%, calc(-50% - ${offset}px))`;
  }

  if (window.visualViewport) {
    keyboardListener = () => updateModalPosition();
    window.visualViewport.addEventListener('resize', keyboardListener);
    window.visualViewport.addEventListener('scroll', keyboardListener);
    window.addEventListener('keyboardchange', keyboardListener);
  }

  setTimeout(() => {
    window.addEventListener('pointerdown', onOutside);
  }, 0);
}

function onOutside(e) {
  if (!modal) return;
  const target = e.target;
  if (!target) return;
  if (target.closest('.edit-card')) return;
  hideModal();
}

function hideModal() {
  if (!modal) return;

  if (keyboardListener) {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', keyboardListener);
      window.visualViewport.removeEventListener('scroll', keyboardListener);
    }
    window.removeEventListener('keyboardchange', keyboardListener);
    keyboardListener = null;
  }

  if (blurOverlay) {
    blurOverlay.classList.remove('visible');
    setTimeout(() => {
      if (blurOverlay && blurOverlay.parentNode) blurOverlay.parentNode.removeChild(blurOverlay);
      blurOverlay = null;
    }, 200);
  }

  modal.classList.add('leave');
  setTimeout(() => {
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    modal = null;
  }, 80);
  window.removeEventListener('pointerdown', onOutside);
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
    if (_notifEl) _notifEl.classList.remove('visible');
  }, duration);
}

export function clearPendingEdit(msgId) {
  if (pendingEdits.has(msgId)) {
    clearTimeout(pendingEdits.get(msgId).timeoutId);
    pendingEdits.delete(msgId);
  }
}

export function editMessageRemotely(msgId, newText) {
  clearPendingEdit(msgId);
  const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) return;
  const textNode = msgEl.querySelector('.message-text');
  if (textNode) {
    if (textNode.textContent !== newText) {
      textNode.textContent = newText;
      msgEl.dataset.edited = 'true';
      const hourEl = msgEl.querySelector('.msg-hour');
      if (hourEl) {
        let baseHour = hourEl.innerText.split(' (')[0];
        hourEl.innerText = baseHour + ' (editado)';
      }
    }
  }
}