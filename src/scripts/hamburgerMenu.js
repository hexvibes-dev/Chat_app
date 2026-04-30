import { initThemeManager } from './themeManager.js';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';
import interact from 'interactjs';

let menuElement = null;
let isMenuOpen = false;

let cacheWindowElement, cacheHeaderElement, cacheCloseBtn, cacheOverlay;
let cacheWindowX = 0, cacheWindowY = 0;
let isCacheModalOpen = false;
let cacheCheckboxes = new Map();
let currentStorageType = 'local';

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

function addCacheResizeHandles(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-cache-cleaner.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-cache-cleaner resize-${dir}`;
      element.appendChild(handle);
    }
  });
}

function centerCacheModal() {
  if (!cacheWindowElement) return;
  const rect = cacheWindowElement.getBoundingClientRect();
  cacheWindowX = (window.innerWidth - rect.width) / 2;
  cacheWindowY = (window.innerHeight - rect.height) / 2;
  cacheWindowElement.style.transform = `translate3d(${cacheWindowX}px, ${cacheWindowY}px, 0)`;
  cacheWindowElement.setAttribute('data-x', cacheWindowX);
  cacheWindowElement.setAttribute('data-y', cacheWindowY);
}

function isLessThan10PercentVisible(element) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
  const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
  if (visibleWidth <= 0 || visibleHeight <= 0) return true;
  const visibleArea = visibleWidth * visibleHeight;
  const totalArea = rect.width * rect.height;
  return (visibleArea / totalArea) < 0.1;
}

function setupCacheInteract() {
  if (getComputedStyle(cacheWindowElement).position === 'static') {
    cacheWindowElement.style.position = 'relative';
  }
  interact(cacheWindowElement).resizable({
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
        cacheWindowElement.style.width = `${width}px`;
        cacheWindowElement.style.height = `${height}px`;
        cacheWindowX += event.deltaRect.left;
        cacheWindowY += event.deltaRect.top;
        cacheWindowElement.style.transform = `translate3d(${cacheWindowX}px, ${cacheWindowY}px, 0)`;
        cacheWindowElement.setAttribute('data-x', cacheWindowX);
        cacheWindowElement.setAttribute('data-y', cacheWindowY);
        constrainAllModals();
      }
    }
  });

  interact(cacheHeaderElement).draggable({
    inertia: false,
    manualStart: false,
    allowFrom: cacheHeaderElement,
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
        const keyboardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
        if (keyboardHeight > 0) {
          const inputElement = document.getElementById('layerInput');
          if (inputElement) {
            const inputRect = inputElement.getBoundingClientRect();
            const modalRect = cacheWindowElement.getBoundingClientRect();
            const inputTop = inputRect.top;
            const modalBottom = modalRect.bottom;
            if (modalBottom + event.dy > inputTop - 10) return;
          }
        }
        cacheWindowX += event.dx;
        cacheWindowY += event.dy;
        cacheWindowElement.style.transform = `translate3d(${cacheWindowX}px, ${cacheWindowY}px, 0)`;
        cacheWindowElement.setAttribute('data-x', cacheWindowX);
        cacheWindowElement.setAttribute('data-y', cacheWindowY);
        constrainAllModals();
      },
      end() {
        window.isDraggingModal = false;
        if (isLessThan10PercentVisible(cacheWindowElement)) {
          hideCacheModal();
        }
        constrainAllModals();
      }
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
  const contentDiv = document.getElementById('cache-cleaner-inner-content');
  if (!contentDiv) return;
  if (currentStorageType === 'local') {
    const items = getAllStorageItems('local');
    renderCacheItems(items, 'local');
  } else if (currentStorageType === 'session') {
    const items = getAllStorageItems('session');
    renderCacheItems(items, 'session');
  } else if (currentStorageType === 'cache') {
    getCacheStorageItems().then(items => renderCacheItems(items, 'cache'));
  }
}

function renderCacheItems(items, storageType) {
  const contentDiv = document.getElementById('cache-cleaner-inner-content');
  if (!contentDiv) return;
  cacheCheckboxes.clear();
  if (items.length === 0) {
    contentDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--modal-text);">No hay datos en este almacenamiento.</div>';
    return;
  }

  const selectAllId = `select-all-${storageType}`;
  const listHtml = `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
      <button id="${selectAllId}" class="select-all-section-btn" style="background: var(--modal-btn-primary); color: white; border: none; border-radius: 16px; padding: 4px 12px; cursor: pointer;">✅ Seleccionar todo</button>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin: 12px; padding: 4px;">
      ${items.map((item, idx) => `
        <div class="cache-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--modal-input-bg); border-radius: 12px; border: 1px solid var(--modal-input-border);">
          <input type="checkbox" id="cache-${storageType}-${idx}" data-key="${escapeHtml(item.key)}" data-full-value="${escapeHtml(item.fullValue || '')}" data-cache-name="${escapeHtml(item.cacheName || '')}" style="width: 18px; height: 18px; margin-top: 2px; cursor: pointer;">
          <label for="cache-${storageType}-${idx}" style="flex: 1; cursor: pointer; min-width: 0;">
            <div style="color: var(--modal-text); font-family: monospace; font-size: 12px; word-break: break-all;">${escapeHtml(item.key)}</div>
            <div style="color: var(--modal-text-secondary); font-size: 11px; margin-top: 4px; word-break: break-all;">${escapeHtml(item.value)}</div>
          </label>
        </div>
      `).join('')}
    </div>
  `;
  contentDiv.innerHTML = listHtml;

  items.forEach((item, idx) => {
    const cb = contentDiv.querySelector(`#cache-${storageType}-${idx}`);
    if (cb) {
      cb.dataset.key = item.key;
      cb.dataset.fullValue = item.fullValue || '';
      cb.dataset.cacheName = item.cacheName || '';
      cacheCheckboxes.set(item.key, cb);
    }
  });

  const selectAllBtn = document.getElementById(selectAllId);
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const checkboxes = contentDiv.querySelectorAll('input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        const key = cb.dataset.key;
        if (key && cacheCheckboxes.has(key)) {
          cacheCheckboxes.get(key).checked = cb.checked;
        }
      });
      selectAllBtn.textContent = allChecked ? '✅ Seleccionar todo' : '❌ Deseleccionar todo';
    });
  }
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

function updateStorageTabs(active) {
  const tabs = ['local', 'session', 'cache'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`storage-${tab}-btn`);
    if (btn) {
      if (tab === active) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
}

function initCacheModal() {
  cacheWindowElement = document.getElementById('cache-cleaner-movable-window');
  cacheHeaderElement = document.getElementById('cache-cleaner-modal-header');
  cacheCloseBtn = document.getElementById('close-cache-cleaner-modal');
  cacheOverlay = document.getElementById('cache-cleaner-overlay');
  if (!cacheWindowElement || !cacheHeaderElement) return;
  associateOverlay(cacheWindowElement, cacheOverlay);
  addCacheResizeHandles(cacheWindowElement);
  setupCacheInteract();
  if (cacheCloseBtn) cacheCloseBtn.onclick = () => hideCacheModal();
  registerModal(cacheWindowElement, 'cache-cleaner-modal');
  const selectAllBtn = document.getElementById('select-all-cache-btn');
  const localBtn = document.getElementById('storage-local-btn');
  const sessionBtn = document.getElementById('storage-session-btn');
  const cacheBtn = document.getElementById('storage-cache-btn');
  const deleteAllBtn = document.getElementById('delete-all-storage-btn');
  const cancelBtn = document.getElementById('cache-cancel-btn');
  const acceptBtn = document.getElementById('cache-accept-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => hideCacheModal());
  if (acceptBtn) acceptBtn.addEventListener('click', () => deleteSelectedCacheItems());
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const allChecked = Array.from(cacheCheckboxes.values()).every(cb => cb.checked);
      selectAllCacheItems(!allChecked);
      selectAllBtn.textContent = allChecked ? '⬜' : '✅';
    });
  }
  if (localBtn) {
    localBtn.addEventListener('click', () => {
      currentStorageType = 'local';
      updateStorageTabs('local');
      renderCacheModalContent();
    });
  }
  if (sessionBtn) {
    sessionBtn.addEventListener('click', () => {
      currentStorageType = 'session';
      updateStorageTabs('session');
      renderCacheModalContent();
    });
  }
  if (cacheBtn) {
    cacheBtn.addEventListener('click', () => {
      currentStorageType = 'cache';
      updateStorageTabs('cache');
      renderCacheModalContent();
    });
  }
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', () => {
      hideCacheModal();
      deleteAllStorage();
    });
  }
}

function showCacheModal() {
  if (isCacheModalOpen) return;
  if (!cacheWindowElement) initCacheModal();
  if (!cacheWindowElement) return;
  currentStorageType = 'local';
  updateStorageTabs('local');
  renderCacheModalContent();
  cacheOverlay.classList.add('active');
  cacheWindowElement.style.display = 'flex';
  centerCacheModal();
  isCacheModalOpen = true;
  bringModalToFront('cache-cleaner-modal');
  const selectBtn = document.getElementById('select-all-cache-btn');
  if (selectBtn) selectBtn.textContent = '⬜';
}

function hideCacheModal() {
  if (!isCacheModalOpen) return;
  if (cacheWindowElement) cacheWindowElement.style.display = 'none';
  if (cacheOverlay) cacheOverlay.classList.remove('active');
  isCacheModalOpen = false;
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

export function initHamburgerMenu() {
  initThemeManager();
  initCacheModal();
  createMenuStructure();
  attachEvents();
}