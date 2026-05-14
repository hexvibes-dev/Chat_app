import { initThemeManager } from './themeManager.js';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../Utils/modalStackManager.js';
import interact from 'interactjs';
import { showAvatarEditor } from './AvatarEditorModal.js';
import { showNotification } from '../Utils/notifications.js';
import { showSoundSettingsModal } from '../Sounds/SoundSettingsModal.js';

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
    return '<div class="cache-empty-state">No hay datos en este almacenamiento</div>';
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
      if (container) container.innerHTML = '<div class="cache-empty-state">No hay datos en este almacenamiento</div>';
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
  
  sessionStorage.setItem('should_reload_after_cache_close', 'true');
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
  
  sessionStorage.setItem('should_reload_after_cache_close', 'true');
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
      z-index: 50001;
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 300px;
      max-width: 90vw;
      text-align: center;

       background: var(--alert-clean-cache-and-chat-pop-up-background);
        backdrop-filter: var(--alert-clean-cache-and-chat-pop-up-blur);
        opacity: var(--alert-clean-cache-and-chat-pop-up-opacity);

        border-top: var(--alert-clean-cache-and-chat-pop-up-border-top-width) var(--alert-clean-cache-and-chat-pop-up-border-top-style) var(--alert-clean-cache-and-chat-pop-up-border-top-color);
      border-right: var(--alert-clean-cache-and-chat-pop-up-border-right-width) var(--alert-clean-cache-and-chat-pop-up-border-right-style) var(--alert-clean-cache-and-chat-pop-up-border-right-color);
      border-bottom: var(--alert-clean-cache-and-chat-pop-up-border-bottom-width) var(--alert-clean-cache-and-chat-pop-up-border-bottom-style) var(--alert-clean-cache-and-chat-pop-up-border-bottom-color);
      border-left: var(--alert-clean-cache-and-chat-pop-up-border-left-width) var(--alert-clean-cache-and-chat-pop-up-border-left-style) var(--alert-clean-cache-and-chat-pop-up-border-left-color);

      border-top-left-radius: var(--alert-clean-cache-and-chat-pop-up-border-radius-top-left);
      border-top-right-radius: var(--alert-clean-cache-and-chat-pop-up-border-radius-top-right);
      border-bottom-right-radius: var(--alert-clean-cache-and-chat-pop-up-border-radius-bottom-right);
      border-bottom-left-radius: var(--alert-clean-cache-and-chat-pop-up-border-radius-bottom-left);

      box-shadow: var(--alert-clean-cache-and-chat-pop-up-shadow-external), inset var(--alert-clean-cache-and-chat-pop-up-shadow-internal);

      padding-top: var(--alert-clean-cache-and-chat-pop-up-padding-top);
      padding-right: var(--alert-clean-cache-and-chat-pop-up-padding-right);
      padding-bottom: var(--alert-clean-cache-and-chat-pop-up-padding-bottom);
    padding-left: var(--alert-clean-cache-and-chat-pop-up-padding-left);

  margin-top: var(--alert-clean-cache-and-chat-pop-up-margin-top);
  margin-right: var(--alert-clean-cache-and-chat-pop-up-margin-right);
  margin-bottom: var(--alert-clean-cache-and-chat-pop-up-margin-bottom);
  margin-left: var(--alert-clean-cache-and-chat-pop-up-margin-left);

  font-family: var(--alert-clean-cache-and-chat-pop-up-font-family);
  font-size: var(--alert-clean-cache-and-chat-pop-up-font-size);
  font-weight: var(--alert-clean-cache-and-chat-pop-up-font-weight);
  line-height: var(--alert-clean-cache-and-chat-pop-up-line-height);
  letter-spacing: var(--alert-clean-cache-and-chat-pop-up-letter-spacing);
  word-spacing: var(--alert-clean-cache-and-chat-pop-up-word-spacing);
  text-transform: var(--alert-clean-cache-and-chat-pop-up-text-transform);
  text-shadow: var(--alert-clean-cache-and-chat-pop-up-text-shadow);
  font-style: var(--alert-clean-cache-and-chat-pop-up-font-style);
  color: var(--alert-clean-cache-and-chat-pop-up-color);

  animation: var(--alert-clean-cache-and-chat-pop-up-animation);
    `;
    popup.innerHTML = `
      <div style="font-size: 48px;">${type === 'danger' ? '⚠️' : '❓'}</div>
      <p style="margin-top: var(--text-alert-clean-cache-and-chat-pop-up-margin-top); margin-right: var(--text-alert-clean-cache-and-chat-pop-up-margin-right); margin-bottom: var(--text-alert-clean-cache-and-chat-pop-up-margin-bottom); margin-left: var(--text-alert-clean-cache-and-chat-pop-up-margin-left); font-size: var(--text-alert-clean-cache-and-chat-pop-up-font-size); font-family: var(--text-alert-clean-cache-and-chat-pop-up-font-family); font-weight: var(--text-alert-clean-cache-and-chat-pop-up-font-weight); line-height: var(--text-alert-clean-cache-and-chat-pop-up-line-height); letter-spacing: var(--text-alert-clean-cache-and-chat-pop-up-letter-spacing); word-spacing: var(--text-alert-clean-cache-and-chat-pop-up-word-spacing); text-transform: var(--text-alert-clean-cache-and-chat-pop-up-text-transform); text-shadow: var(--text-alert-clean-cache-and-chat-pop-up-text-shadow); font-style: var(--text-alert-clean-cache-and-chat-pop-up-font-style); color: var(--text-alert-clean-cache-and-chat-pop-up-color); white-space: pre-wrap; background: var(--text-alert-clean-cache-and-chat-pop-up-background); backdrop-filter: var(--text-alert-clean-cache-and-chat-pop-up-blur); opacity: var(--text-alert-clean-cache-and-chat-pop-up-opacity); border-top: var(--text-alert-clean-cache-and-chat-pop-up-border-top-width) var(--text-alert-clean-cache-and-chat-pop-up-border-top-style) var(--text-alert-clean-cache-and-chat-pop-up-border-top-color); border-right: var(--text-alert-clean-cache-and-chat-pop-up-border-right-width) var(--text-alert-clean-cache-and-chat-pop-up-border-right-style) var(--text-alert-clean-cache-and-chat-pop-up-border-right-color); border-bottom: var(--text-alert-clean-cache-and-chat-pop-up-border-bottom-width) var(--text-alert-clean-cache-and-chat-pop-up-border-bottom-style) var(--text-alert-clean-cache-and-chat-pop-up-border-bottom-color); border-left: var(--text-alert-clean-cache-and-chat-pop-up-border-left-width) var(--text-alert-clean-cache-and-chat-pop-up-border-left-style) var(--text-alert-clean-cache-and-chat-pop-up-border-left-color); border-top-left-radius: var(--text-alert-clean-cache-and-chat-pop-up-border-radius-top-left); border-top-right-radius: var(--text-alert-clean-cache-and-chat-pop-up-border-radius-top-right); border-bottom-right-radius: var(--text-alert-clean-cache-and-chat-pop-up-border-radius-bottom-right); border-bottom-left-radius: var(--text-alert-clean-cache-and-chat-pop-up-border-radius-bottom-left); box-shadow: var(--text-alert-clean-cache-and-chat-pop-up-shadow-external), inset var(--text-alert-clean-cache-and-chat-pop-up-shadow-internal); padding-top: var(--text-alert-clean-cache-and-chat-pop-up-padding-top); padding-right: var(--text-alert-clean-cache-and-chat-pop-up-padding-right); padding-bottom: var(--text-alert-clean-cache-and-chat-pop-up-padding-bottom); padding-left: var(--text-alert-clean-cache-and-chat-pop-up-padding-left);">${escapeHtml(message)}</p>
      <div style="background: var(--alert-buttons-backgrond-background); backdrop-filter: var(--alert-buttons-backgrond-blur); opacity: var(--alert-buttons-backgrond-opacity); border-top: var(--alert-buttons-backgrond-border-top-width) var(--alert-buttons-backgrond-border-top-style) var(--alert-buttons-backgrond-border-top-color); border-right: var(--alert-buttons-backgrond-border-right-width) var(--alert-buttons-backgrond-border-right-style) var(--alert-buttons-backgrond-border-right-color); border-bottom: var(--alert-buttons-backgrond-border-bottom-width) var(--alert-buttons-backgrond-border-bottom-style) var(--alert-buttons-backgrond-border-bottom-color); border-left: var(--alert-buttons-backgrond-border-left-width) var(--alert-buttons-backgrond-border-left-style) var(--alert-buttons-backgrond-border-left-color); border-top-left-radius: var(--alert-buttons-backgrond-border-radius-top-left); border-top-right-radius: var(--alert-buttons-backgrond-border-radius-top-right); border-bottom-right-radius: var(--alert-buttons-backgrond-border-radius-bottom-right); border-bottom-left-radius: var(--alert-buttons-backgrond-border-radius-bottom-left); box-shadow: var(--alert-buttons-backgrond-shadow-external), inset var(--alert-buttons-backgrond-shadow-internal); padding-top: var(--alert-buttons-backgrond-padding-top); padding-right: var(--alert-buttons-backgrond-padding-right); padding-bottom: var(--alert-buttons-backgrond-padding-bottom); padding-left: var(--alert-buttons-backgrond-padding-left); margin-top: var(--alert-buttons-backgrond-margin-top); margin-right: var(--alert-buttons-backgrond-margin-right); margin-bottom: var(--alert-buttons-backgrond-margin-bottom); margin-left: var(--alert-buttons-backgrond-margin-left); display: flex; justify-content: center; gap: 20px;">
        
        <button class="popup-btn-no" style="background: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-background); backdrop-filter: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-blur); opacity: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-opacity); border-top: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-top-width) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-top-style) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-top-color); border-right: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-right-width) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-right-style) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-right-color); border-bottom: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-bottom-width) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-bottom-style) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-bottom-color); border-left: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-left-width) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-left-style) var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-left-color); border-top-left-radius: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-radius-top-left); border-top-right-radius: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-radius-top-right); border-bottom-right-radius: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-radius-bottom-right); border-bottom-left-radius: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-border-radius-bottom-left); box-shadow: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-shadow-external), inset var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-shadow-internal); padding-top: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-padding-top); padding-right: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-padding-right); padding-bottom: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-padding-bottom); padding-left: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-padding-left); font-family: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-font-family); font-size: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-font-size); font-weight: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-font-weight); line-height: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-line-height); letter-spacing: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-letter-spacing); word-spacing: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-word-spacing); text-transform: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-text-transform); text-shadow: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-text-shadow); font-style: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-font-style); color: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-color); transition: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-transition); cursor: pointer; width: var(--alert-ckean-cache-and-chat-pop-up-cancel-buttom-width);">Cancelar</button>
        
        <button class="popup-btn-yes" style="background: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-background); backdrop-filter: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-blur); opacity: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-opacity); border-top: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-top-width) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-top-style) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-top-color); border-right: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-right-width) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-right-style) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-right-color); border-bottom: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-bottom-width) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-bottom-style) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-bottom-color); border-left: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-left-width) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-left-style) var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-left-color); border-top-left-radius: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-radius-top-left); border-top-right-radius: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-radius-top-right); border-bottom-right-radius: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-radius-bottom-right); border-bottom-left-radius: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-border-radius-bottom-left); box-shadow: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-shadow-external), inset var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-shadow-internal); padding-top: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-padding-top); padding-right: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-padding-right); padding-bottom: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-padding-bottom); padding-left: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-padding-left); font-family: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-font-family); font-size: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-font-size); font-weight: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-font-weight); line-height: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-line-height); letter-spacing: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-letter-spacing); word-spacing: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-word-spacing); text-transform: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-text-transform); text-shadow: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-text-shadow); font-style: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-font-style); color: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-color); transition: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-transition); cursor: pointer; width: var(--alert-ckean-cache-and-chat-pop-up-confirm-buttom-width);">Confirmar</button>
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
        min: { width: 100, height: 150 },
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
  newTabsDiv.classList.add('tabs-container');
  newTabsDiv.innerHTML = `
    <button id="storage-local-btn" class="storage-tab active" data-storage="local">localStorage</button>
    <button id="storage-session-btn" class="storage-tab" data-storage="session">sessionStorage</button>
    <button id="storage-cache-btn" class="storage-tab" data-storage="cache">cache storage</button>
    <button id="delete-all-storage-btn" class="storage-tab danger">BORRAR TODO</button>
  `;

  const paginationDiv = document.createElement('div');
  paginationDiv.innerHTML = `
    <div class="total-items-container">
    <span id="cache-total-items">0 elementos totales</span>
    </div>
    <div id="cache-nezt-prev-container">
      <button id="cache-prev-btn" class="cache-page-nav-btn" >◀ Anterior</button>
      
      <span id="cache-page-indicator">Página 1 de 1</span>
      
      <button id="cache-next-btn" class="cache-page-nav-btn" >Siguiente ▶</button>
    </div>
  `;

  const selectDiv = document.createElement('div');
  selectDiv.classList.add('cache-xleaner-btn-cont-select');
  selectDiv.innerHTML = `
    <button id="cache-select-all-btn" class="cache-select-all-btn">✅ Seleccionar todo</button>
    <span id="cache-selection-count">0 seleccionados/0</span>
  `;

  const oldFooter = movableWindow.querySelector('div[style*="display:flex; justify-content:flex-end; gap:12px; padding:16px;"]');
  if (oldFooter) {
    oldFooter.style.cssText = 'display:flex;justify-content:center;gap:20px;padding:12px 16px;flex-shrink:0;background:var(--cache-cleanner-footer-background);backdrop-filter:var(--cache-cleanner-footer-blur);opacity:var(--cache-cleanner-footer-opacity);border-top:var(--cache-cleanner-footer-border-top-width) var(--cache-cleanner-footer-border-top-style) var(--cache-cleanner-footer-border-top-color);border-right:var(--cache-cleanner-footer-border-right-width) var(--cache-cleanner-footer-border-right-style) var(--cache-cleanner-footer-border-right-color);border-bottom:var(--cache-cleanner-footer-border-bottom-width) var(--cache-cleanner-footer-border-bottom-style) var(--cache-cleanner-footer-border-bottom-color);border-left:var(--cache-cleanner-footer-border-left-width) var(--cache-cleanner-footer-border-left-style) var(--cache-cleanner-footer-border-left-color);border-top-left-radius:var(--cache-cleanner-footer-border-radius-top-left);border-top-right-radius:var(--cache-cleanner-footer-border-radius-top-right);border-bottom-right-radius:var(--cache-cleanner-footer-border-radius-bottom-right);border-bottom-left-radius:var(--cache-cleanner-footer-border-radius-bottom-left);box-shadow:var(--cache-cleanner-footer-shadow-external),inset var(--cache-cleanner-footer-shadow-internal);outline:var(--cache-cleanner-footer-outline-width) var(--cache-cleanner-footer-outline-style) var(--cache-cleanner-footer-outline-color);outline-offset:var(--cache-cleanner-footer-outline-offset);';
    const cancelBtn = oldFooter.querySelector('#cache-cancel-btn');
    const acceptBtn = oldFooter.querySelector('#cache-accept-btn');
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
  registerModal(cacheWindowElement, 'cache-cleaner-modal');
  cacheWindowElement.addEventListener('mousedown', () => {
    bringModalToFront('cache-cleaner-modal');
  });
  cacheWindowElement.addEventListener('touchstart', () => {
    bringModalToFront('cache-cleaner-modal');
  });

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
  bringModalToFront('cache-cleaner-modal');

  refreshCacheDisplay();
}

function hideCacheModal() {
  if (!isCacheModalOpen) return;
  
  const shouldReload = sessionStorage.getItem('should_reload_after_cache_close') === 'true';
  if (shouldReload) {
    sessionStorage.removeItem('should_reload_after_cache_close');
    window.location.reload();
    return;
  }
  
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