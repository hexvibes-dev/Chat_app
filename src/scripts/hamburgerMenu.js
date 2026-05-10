import { initThemeManager } from './themeManager.js';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';
import interact from 'interactjs';
import { showAvatarEditor } from './AvatarEditorModal.js';
import { showNotification } from './notifications.js';
import { showSoundSettingsModal } from './SoundSettingsModal.js';

let menuElement = null;
let isMenuOpen = false;
let cacheWindowElement, cacheHeaderElement, cacheCloseBtn, cacheOverlay;
let cacheWindowX = 0, cacheWindowY = 0;
let isCacheModalOpen = false;
let currentStorageType = 'local';
let currentItems = [];
let currentItemKeys = [];
let isLoading = false;
let currentPage = 0;
let totalPages = 1;

const PAGE_SIZE = 20;

function showTransientNotification(text, duration = 2000) {
  showNotification(text, duration);
}

function showLoading(show) {
  let overlay = document.getElementById('cache-loading-overlay');
  const container = document.getElementById('cache-cleaner-inner-content');
  
  if (show) {
    if (!overlay && container) {
      overlay = document.createElement('div');
      overlay.id = 'cache-loading-overlay';
      overlay.className = 'cache-loading-overlay';
      overlay.innerHTML = `
        <div class="cache-loading-spinner"></div>
        <div class="cache-loading-text">Cargando datos...</div>
      `;
      container.style.position = 'relative';
      container.appendChild(overlay);
    }
    if (overlay) overlay.style.display = 'flex';
  } else {
    if (overlay) overlay.style.display = 'none';
  }
}

async function loadItemsAsync(keys, storageType, onProgress) {
  const items = [];
  const batchSize = 5;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    for (const key of batch) {
      let value = null;
      let preview = '';
      if (storageType === 'local') {
        value = localStorage.getItem(key);
        preview = value && value.length > 50 ? value.substring(0, 50) + '...' : value;
      } else if (storageType === 'session') {
        value = sessionStorage.getItem(key);
        preview = value && value.length > 50 ? value.substring(0, 50) + '...' : value;
      } else if (storageType === 'cache') {
        value = 'Cache entry';
        preview = 'Cache entry';
      }
      items.push({ key, value: preview, fullValue: value, isSelected: false });
    }
    if (onProgress) onProgress(items.length, keys.length);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  return items;
}

function renderContentHTML() {
  if (!currentItems.length) {
    return '<div class="cache-empty-state">📭 No hay datos en este almacenamiento</div>';
  }
  let html = '<div class="cache-grid">';
  currentItems.forEach((item) => {
    html += `
      <div class="cache-grid-item" data-key="${escapeHtml(item.key)}">
        <input type="checkbox" class="cache-item-checkbox" ${item.isSelected ? 'checked' : ''}>
        <label>
          <div class="cache-item-key">${escapeHtml(item.key)}</div>
          <div class="cache-item-value">${escapeHtml(item.value || '(vacío)')}</div>
        </label>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

function bindCheckboxEvents() {
  const checkboxes = document.querySelectorAll('#cache-cleaner-inner-content .cache-item-checkbox');
  checkboxes.forEach((cb, idx) => {
    cb.removeEventListener('change', handleCheckboxChange);
    cb.addEventListener('change', handleCheckboxChange);
    cb.dataset.index = idx;
  });
}

function handleCheckboxChange(e) {
  const idx = parseInt(e.target.dataset.index);
  if (!isNaN(idx) && currentItems[idx]) {
    currentItems[idx].isSelected = e.target.checked;
    updateSelectionCount();
    updateSelectAllButton();
  }
}

function renderGridItems() {
  const container = document.getElementById('cache-cleaner-inner-content');
  if (!container) return;
  container.innerHTML = renderContentHTML();
  bindCheckboxEvents();
  updateSelectionCount();
  updateSelectAllButton();
}

function updateSelectAllButton() {
  const selectAllBtn = document.getElementById('cache-select-all-btn');
  if (!selectAllBtn) return;
  const allSelected = currentItems.length > 0 && currentItems.every(item => item.isSelected === true);
  selectAllBtn.textContent = allSelected ? '❌ Deseleccionar todo' : '✅ Seleccionar todo';
}

function updateSelectionCount() {
  const countSpan = document.getElementById('cache-selection-count');
  if (!countSpan) return;
  const selectedCount = currentItems.filter(item => item.isSelected).length;
  countSpan.textContent = `${selectedCount} seleccionado${selectedCount !== 1 ? 's' : ''}/${currentItems.length}`;
}

function updatePaginationControls() {
  const prevBtn = document.getElementById('cache-prev-btn');
  const nextBtn = document.getElementById('cache-next-btn');
  const pageIndicator = document.getElementById('cache-page-indicator');
  const totalItemsSpan = document.getElementById('cache-total-items');
  
  if (prevBtn) {
    prevBtn.disabled = currentPage === 0;
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    newPrevBtn.onclick = () => { if (currentPage > 0) loadPage(currentPage - 1); };
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages - 1;
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.onclick = () => { if (currentPage < totalPages - 1) loadPage(currentPage + 1); };
  }
  if (pageIndicator) {
    pageIndicator.textContent = `Página ${currentPage + 1} de ${totalPages}`;
  }
  if (totalItemsSpan) {
    totalItemsSpan.textContent = `${currentItemKeys.length} elementos totales`;
  }
}

function handleSelectAll() {
  const allSelected = currentItems.length > 0 && currentItems.every(item => item.isSelected);
  currentItems.forEach(item => item.isSelected = !allSelected);
  renderGridItems();
}

async function loadPage(page) {
  if (isLoading) return;
  isLoading = true;
  showLoading(true);
  try {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageKeys = currentItemKeys.slice(start, end);
    currentItems = await loadItemsAsync(pageKeys, currentStorageType);
    renderGridItems();
    currentPage = page;
    updatePaginationControls();
  } catch (err) {
    console.error(err);
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

async function refreshCacheDisplay() {
  showLoading(true);
  try {
    currentItemKeys = await getAllStorageKeys(currentStorageType);
    if (currentItemKeys.length === 0) {
      const container = document.getElementById('cache-cleaner-inner-content');
      if (container) container.innerHTML = '<div class="cache-empty-state">📭 No hay datos en este almacenamiento</div>';
      updatePaginationControls();
      updateSelectionCount();
      return;
    }
    currentPage = 0;
    totalPages = Math.ceil(currentItemKeys.length / PAGE_SIZE);
    await loadPage(0);
  } catch (err) {
    console.error(err);
    const container = document.getElementById('cache-cleaner-inner-content');
    if (container) container.innerHTML = '<div class="cache-empty-state">❌ Error al cargar los datos</div>';
  } finally {
    showLoading(false);
  }
}

async function deleteSelectedCacheItems() {
  const selectedItems = currentItems.filter(item => item.isSelected);
  if (selectedItems.length === 0) {
    showTransientNotification('No has seleccionado ningún elemento.', 2000);
    return;
  }
  const confirmed = await showCustomPopup(`⚠️ Estás a punto de eliminar ${selectedItems.length} elemento(s). Esta acción no se puede deshacer. ¿Estás seguro?`, 'warning');
  if (!confirmed) return;
  for (const item of selectedItems) {
    if (currentStorageType === 'local') {
      localStorage.removeItem(item.key);
    } else if (currentStorageType === 'session') {
      sessionStorage.removeItem(item.key);
    } else if (currentStorageType === 'cache' && 'caches' in window) {
      const cacheName = item.key.match(/\[Cache: ([^\]]+)\]/)?.[1];
      if (cacheName) {
        const cache = await caches.open(cacheName);
        await cache.delete(item.fullValue);
      }
    }
  }
  await refreshCacheDisplay();
  showTransientNotification(`${selectedItems.length} elemento(s) eliminados.`, 2000);
  window.dispatchEvent(new CustomEvent('cache-cleared'));
}

async function deleteAllStorage() {
  const confirmed = await showCustomPopup(
    `⚠️⚠️⚠️ ¡ATENCIÓN! ⚠️⚠️⚠️\n\nEstás a punto de BORRAR TODOS los datos guardados en el navegador:\n- localStorage\n- sessionStorage\n- Cache Storage\n\nEsto incluye TODOS los datos, incluso los de configuración.\n\n¿Estás ABSOLUTAMENTE seguro?`,
    'danger'
  );
  if (!confirmed) return;
  if (currentStorageType === 'local') {
    localStorage.clear();
  } else if (currentStorageType === 'session') {
    sessionStorage.clear();
  } else if (currentStorageType === 'cache' && 'caches' in window) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  }
  await refreshCacheDisplay();
  showTransientNotification('🗑️ Todos los datos han sido eliminados.', 2000);
  window.dispatchEvent(new CustomEvent('cache-cleared'));
}

function getAllStorageKeys(storageType) {
  return new Promise((resolve, reject) => {
    if (storageType === 'local') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      resolve(keys.sort((a, b) => a.localeCompare(b)));
    } else if (storageType === 'session') {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) keys.push(key);
      }
      resolve(keys.sort((a, b) => a.localeCompare(b)));
    } else if (storageType === 'cache' && 'caches' in window) {
      (async () => {
        const keys = [];
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          for (const request of requests) {
            keys.push({
              key: `[Cache: ${cacheName}] ${request.url}`,
              url: request.url,
              cacheName: cacheName
            });
          }
        }
        resolve(keys.sort((a, b) => a.key.localeCompare(b.key)));
      })().catch(reject);
    } else {
      resolve([]);
    }
  });
}

function showCustomPopup(message, type = 'warning') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-blur-overlay custom-popup-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:50000;';
    document.body.appendChild(overlay);
    
    const popup = document.createElement('div');
    popup.className = `custom-popup ${type}`;
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${type === 'danger' ? 'var(--confirm-popup-background)' : 'var(--xd)'};
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      z-index: 50001;
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 300px;
      max-width: 90vw;
      text-align: center;
      border: 1px solid ${type === 'danger' ? '#ef4444' : '#f59e0b'};
      animation: popupBounceIn 0.3s ease-out;
    `;
    popup.innerHTML = `
      <div style="font-size: 48px;">${type === 'danger' ? '⚠️' : '❓'}</div>
      <p style="margin: 0; font-size: 16px; color: #e0e0e0; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(message)}</p>
      <div style="display: flex; justify-content: center; gap: 20px; margin-top: 8px;">
        <button class="popup-btn-no" style="background: rgba(239,68,68,0.2); border: none; padding: 10px 24px; border-radius: 30px; cursor: pointer; font-size: 14px; color: #f87171; transition: all 0.2s;">Cancelar</button>
        <button class="popup-btn-yes" style="background: rgba(20,184,166,0.2); border: none; padding: 10px 24px; border-radius: 30px; cursor: pointer; font-size: 14px; color: #14b8a6; transition: all 0.2s;">Confirmar</button>
      </div>
    `;
    document.body.appendChild(popup);
    
    const cleanup = () => {
      popup.style.animation = 'popupBounceOut 0.2s ease-in';
      setTimeout(() => {
        popup.remove();
        overlay.remove();
      }, 200);
    };
    
    popup.querySelector('.popup-btn-no').onclick = () => { cleanup(); resolve(false); };
    popup.querySelector('.popup-btn-yes').onclick = () => { cleanup(); resolve(true); };
    
    if (!document.querySelector('#popup-keyframes')) {
      const style = document.createElement('style');
      style.id = 'popup-keyframes';
      style.textContent = `
        @keyframes popupBounceIn {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes popupBounceOut {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  });
}

function updateStorageTabs(active) {
  const tabs = ['local', 'session', 'cache'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`storage-${tab}-btn`);
    if (btn) tab === active ? btn.classList.add('active') : btn.classList.remove('active');
  });
  currentStorageType = active;
  refreshCacheDisplay();
}

function centerCacheModal() {
  if (!cacheWindowElement) return;
  const rect = cacheWindowElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  cacheWindowX = Math.max(0, (viewportWidth - rect.width) / 2);
  cacheWindowY = Math.max(0, (viewportHeight - rect.height) / 2);
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
  if (!cacheWindowElement || !cacheHeaderElement) return;
  
  if (getComputedStyle(cacheWindowElement).position === 'static') {
    cacheWindowElement.style.position = 'fixed';
  }
  
  interact(cacheWindowElement).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 280, height: 400 },
        max: { width: window.innerWidth * 0.95, height: window.innerHeight * 0.9 }
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
        if (typeof constrainAllModals === 'function') constrainAllModals();
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
      start() { 
        window.isDraggingModal = true; 
      },
      move(event) {
        cacheWindowX += event.dx;
        cacheWindowY += event.dy;
        cacheWindowElement.style.transform = `translate3d(${cacheWindowX}px, ${cacheWindowY}px, 0)`;
        cacheWindowElement.setAttribute('data-x', cacheWindowX);
        cacheWindowElement.setAttribute('data-y', cacheWindowY);
        if (typeof constrainAllModals === 'function') constrainAllModals();
      },
      end() {
        window.isDraggingModal = false;
        if (isLessThan10PercentVisible(cacheWindowElement)) hideCacheModal();
        if (typeof constrainAllModals === 'function') constrainAllModals();
      }
    }
  });
}

function rebuildCacheModalStructure() {
  const container = document.getElementById('cache-cleaner-inner-content');
  if (!container) return;
  
  const existingGrid = container.querySelector('.cache-grid');
  if (existingGrid) return;
  
  const movableWindow = cacheWindowElement;
  if (!movableWindow) return;
  
  const oldTabsDiv = movableWindow.querySelector('div[style*="display: flex; gap:8px; padding:12px"]');
  if (oldTabsDiv) oldTabsDiv.remove();
  
  const oldPaginationDiv = movableWindow.querySelector('#cache-total-items')?.closest('div[style*="justify-content: space-between"]');
  if (oldPaginationDiv && oldPaginationDiv !== movableWindow.querySelector('#cache-cleaner-inner-content')?.previousSibling) {
    oldPaginationDiv.remove();
  }
  
  const oldSelectDiv = movableWindow.querySelector('#cache-select-all-btn')?.closest('div[style*="justify-content: space-between"]');
  if (oldSelectDiv && oldSelectDiv !== movableWindow.querySelector('#cache-cleaner-inner-content')?.previousSibling) {
    oldSelectDiv.remove();
  }
  
  const newTabsDiv = document.createElement('div');
  newTabsDiv.style.cssText = 'display: flex; gap:8px; padding:12px; border-bottom: 1px solid var(--modal-input-border, #313244); flex-wrap:wrap; flex-shrink:0;';
  newTabsDiv.innerHTML = `
    <button id="storage-local-btn" class="storage-tab active" data-storage="local">📦 localStorage</button>
    <button id="storage-session-btn" class="storage-tab" data-storage="session">🔄 sessionStorage</button>
    <button id="storage-cache-btn" class="storage-tab" data-storage="cache">💾 Cache Storage</button>
    <button id="delete-all-storage-btn" class="storage-tab danger" style="background:#7f1a1a; color:white;">⚠️ BORRAR TODO</button>
  `;
  
  const paginationDiv = document.createElement('div');
  paginationDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; gap: 8px; flex-shrink:0;';
  paginationDiv.innerHTML = `
    <span id="cache-total-items" style="color:#a0a0b0; font-size:12px;">0 elementos totales</span>
    <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
      <button id="cache-prev-btn" class="cache-page-nav-btn" style="padding:6px 12px; border:none; border-radius:8px; background:rgba(255,255,255,0.1); color:#e0e0e0; cursor:pointer;">◀ Anterior</button>
      <span id="cache-page-indicator" style="color:#e0e0e0; font-size:12px;">Página 1 de 1</span>
      <button id="cache-next-btn" class="cache-page-nav-btn" style="padding:6px 12px; border:none; border-radius:8px; background:rgba(255,255,255,0.1); color:#e0e0e0; cursor:pointer;">Siguiente ▶</button>
    </div>
  `;
  
  const selectDiv = document.createElement('div');
  selectDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; gap: 8px; flex-shrink:0;';
  selectDiv.innerHTML = `
    <button id="cache-select-all-btn" class="cache-select-all-btn" style="padding:6px 14px; border:none; border-radius:8px; background:rgba(20,184,166,0.2); color:#14b8a6; cursor:pointer;">✅ Seleccionar todo</button>
    <span id="cache-selection-count" style="color:#a0a0b0; font-size:12px;">0 seleccionados/0</span>
  `;
  
  const oldFooter = movableWindow.querySelector('div[style*="display:flex; justify-content:flex-end; gap:12px; padding:16px"]');
  if (oldFooter) {
    oldFooter.style.cssText = 'display: flex; justify-content: center; gap: 20px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); flex-shrink:0;';
    const cancelBtn = oldFooter.querySelector('#cache-cancel-btn');
    const acceptBtn = oldFooter.querySelector('#cache-accept-btn');
    if (cancelBtn) {
      cancelBtn.style.cssText = 'padding: 8px 24px; border: none; border-radius: 20px; cursor: pointer; background: rgba(239,68,68,0.2); color: #f87171;';
    }
    if (acceptBtn) {
      acceptBtn.style.cssText = 'padding: 8px 24px; border: none; border-radius: 20px; cursor: pointer; background: rgba(20,184,166,0.2); color: #14b8a6;';
    }
  }
  
  const innerContent = movableWindow.querySelector('#cache-cleaner-inner-content');
  if (innerContent) {
    innerContent.style.cssText = 'flex: 1; overflow-y: auto; padding: 16px; min-height: 0;';
  }
  
  const firstDiv = movableWindow.children[0];
  const headerDiv = movableWindow.querySelector('#cache-cleaner-modal-header');
  
  if (headerDiv && headerDiv.nextSibling) {
    movableWindow.insertBefore(newTabsDiv, headerDiv.nextSibling);
    movableWindow.insertBefore(paginationDiv, newTabsDiv.nextSibling);
    movableWindow.insertBefore(selectDiv, paginationDiv.nextSibling);
  } else {
    movableWindow.appendChild(newTabsDiv);
    movableWindow.appendChild(paginationDiv);
    movableWindow.appendChild(selectDiv);
  }
  
  movableWindow.style.flexDirection = 'column';
}

function initCacheModal() {
  cacheWindowElement = document.getElementById('cache-cleaner-movable-window');
  cacheHeaderElement = document.getElementById('cache-cleaner-modal-header');
  cacheCloseBtn = document.getElementById('close-cache-cleaner-modal');
  cacheOverlay = document.getElementById('cache-cleaner-overlay');
  
  if (!cacheWindowElement || !cacheHeaderElement) return;
  
  cacheWindowElement.style.display = 'none';
  
  if (cacheOverlay) {
    cacheOverlay.style.display = 'none';
    associateOverlay(cacheWindowElement, cacheOverlay);
  }
  
  rebuildCacheModalStructure();
  setupCacheInteract();
  
  if (cacheCloseBtn) {
    cacheCloseBtn.onclick = () => hideCacheModal();
  }
  
  if (cacheOverlay) {
    cacheOverlay.onclick = () => hideCacheModal();
  }
  
  registerModal(cacheWindowElement, 'cache-cleaner-modal');
  
  const localBtn = document.getElementById('storage-local-btn');
  const sessionBtn = document.getElementById('storage-session-btn');
  const cacheBtn = document.getElementById('storage-cache-btn');
  const deleteAllBtn = document.getElementById('delete-all-storage-btn');
  const cancelBtn = document.getElementById('cache-cancel-btn');
  const acceptBtn = document.getElementById('cache-accept-btn');
  const selectAllBtn = document.getElementById('cache-select-all-btn');
  
  if (cancelBtn) cancelBtn.addEventListener('click', () => hideCacheModal());
  if (acceptBtn) acceptBtn.addEventListener('click', deleteSelectedCacheItems);
  if (selectAllBtn) selectAllBtn.addEventListener('click', handleSelectAll);
  if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => { hideCacheModal(); deleteAllStorage(); });
  if (localBtn) localBtn.addEventListener('click', () => updateStorageTabs('local'));
  if (sessionBtn) sessionBtn.addEventListener('click', () => updateStorageTabs('session'));
  if (cacheBtn) cacheBtn.addEventListener('click', () => updateStorageTabs('cache'));
  
  window.addEventListener('resize', () => {
    if (isCacheModalOpen && cacheWindowElement) {
      const rect = cacheWindowElement.getBoundingClientRect();
      const maxWidth = window.innerWidth * 0.95;
      const maxHeight = window.innerHeight * 0.9;
      if (rect.width > maxWidth) cacheWindowElement.style.width = `${maxWidth}px`;
      if (rect.height > maxHeight) cacheWindowElement.style.height = `${maxHeight}px`;
      centerCacheModal();
    }
  });
}

function showCacheModal() {
  if (isCacheModalOpen) return;
  if (!cacheWindowElement) initCacheModal();
  if (!cacheWindowElement) return;
  
  if (cacheOverlay) {
    cacheOverlay.style.display = 'block';
    cacheOverlay.classList.add('active');
  }
  cacheWindowElement.style.display = 'flex';
  centerCacheModal();
  isCacheModalOpen = true;
  
  if (typeof bringModalToFront === 'function') {
    bringModalToFront('cache-cleaner-modal');
  }
  
  refreshCacheDisplay();
}

function hideCacheModal() {
  if (!isCacheModalOpen) return;
  if (cacheWindowElement) cacheWindowElement.style.display = 'none';
  if (cacheOverlay) {
    cacheOverlay.classList.remove('active');
    cacheOverlay.style.display = 'none';
  }
  isCacheModalOpen = false;
}

function createMenuStructure() {
  const container = document.getElementById('hamburgerMenuContainer');
  if (!container) return;
  const menu = document.createElement('div');
  menu.className = 'hamburger-menu';
  menu.style.display = 'none';
  menu.innerHTML = `<ul><li><button id="avatarOptionBtn">Cambiar foto de perfil</button></li><li><button id="themeOptionBtn">Cambiar tema</button></li><li><button id="deleteChatBtn">️Eliminar chat</button></li><li><button id="clearCacheBtn">Limpiar caché</button></li><li><button id="soundSettingsBtn">Sonidos del chat</button></li></ul>`;
  container.appendChild(menu);
  menuElement = menu;
}

function attachEvents() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  if (!hamburgerBtn) return;
  hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
  document.getElementById('avatarOptionBtn')?.addEventListener('click', () => { closeMenu(); showAvatarEditor(); });
  document.getElementById('themeOptionBtn')?.addEventListener('click', () => { closeMenu(); if (typeof window.showThemeModal === 'function') window.showThemeModal(); });
  document.getElementById('deleteChatBtn')?.addEventListener('click', () => { closeMenu(); deleteAllMessages(); });
  document.getElementById('clearCacheBtn')?.addEventListener('click', () => { closeMenu(); showCacheModal(); });
  document.getElementById('soundSettingsBtn')?.addEventListener('click', () => { closeMenu(); showSoundSettingsModal(); });
  document.addEventListener('click', (e) => { if (isMenuOpen && menuElement && !menuElement.contains(e.target) && e.target !== hamburgerBtn) closeMenu(); });
}

async function deleteAllMessages() {
  const confirmed = await showCustomPopup('¿Eliminar todos los mensajes del chat? Esta acción no se puede deshacer.', 'warning');
  if (!confirmed) return;
  const messagesContainer = document.getElementById('messages');
  if (messagesContainer) {
    messagesContainer.querySelectorAll('.message').forEach(msg => msg.remove());
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('reactions_')) localStorage.removeItem(key);
    }
    showTransientNotification('Todos los mensajes han sido eliminados', 2000);
  }
}

function toggleMenu() { isMenuOpen ? closeMenu() : openMenu(); }
function openMenu() { if (!menuElement) return; menuElement.style.display = 'block'; menuElement.classList.remove('leave'); menuElement.classList.add('enter'); isMenuOpen = true; }
function closeMenu() { if (!menuElement) return; menuElement.classList.remove('enter'); menuElement.classList.add('leave'); setTimeout(() => { if (menuElement && !menuElement.classList.contains('enter')) menuElement.style.display = 'none'; }, 200); isMenuOpen = false; }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

export function initHamburgerMenu() {
  initThemeManager();
  initCacheModal();
  createMenuStructure();
  attachEvents();
}