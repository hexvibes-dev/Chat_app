let modal = null;
let blurOverlay = null;
let keyboardListener = null;

export function showAddReactionModal(onAdd) {
  window.dispatchEvent(new CustomEvent('close-all-popups'));

  if (modal) return;

  blurOverlay = document.createElement('div');
  blurOverlay.className = 'modal-blur-overlay';
  document.body.appendChild(blurOverlay);
  blurOverlay.getBoundingClientRect();
  blurOverlay.classList.add('visible');

  modal = document.createElement('div');
  modal.className = 'add-reaction-modal enter';
  modal.innerHTML = `
    <div class="add-reaction-card">
      <h1>Añade tu reacción</h1>
      <input id="addReactionInput" maxlength="5" placeholder="Emoji, texto o emoticono" />
      <div class="add-reaction-actions">
        <button id="addReactionCancel" class="btn">Cancelar</button>
        <button id="addReactionAccept" class="btn primary">Aceptar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.classList.remove('enter');

  const input = modal.querySelector('#addReactionInput');
  const btnCancel = modal.querySelector('#addReactionCancel');
  const btnAccept = modal.querySelector('#addReactionAccept');

  if (!input || !btnCancel || !btnAccept) {
    hideModal();
    return;
  }

  btnCancel.addEventListener('click', () => hideModal());
  btnAccept.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) return;
    onAdd(val);
    hideModal();
    showTransientNotification('Reacción añadida');
  });

  input.focus();

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
  if (target.closest('.add-reaction-card')) return;
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
