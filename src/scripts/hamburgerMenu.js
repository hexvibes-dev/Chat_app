// src/scripts/hamburgerMenu.js
import { initThemeManager } from './themeManager.js';
import { registerModal, bringModalToFront } from './modalStackManager.js';
import interact from 'interactjs';

let menuElement = null;
let isMenuOpen = false;

// --- Funciones auxiliares para popups y notificaciones ---
function showTransientNotification(text, duration = 2000) {
  let notif = document.querySelector('.transient-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.className = 'transient-notif';
    document.body.appendChild(notif);
  }
  notif.textContent = text;
  notif.classList.add('visible');
  setTimeout(() => notif.classList.remove('visible'), duration);
}

function showConfirmPopup(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-blur-overlay';
    overlay.style.zIndex = '30001';
    document.body.appendChild(overlay);
    overlay.classList.add('visible');

    const popup = document.createElement('div');
    popup.className = 'confirm-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--modal-bg);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 30002;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 250px;
      text-align: center;
      border: 1px solid var(--modal-input-border);
    `;
    popup.innerHTML = `
      <p style="margin: 0; font-size: 16px; color: var(--modal-text);">${message}</p>
      <div style="display: flex; justify-content: center; gap: 20px;">
        <button class="confirm-no" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #ef4444;">✗</button>
        <button class="confirm-yes" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #10b981;">✓</button>
      </div>
    `;
    document.body.appendChild(popup);
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';

    const cleanup = () => {
      popup.remove();
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
    };

    popup.querySelector('.confirm-no').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    popup.querySelector('.confirm-yes').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

// --- Eliminar chat ---
async function deleteAllMessages() {
  const confirmed = await showConfirmPopup('¿Eliminar todos los mensajes del chat? Esta acción no se puede deshacer.');
  if (!confirmed) return;

  const messagesContainer = document.getElementById('messages');
  if (messagesContainer) {
    // Eliminar todos los mensajes excepto el spacer
    const messages = messagesContainer.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());

    // Limpiar reacciones almacenadas en localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('reactions_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    showTransientNotification('Todos los mensajes han sido eliminados', 2000);
  } else {
    showTransientNotification('No se pudo encontrar el contenedor de mensajes', 2000);
  }
}

// --- Limpiar caché (modal completo) ---
let cacheModal = null;
let cacheModalOpen = false;
let cacheModalContainer = null;
let cacheModalHeader = null;
let cacheModalCloseBtn = null;
let cacheModalContent = null;
let cacheWindowX = 0, cacheWindowY = 0;
let cacheCheckboxes = new Map(); // key -> checkbox element

function addResizeHandles(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    element.appendChild(handle);
  });
}

function setupCacheInteract(element, dragHandle) {
  interact(element).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 300, height: 400 },
        max: { width: window.innerWidth * 0.9, height: window.innerHeight * 0.9 }
      })
    ],
    listeners: {
      move(event) {
        let width = event.rect.width;
        let height = event.rect.height;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        cacheWindowX += event.deltaRect.left;
        cacheWindowY += event.deltaRect.top;
        element.style.transform = `translate3d(${cacheWindowX}px, ${cacheWindowY}px, 0)`;
        element.setAttribute('data-x', cacheWindowX);
        element.setAttribute('data-y', cacheWindowY);
      }
    }
  });

  interact(dragHandle).draggable({
    inertia: false,
    manualStart: false,
    allowFrom: dragHandle,
    preventDefault: 'always',
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ],
    listeners: {
      start() { window.isDraggingModal = true; },
      move(event) {
        cacheWindowX += event.dx;
        cacheWindowY += event.dy;
        element.style.transform = `translate3d(${cacheWindowX}px, ${cacheWindowY}px, 0)`;
        element.setAttribute('data-x', cacheWindowX);
        element.setAttribute('data-y', cacheWindowY);
      },
      end() { window.isDraggingModal = false; }
    }
  });
}

function getCacheItems() {
  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Filtrar claves que pertenecen a la app
      if (key.startsWith('reactions_') ||
          key === 'custom_emoji_categories' ||
          key === 'emoji_recent' ||
          key === 'chat_theme_prefs' ||
          key === 'chat_bg_mode' ||
          key === 'chat_custom_bg' ||
          key === 'chat_bg_opacity' ||
          key === 'chat_user_images' ||
          key === 'emoji_skin_tone') {
        items.push(key);
      }
    }
  }
  return items;
}

function renderCacheModalContent() {
  if (!cacheModalContent) return;
  const items = getCacheItems();
  cacheCheckboxes.clear();

  if (items.length === 0) {
    cacheModalContent.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--modal-text);">No hay datos en caché.</div>';
    return;
  }

  const listHtml = items.map(key => `
    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--modal-input-border);">
      <input type="checkbox" id="cache-${escapeHtml(key)}" data-key="${escapeHtml(key)}" style="width: 18px; height: 18px; cursor: pointer;">
      <label for="cache-${escapeHtml(key)}" style="flex: 1; cursor: pointer; color: var(--modal-text);">${escapeHtml(key)}</label>
    </div>
  `).join('');

  cacheModalContent.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <div style="flex: 1; overflow-y: auto; padding: 8px 0;">
        ${listHtml}
      </div>
    </div>
  `;

  // Asignar eventos a los checkboxes
  items.forEach(key => {
    const cb = cacheModalContent.querySelector(`#cache-${escapeHtml(key)}`);
    if (cb) cacheCheckboxes.set(key, cb);
  });
}

function showRedWarningPopup(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-blur-overlay';
    overlay.style.zIndex = '40001';
    document.body.appendChild(overlay);
    overlay.classList.add('visible');

    const popup = document.createElement('div');
    popup.className = 'confirm-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #7f1a1a;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 40002;
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 280px;
      text-align: center;
      border: 1px solid #ef4444;
    `;
    popup.innerHTML = `
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: white;">⚠️ ADVERTENCIA</p>
      <p style="margin: 0; font-size: 14px; color: #fecaca;">${message}</p>
      <div style="display: flex; justify-content: center; gap: 24px;">
        <button class="confirm-no" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #f87171;">✗</button>
        <button class="confirm-yes" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #4ade80;">✓</button>
      </div>
    `;
    document.body.appendChild(popup);
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';

    const cleanup = () => {
      popup.remove();
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
    };

    popup.querySelector('.confirm-no').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    popup.querySelector('.confirm-yes').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

async function deleteSelectedCacheItems() {
  const selectedKeys = [];
  for (const [key, checkbox] of cacheCheckboxes.entries()) {
    if (checkbox.checked) {
      selectedKeys.push(key);
    }
  }
  if (selectedKeys.length === 0) {
    showTransientNotification('No has seleccionado ningún elemento.', 2000);
    return;
  }

  const warningMessage = `Estás a punto de eliminar ${selectedKeys.length} elemento(s) de la caché. Esta acción no se puede deshacer. ¿Estás seguro?`;
  const confirmed = await showRedWarningPopup(warningMessage);
  if (!confirmed) return;

  selectedKeys.forEach(key => {
    localStorage.removeItem(key);
  });

  // Recargar el contenido del modal para reflejar los cambios
  renderCacheModalContent();
  showTransientNotification(`${selectedKeys.length} elemento(s) eliminados de la caché.`, 2000);

  // Notificar a otros módulos si es necesario (por ejemplo, recargar emojis personalizados)
  if (window._refreshCustomEmojis && selectedKeys.includes('custom_emoji_categories')) {
    window._refreshCustomEmojis();
  }
  if (selectedKeys.includes('emoji_skin_tone') && window.location) {
    // Recargar la página para aplicar cambios de tono de piel? Mejor no, pero se puede notificar.
    // Simplemente recargamos la página para que todo se reinicie.
    setTimeout(() => window.location.reload(), 500);
  }
}

function selectAllCacheItems(select) {
  for (const checkbox of cacheCheckboxes.values()) {
    checkbox.checked = select;
  }
}

function createCacheModal() {
  if (cacheModal) return cacheModal;

  cacheModal = document.createElement('div');
  cacheModal.id = 'cache-cleaner-modal';
  cacheModal.className = 'action-menu-modal';
  cacheModal.innerHTML = `
    <div class="action-menu-container" style="width: 500px; height: 600px;">
      <div class="action-menu-header" id="cache-cleaner-header">
        <h3 style="color: var(--modal-text);">🗑️ Limpiar caché</h3>
        <div style="display: flex; gap: 12px;">
          <button id="select-all-cache-btn" style="background: transparent; border: none; cursor: pointer; font-size: 18px; color: var(--modal-text);">⬜</button>
          <button class="action-menu-close" id="cache-cleaner-close" style="color: var(--modal-text);">&times;</button>
        </div>
      </div>
      <div class="action-menu-content" id="cache-cleaner-content" style="padding: 0; overflow: hidden;"></div>
      <div style="display: flex; justify-content: flex-end; gap: 12px; padding: 16px; border-top: 1px solid var(--modal-input-border);">
        <button id="cache-cancel-btn" class="btn-cancel">Cancelar</button>
        <button id="cache-accept-btn" class="btn primary">Aceptar</button>
      </div>
    </div>
  `;

  document.body.appendChild(cacheModal);
  cacheModalContainer = cacheModal.querySelector('.action-menu-container');
  cacheModalHeader = cacheModal.querySelector('#cache-cleaner-header');
  cacheModalCloseBtn = cacheModal.querySelector('#cache-cleaner-close');
  cacheModalContent = cacheModal.querySelector('#cache-cleaner-content');

  addResizeHandles(cacheModalContainer);
  setupCacheInteract(cacheModalContainer, cacheModalHeader);

  cacheModalCloseBtn.addEventListener('click', () => hideCacheModal());
  document.getElementById('cache-cancel-btn').addEventListener('click', () => hideCacheModal());
  document.getElementById('cache-accept-btn').addEventListener('click', () => deleteSelectedCacheItems());
  document.getElementById('select-all-cache-btn').addEventListener('click', () => {
    const btn = document.getElementById('select-all-cache-btn');
    const allChecked = Array.from(cacheCheckboxes.values()).every(cb => cb.checked);
    selectAllCacheItems(!allChecked);
    btn.textContent = allChecked ? '⬜' : '✅';
  });

  registerModal(cacheModal, 'cache-cleaner-modal');
  return cacheModal;
}

function showCacheModal() {
  if (cacheModalOpen) return;
  const modal = createCacheModal();
  renderCacheModalContent();
  cacheModalOpen = true;
  modal.classList.remove('closing');
  modal.style.display = 'flex';
  modal.getBoundingClientRect();
  modal.classList.add('open');
  cacheWindowX = 0;
  cacheWindowY = 0;
  if (cacheModalContainer) {
    cacheModalContainer.style.transform = '';
    cacheModalContainer.removeAttribute('data-x');
    cacheModalContainer.removeAttribute('data-y');
    cacheModalContainer.style.width = '';
    cacheModalContainer.style.height = '';
  }
  bringModalToFront('cache-cleaner-modal');
  // Restablecer botón de seleccionar todo
  const selectBtn = document.getElementById('select-all-cache-btn');
  if (selectBtn) selectBtn.textContent = '⬜';
}

function hideCacheModal() {
  if (!cacheModalOpen) return;
  if (!cacheModal) return;
  cacheModalOpen = false;
  cacheModal.classList.remove('open');
  cacheModal.classList.add('closing');
  setTimeout(() => {
    cacheModal.style.display = 'none';
    cacheModal.classList.remove('closing');
  }, 300);
}

// --- Inicialización del menú hamburguesa ---
export function initHamburgerMenu() {
  initThemeManager();
  createMenuStructure();
  attachEvents();
}

function createMenuStructure() {
  const container = document.getElementById('hamburgerMenuContainer');
  if (!container) return;
  const menu = document.createElement('div');
  menu.className = 'hamburger-menu';
  menu.style.display = 'none';
  menu.innerHTML = `
    <ul>
      <li><button id="themeOptionBtn">Cambiar tema</button></li>
      <li><button id="deleteChatBtn">Eliminar chat</button></li>
      <li><button id="clearCacheBtn">Limpiar caché</button></li>
    </ul>
  `;
  container.appendChild(menu);
  menuElement = menu;
}

function attachEvents() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  if (!hamburgerBtn) return;
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  const themeBtn = document.getElementById('themeOptionBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      closeMenu();
      if (typeof window.showThemeModal === 'function') {
        window.showThemeModal();
      } else {
        console.error('showThemeModal no está definido');
      }
    });
  }

  const deleteChatBtn = document.getElementById('deleteChatBtn');
  if (deleteChatBtn) {
    deleteChatBtn.addEventListener('click', () => {
      closeMenu();
      deleteAllMessages();
    });
  }

  const clearCacheBtn = document.getElementById('clearCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      closeMenu();
      showCacheModal();
    });
  }

  document.addEventListener('click', (e) => {
    if (isMenuOpen && menuElement && !menuElement.contains(e.target) && e.target !== hamburgerBtn) {
      closeMenu();
    }
  });
}

function toggleMenu() {
  if (isMenuOpen) closeMenu();
  else openMenu();
}

function openMenu() {
  if (!menuElement) return;
  menuElement.style.display = 'block';
  menuElement.classList.remove('leave');
  menuElement.classList.add('enter');
  isMenuOpen = true;
}

function closeMenu() {
  if (!menuElement) return;
  menuElement.classList.remove('enter');
  menuElement.classList.add('leave');
  setTimeout(() => {
    if (menuElement && !menuElement.classList.contains('enter')) {
      menuElement.style.display = 'none';
    }
  }, 200);
  isMenuOpen = false;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}