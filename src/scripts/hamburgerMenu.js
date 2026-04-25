// src/scripts/hamburgerMenu.js
import { initThemeManager } from './themeManager.js';
import { registerModal, bringModalToFront } from './modalStackManager.js';
import interact from 'interactjs';

let menuElement = null;
let isMenuOpen = false;
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
async function deleteAllMessages() {
  const confirmed = await showConfirmPopup('¿Eliminar todos los mensajes del chat? Esta acción no se puede deshacer.');
  if (!confirmed) return;

  const messagesContainer = document.getElementById('messages');
  if (messagesContainer) {
    const messages = messagesContainer.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());

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

let cacheModal = null;
let cacheModalOpen = false;
let cacheModalContainer = null;
let cacheModalHeader = null;
let cacheModalCloseBtn = null;
let cacheModalContent = null;
let cacheWindowX = 0, cacheWindowY = 0;
let cacheCheckboxes = new Map();
let currentStorageType = 'local';

function addResizeHandles(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    element.appendChild(handle);
  });
}

function setupCacheInteract(element, dragHandle) {
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }

  interact(element).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 100, height: 100 },
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

function getAllStorageItems(storageType) {
  const items = [];
  const storage = storageType === 'local' ? localStorage : sessionStorage;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      let value = storage.getItem(key);
      let preview = value;
      if (value && value.length > 50) {
        preview = value.substring(0, 50) + '...';
      }
      items.push({ key, value: preview, fullValue: value });
    }
  }
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

async function getCacheStorageItems() {
  const items = [];
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        for (const request of requests) {
          items.push({
            key: `[Cache: ${cacheName}] ${request.url}`,
            value: 'Cache entry',
            fullValue: request.url,
            cacheName: cacheName,
            url: request.url
          });
        }
      }
    } catch(e) {
      console.error('Error reading cache:', e);
    }
  }
  return items;
}

function renderCacheModalContent() {
  if (!cacheModalContent) return;
  
  if (currentStorageType === 'local') {
    const items = getAllStorageItems('local');
    renderCacheItems(items);
  } else if (currentStorageType === 'session') {
    const items = getAllStorageItems('session');
    renderCacheItems(items);
  } else if (currentStorageType === 'cache') {
    getCacheStorageItems().then(items => renderCacheItems(items));
  }
}

function renderCacheItems(items) {
  if (!cacheModalContent) return;
  cacheCheckboxes.clear();
  
  if (items.length === 0) {
    cacheModalContent.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--modal-text);">No hay datos en este almacenamiento.</div>';
    return;
  }

  const listHtml = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin: 12px; padding: 4px;">
      ${items.map((item, idx) => `
        <div class="cache-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--modal-input-bg); border-radius: 12px; border: 1px solid var(--modal-input-border);">
          <input type="checkbox" id="cache-${idx}" data-key="${escapeHtml(item.key)}" data-full-value="${escapeHtml(item.fullValue || '')}" data-cache-name="${escapeHtml(item.cacheName || '')}" style="width: 18px; height: 18px; margin-top: 2px; cursor: pointer;">
          <label for="cache-${idx}" style="flex: 1; cursor: pointer; min-width: 0;">
            <div style="color: var(--modal-text); font-family: monospace; font-size: 12px; word-break: break-all;">${escapeHtml(item.key)}</div>
            <div style="color: var(--modal-text-secondary); font-size: 11px; margin-top: 4px; word-break: break-all;">${escapeHtml(item.value)}</div>
          </label>
        </div>
      `).join('')}
    </div>
  `;

  cacheModalContent.innerHTML = listHtml;

  items.forEach((item, idx) => {
    const cb = cacheModalContent.querySelector(`#cache-${idx}`);
    if (cb) {
      cb.dataset.key = item.key;
      cb.dataset.fullValue = item.fullValue || '';
      cb.dataset.cacheName = item.cacheName || '';
      cacheCheckboxes.set(item.key, cb);
    }
  });
}

async function deleteSelectedCacheItems() {
  const selectedKeys = [];
  for (const [key, checkbox] of cacheCheckboxes.entries()) {
    if (checkbox.checked) {
      selectedKeys.push({
        key: checkbox.dataset.key,
        fullValue: checkbox.dataset.fullValue,
        cacheName: checkbox.dataset.cacheName
      });
    }
  }
  
  if (selectedKeys.length === 0) {
    showTransientNotification('No has seleccionado ningún elemento.', 2000);
    return;
  }

  const warningMessage = `⚠️ Estás a punto de eliminar ${selectedKeys.length} elemento(s). Esta acción no se puede deshacer. ¿Estás seguro?`;
  const confirmed = await showRedWarningPopup(warningMessage);
  if (!confirmed) return;

  for (const item of selectedKeys) {
    if (currentStorageType === 'local') {
      localStorage.removeItem(item.key);
    } else if (currentStorageType === 'session') {
      sessionStorage.removeItem(item.key);
    } else if (currentStorageType === 'cache' && item.cacheName) {
      if ('caches' in window) {
        const cache = await caches.open(item.cacheName);
        await cache.delete(item.fullValue);
      }
    }
  }

  showTransientNotification(`${selectedKeys.length} elemento(s) eliminados.`, 2000);
  renderCacheModalContent();
  window.dispatchEvent(new CustomEvent('cache-cleared'));
}

async function deleteAllStorage() {
  const warningMessage = `⚠️⚠️⚠️ ¡ATENCIÓN! ⚠️⚠️⚠️\n\nEstás a punto de BORRAR TODOS los datos guardados en el navegador:\n- localStorage\n- sessionStorage\n- Cache Storage\n\nEsto incluye:\n- Todos los mensajes y reacciones\n- Emojis y stickers personalizados\n- Temas y fondos guardados\n- Estilos del editor\n- Y todos los demás datos\n\nEsta acción NO se puede deshacer.\n\n¿Estás ABSOLUTAMENTE seguro?`;
  const confirmed = await showRedWarningPopup(warningMessage);
  if (!confirmed) return;
  
  const keysToKeep = ['chat_username', 'chat_displayName'];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  }
  
  sessionStorage.clear();
  
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  }
  
  showTransientNotification('🗑️ Todos los datos han sido eliminados. La página se recargará...', 3000);
  setTimeout(() => window.location.reload(), 2000);
}

function selectAllCacheItems(select) {
  for (const checkbox of cacheCheckboxes.values()) {
    checkbox.checked = select;
  }
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
      min-width: 320px;
      max-width: 90vw;
      text-align: center;
      border: 1px solid #ef4444;
    `;
    popup.innerHTML = `
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: white;">⚠️ ADVERTENCIA</p>
      <p style="margin: 0; font-size: 14px; color: #fecaca; white-space: pre-wrap;">${escapeHtml(message)}</p>
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

function createCacheModal() {
  if (cacheModal) return cacheModal;

  cacheModal = document.createElement('div');
  cacheModal.id = 'cache-cleaner-modal';
  cacheModal.className = 'action-menu-modal';
  cacheModal.innerHTML = `
    <div class="action-menu-container" style="width: 700px; height: 650px;">
      <div class="action-menu-header" id="cache-cleaner-header">
        <h3 style="color: var(--modal-text);"> Limpiar almacenamiento</h3>
        <div style="display: flex; gap: 12px;">
          <button id="select-all-cache-btn" style="background: transparent; border: none; cursor: pointer; font-size: 18px; color: var(--modal-text);" title="Seleccionar todo">⬜</button>
          <button class="action-menu-close" id="cache-cleaner-close" style="color: var(--modal-text);">&times;</button>
        </div>
      </div>
      <div style="display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--modal-input-border); flex-wrap: wrap;">
        <button id="storage-local-btn" class="storage-tab active" data-storage="local">📦 localStorage</button>
        <button id="storage-session-btn" class="storage-tab" data-storage="session">🔄 sessionStorage</button>
        <button id="storage-cache-btn" class="storage-tab" data-storage="cache">💾 Cache Storage</button>
        <button id="delete-all-storage-btn" class="storage-tab danger" style="background: #7f1a1a; color: white;">⚠️ BORRAR TODO</button>
      </div>
      <div class="action-menu-content" id="cache-cleaner-content" style="padding: 0; overflow: auto;"></div>
      <div style="overflow: auto; margin-left: 20px; margin-right: 20px; display: flex; justify-content: flex-end; gap: 12px; padding: 16px; border-top: 1px solid var(--modal-input-border);">
        <button id="cache-cancel-btn" class="btn-cancel">Cancelar</button>
        <button id="cache-accept-btn" class="btn primary">Eliminar seleccionados</button>
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
  
  document.getElementById('storage-local-btn').addEventListener('click', () => {
    currentStorageType = 'local';
    updateStorageTabs('local');
    renderCacheModalContent();
  });
  document.getElementById('storage-session-btn').addEventListener('click', () => {
    currentStorageType = 'session';
    updateStorageTabs('session');
    renderCacheModalContent();
  });
  document.getElementById('storage-cache-btn').addEventListener('click', () => {
    currentStorageType = 'cache';
    updateStorageTabs('cache');
    renderCacheModalContent();
  });
  document.getElementById('delete-all-storage-btn').addEventListener('click', () => {
    hideCacheModal();
    deleteAllStorage();
  });

  registerModal(cacheModal, 'cache-cleaner-modal');
  return cacheModal;
}

function updateStorageTabs(active) {
  const tabs = ['local', 'session', 'cache'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`storage-${tab}-btn`);
    if (btn) {
      if (tab === active) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
}

function showCacheModal() {
  if (cacheModalOpen) return;
  const modal = createCacheModal();
  currentStorageType = 'local';
  updateStorageTabs('local');
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
      <li><button id="deleteChatBtn" >Eliminar chat</button></li>
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