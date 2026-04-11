let modal = null;
let blurOverlay = null;
let keyboardListener = null;

export function showEditModal(messageEl, onSave) {
  window.dispatchEvent(new CustomEvent('close-all-popups'));
  if (modal) return;

  const textEl = messageEl.querySelector('.message-text');
  let currentText = textEl ? textEl.textContent.trim() : '';
  currentText = currentText.replace(/\s*\(editado\)/g, '');

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
      <textarea id="editMessageInput" maxlength="1000" rows="4" placeholder="Escribe tu mensaje..."></textarea>
      <div class="edit-actions">
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

  const input = modal.querySelector('#editMessageInput');
  const btnCancel = modal.querySelector('#editCancel');
  const btnSave = modal.querySelector('#editSave');

  if (!input || !btnCancel || !btnSave) {
    hideModal();
    return;
  }

  input.value = currentText;
  input.focus();
  input.select();

  btnCancel.addEventListener('click', () => hideModal());
  btnSave.addEventListener('click', () => {
    const newText = input.value.trim();
    if (!newText || newText === currentText) {
      hideModal();
      return;
    }
    if (typeof onSave === 'function') onSave(newText);
    hideModal();
    showTransientNotification('Mensaje editado');
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
