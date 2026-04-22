// src/scripts/addReaction.js
import { loadCustomEmojis } from './EmojiPicker/EmojiData.js';
import { convertShortcodesToImages } from './emojiUtils.js';

let modal = null;
let blurOverlay = null;
let keyboardListener = null;

function showTransientNotification(text, duration = 1000) {
  let notifEl = document.querySelector('.transient-notif');
  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.className = 'transient-notif';
    document.body.appendChild(notifEl);
  }
  notifEl.textContent = text;
  notifEl.classList.add('visible');
  setTimeout(() => notifEl.classList.remove('visible'), duration);
}

function buildSubcategoryAccordion(categoryName, emojis, onSelect) {
  if (!emojis || emojis.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'custom-category-item';
  section.style.marginBottom = '12px';

  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="category-arrow" style="font-size: 14px;">▼</span>
      <strong>${escapeHtml(categoryName)}</strong>
    </div>
  `;

  const content = document.createElement('div');
  content.className = 'category-content';
  content.style.maxHeight = '0px';
  content.style.paddingTop = '0';
  content.style.overflow = 'hidden';
  content.style.transition = 'max-height 0.3s ease-out, padding 0.3s ease';

  const grid = document.createElement('div');
  grid.className = 'emoji-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(48px, 1fr))';
  grid.style.gap = '6px';
  grid.style.padding = '8px 12px';

  for (const shortcode of emojis) {
    const btn = document.createElement('button');
    btn.className = 'emoji-item';
    btn.style.aspectRatio = '1';
    btn.style.fontSize = '32px';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '12px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';

    if (shortcode && shortcode.startsWith(':') && shortcode.endsWith(':')) {
      const imgHtml = convertShortcodesToImages(shortcode);
      btn.innerHTML = imgHtml;
      btn.style.fontSize = '0';
      const img = btn.querySelector('img');
      if (img) {
        img.style.width = '32px';
        img.style.height = '32px';
      }
    } else {
      btn.textContent = shortcode;
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(shortcode);
      hideModal();
    });
    grid.appendChild(btn);
  }

  content.appendChild(grid);
  section.appendChild(header);
  section.appendChild(content);

  let isExpanded = false;
  header.addEventListener('click', (e) => {
    e.stopPropagation();
    const arrow = header.querySelector('.category-arrow');
    if (isExpanded) {
      content.style.maxHeight = '0px';
      content.style.paddingTop = '0';
      arrow.textContent = '▼';
      isExpanded = false;
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.paddingTop = '12px';
      arrow.textContent = '▲';
      isExpanded = true;
    }
  });

  return section;
}

function renderModalContent(onAdd) {
  if (!modal) return;

  loadCustomEmojis();
  const subcategories = window._customEmojiSubcategories || [];

  const container = modal.querySelector('.add-reaction-card');
  if (!container) return;

  const existingActions = container.querySelector('.add-reaction-actions');
  
  // Eliminar acordeones anteriores si existen
  const oldWrapper = container.querySelector('#reaction-accordions');
  if (oldWrapper) oldWrapper.remove();

  if (subcategories.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.id = 'reaction-accordions';
    wrapper.style.marginTop = '16px';
    wrapper.style.maxHeight = '300px';
    wrapper.style.overflowY = 'auto';
    for (const subcat of subcategories) {
      const accordion = buildSubcategoryAccordion(subcat.name, subcat.emojis, onAdd);
      if (accordion) wrapper.appendChild(accordion);
    }
    container.insertBefore(wrapper, existingActions);
  }
}

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
    <div class="add-reaction-card" style="width: 480px; max-width: 90vw;">
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

  renderModalContent(onAdd);

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}