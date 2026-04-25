// src/scripts/themeManager.js

import interact from 'interactjs';
import { registerModal, unregisterModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';

const STORAGE_THEME = 'chat_theme_prefs';
const STORAGE_BG_MODE = 'chat_bg_mode';
const STORAGE_CUSTOM_BG = 'chat_custom_bg';
const STORAGE_BG_OPACITY = 'chat_bg_opacity';
const STORAGE_USER_IMAGES = 'chat_user_images';

const ALLOWED_THEMES = ['dark', 'light', 'cristal', 'forest', 'ocean', 'whatsapp', 'midnight', /*'reference', */ 'magenta' , 'nuevo'];

const themes = {
  dark: { name: 'Oscuro', bg: '/img/dark.jpg', color: '#17212b' },
  light: { name: 'Claro', bg: '/img/light.jpg', color: '#f8fafc' },
  cristal: { name: 'Cristal', bg: '/img/bg.jpg', color: '#1e293b' },
  forest: { name: 'Bosque', bg: '/img/bg-forest.jpg', color: '#1e3a1e' },
  ocean: { name: 'Océano', bg: '/img/ballena.jpg', color: '#082f49' },
  magenta: { name: 'Magenta', bg: '/img/patron1.jpg', color: '#16222F' },
  whatsapp: { name: 'WhatsApp', bg: '/img/dark.jpg', color: '#e5ddd5' },
  midnight: { name: 'Midnight', bg: '/img/magic.jpg', color: '#0b0f19' },
 // reference: { name: 'Referencia', bg: '/img/dark.jpg', color: '#030F0F' },
  nuevo: { name: 'nuevo', bg: '/img/dark.jpg', color: '#030F0F' }
};

const nativeBackgroundsGrouped = {
  movil: [
    { name: 'Bosque encantado version movil', url: '/img/bg.jpg' },
    { name: 'Nubes', url: '/img/nubes.jpg' }
  ],
  tableta: [
    { name: 'Ballena', url: '/img/ballena.jpg' }
  ],
  pc: [
    { name: 'Bosque encantado version pc', url: '/img/magic.jpg' }
  ],
  'colores solidos': [
    { name: 'Blanco', url: '/img/light.jpg', color: '#ffffff' },
    { name: 'Negro', url: '/img/dark.jpg', color: '#000000' },
    { name: 'Negro', url: '/img/patron1.jpg', color: '#000000' }
  ]
};

function getUserImages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USER_IMAGES) || '[]');
  } catch {
    return [];
  }
}

function saveUserImage(dataUrl) {
  const images = getUserImages();
  if (!images.includes(dataUrl)) {
    images.unshift(dataUrl);
    if (images.length > 20) images.pop();
    localStorage.setItem(STORAGE_USER_IMAGES, JSON.stringify(images));
  }
}

function removeUserImages(urls) {
  const toRemove = new Set(urls);
  const images = getUserImages().filter(url => !toRemove.has(url));
  localStorage.setItem(STORAGE_USER_IMAGES, JSON.stringify(images));
  return images;
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

export function getCurrentBgMode() {
  return localStorage.getItem(STORAGE_BG_MODE) || 'theme';
}

export function getCurrentCustomBg() {
  return localStorage.getItem(STORAGE_CUSTOM_BG) || '';
}

export function getCurrentBgOpacity() {
  const saved = localStorage.getItem(STORAGE_BG_OPACITY);
  return saved !== null ? parseFloat(saved) : 1;
}

function saveConfirmedState(theme, bgMode, customBgUrl, opacity = null) {
  localStorage.setItem(STORAGE_THEME, JSON.stringify({ theme, bg: customBgUrl || null }));
  localStorage.setItem(STORAGE_BG_MODE, bgMode);
  if (bgMode === 'custom' && customBgUrl) {
    localStorage.setItem(STORAGE_CUSTOM_BG, customBgUrl);
  } else {
    localStorage.removeItem(STORAGE_CUSTOM_BG);
  }
  if (opacity !== null) {
    localStorage.setItem(STORAGE_BG_OPACITY, opacity.toString());
  }
}

function applyConfirmedBackground(theme, bgMode, customBgUrl, opacity = null) {
  const root = document.documentElement;
  const themeObj = themes[theme] || themes.dark;
  let finalBgUrl = null;
  if (bgMode === 'custom' && customBgUrl) {
    finalBgUrl = customBgUrl;
  } else if (themeObj.bg) {
    finalBgUrl = themeObj.bg;
  }
  const bgColor = themeObj.color;
  const finalOpacity = opacity !== null ? opacity : getCurrentBgOpacity();
  if (finalBgUrl) {
    root.style.setProperty('--app-bg-image', `url('${finalBgUrl}')`);
  } else {
    root.style.setProperty('--app-bg-image', 'none');
  }
  root.style.setProperty('--app-bg-color', bgColor);
  root.style.setProperty('--app-bg-opacity', finalOpacity.toString());
}

export function setTheme(themeId) {
  if (!ALLOWED_THEMES.includes(themeId)) return;
  const currentBgMode = getCurrentBgMode();
  const currentCustomBg = getCurrentCustomBg();
  const currentOpacity = getCurrentBgOpacity();
  document.documentElement.setAttribute('data-theme', themeId);
  saveConfirmedState(themeId, currentBgMode, currentCustomBg, currentOpacity);
  applyConfirmedBackground(themeId, currentBgMode, currentCustomBg, currentOpacity);
}

export function setCustomBackground(url) {
  const currentTheme = getCurrentTheme();
  const currentOpacity = getCurrentBgOpacity();
  saveConfirmedState(currentTheme, 'custom', url, currentOpacity);
  applyConfirmedBackground(currentTheme, 'custom', url, currentOpacity);
  if (url && url.startsWith('data:')) {
    saveUserImage(url);
  }
}

export function resetToThemeBackground() {
  const currentTheme = getCurrentTheme();
  const currentOpacity = getCurrentBgOpacity();
  saveConfirmedState(currentTheme, 'theme', '', currentOpacity);
  applyConfirmedBackground(currentTheme, 'theme', '', currentOpacity);
}

export function setBackgroundOpacity(opacity) {
  const currentTheme = getCurrentTheme();
  const currentBgMode = getCurrentBgMode();
  const currentCustomBg = getCurrentCustomBg();
  saveConfirmedState(currentTheme, currentBgMode, currentCustomBg, opacity);
  applyConfirmedBackground(currentTheme, currentBgMode, currentCustomBg, opacity);
}

export function getThemes() {
  return themes;
}

export function getNativeBackgroundsGrouped() {
  return nativeBackgroundsGrouped;
}

let draftOpacity = 1;
let draftBgMode = null;
let draftCustomBg = null;
let draftTheme = null;
let confirmedTheme = null;
let confirmedBgMode = null;
let confirmedCustomBg = null;
let confirmedOpacity = 1;

let currentPreviewUrl = null;
let preOpacityDraftOpacity = 1;
let preOpacityDraftBgMode = null;
let preOpacityDraftCustomBg = null;
let preOpacityDraftTheme = null;
let preOpacityPreviewUrl = null;
let opacityImageChanged = false;

let userImagesDeleteMode = false;
let selectedUserImages = new Set();

function getDraftSnapshot() {
  return {
    draftOpacity,
    draftBgMode,
    draftCustomBg,
    draftTheme,
    currentPreviewUrl
  };
}

function restoreDraftSnapshot(snapshot) {
  if (!snapshot) return;
  draftOpacity = snapshot.draftOpacity;
  draftBgMode = snapshot.draftBgMode;
  draftCustomBg = snapshot.draftCustomBg;
  draftTheme = snapshot.draftTheme;
  currentPreviewUrl = snapshot.currentPreviewUrl;
  applyDraftPreview();
  updateActiveIndicators();
}

function buildUserImagesSectionHtml() {
  const userImages = getUserImages();
  if (!userImages.length) return '';
  return `
    <div class="bg-category" data-category="user">
      <button class="bg-category-header" type="button" data-user-header="1">
        <span>Tus fondos</span>
        <span class="arrow">▼</span>
      </button>
      <div class="bg-category-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out, padding 0.3s ease; padding-top: 0;">
        <div class="user-images-toolbar" style="display:flex; gap:8px; margin: 8px 0 12px; flex-wrap: wrap;">
          <button type="button" class="btn-secondary user-images-toggle-select" style="flex:1; min-width: 120px;">
            ${userImagesDeleteMode ? 'Cancelar' : 'Seleccionar'}
          </button>
          <button type="button" class="btn-secondary user-images-select-all" style="flex:1; min-width: 120px; ${userImagesDeleteMode ? '' : 'opacity: 0.5;'}" ${userImagesDeleteMode ? '' : 'disabled'}>
            Todo
          </button>
          <button type="button" class="btn-cancel user-images-delete" style="flex:1; min-width: 120px; ${userImagesDeleteMode ? '' : 'opacity: 0.5;'}" ${userImagesDeleteMode ? '' : 'disabled'}>
            Eliminar${selectedUserImages.size ? ` (${selectedUserImages.size})` : ''}
          </button>
        </div>
        <div class="bg-options">
          ${userImages.map(url => `
            <div class="bg-preview ${draftBgMode === 'custom' && draftCustomBg === url ? 'active' : ''} ${selectedUserImages.has(url) ? 'user-delete-selected' : ''}" data-bg="${url}" data-user-image="1" style="background-image: url('${url}'); position: relative; ${userImagesDeleteMode && selectedUserImages.has(url) ? 'outline: 3px solid #ef4444; outline-offset: 2px;' : ''}">
              ${userImagesDeleteMode ? `<span style="position:absolute; top:6px; right:6px; background: rgba(0,0,0,0.65); color: #fff; border-radius: 999px; padding: 2px 6px; font-size: 11px; line-height: 1;">${selectedUserImages.has(url) ? '✓' : '+'}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function toggleCategoryContent(header) {
  const categoryDiv = header.closest('.bg-category');
  if (!categoryDiv) return;
  const content = categoryDiv.querySelector('.bg-category-content');
  const arrow = header.querySelector('.arrow');
  if (!content) return;
  const isExpanded = content.classList.contains('expanded');
  if (isExpanded) {
    content.style.maxHeight = '0px';
    content.style.paddingTop = '0';
    content.classList.remove('expanded');
    if (arrow) arrow.textContent = '▼';
  } else {
    content.style.display = 'block';
    requestAnimationFrame(() => {
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.paddingTop = '12px';
    });
    content.classList.add('expanded');
    if (arrow) arrow.textContent = '▲';
  }
}

function bindUserImagesSection() {
  const userCategory = document.querySelector('.bg-category[data-category="user"]');
  if (!userCategory) return;
  const header = userCategory.querySelector('.bg-category-header');
  const content = userCategory.querySelector('.bg-category-content');
  if (header) {
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);
    newHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCategoryContent(newHeader);
    });
  }
  const toggleBtn = userCategory.querySelector('.user-images-toggle-select');
  const selectAllBtn = userCategory.querySelector('.user-images-select-all');
  const deleteBtn = userCategory.querySelector('.user-images-delete');
  const previews = userCategory.querySelectorAll('.bg-preview[data-user-image="1"]');
  if (toggleBtn) {
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    newToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userImagesDeleteMode = !userImagesDeleteMode;
      if (!userImagesDeleteMode) selectedUserImages.clear();
      refreshUserImagesSection();
    });
  }
  if (selectAllBtn) {
    const newSelectAllBtn = selectAllBtn.cloneNode(true);
    selectAllBtn.parentNode.replaceChild(newSelectAllBtn, selectAllBtn);
    newSelectAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!userImagesDeleteMode) return;
      selectedUserImages = new Set(getUserImages());
      refreshUserImagesSection();
    });
  }
  if (deleteBtn) {
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    newDeleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!userImagesDeleteMode) return;
      deleteSelectedUserImages();
    });
  }
  previews.forEach(preview => {
    const newPreview = preview.cloneNode(true);
    preview.parentNode.replaceChild(newPreview, preview);
    newPreview.addEventListener('click', (e) => {
      e.stopPropagation();
      const bgValue = newPreview.dataset.bg;
      if (userImagesDeleteMode) {
        if (selectedUserImages.has(bgValue)) selectedUserImages.delete(bgValue);
        else selectedUserImages.add(bgValue);
        refreshUserImagesSection();
        return;
      }
      const snapshot = getDraftSnapshot();
      draftBgMode = 'custom';
      draftCustomBg = bgValue;
      document.querySelectorAll('#theme-content .bg-preview').forEach(p => p.classList.remove('active'));
      newPreview.classList.add('active');
      applyDraftPreview();
      if (bgValue && !bgValue.startsWith('color:')) {
        showOpacityModal(bgValue, null, (newImageUrl) => {
          draftBgMode = 'custom';
          draftCustomBg = newImageUrl;
          applyDraftPreview();
          updateActiveIndicators();
          refreshUserImagesSection();
        }, snapshot);
      }
    });
  });
}

function refreshUserImagesSection() {
  const contentDiv = document.getElementById('theme-content');
  if (!contentDiv) return;
  const existing = contentDiv.querySelector('.bg-category[data-category="user"]');
  const userImages = getUserImages();
  if (!userImages.length) {
    if (existing) existing.remove();
    return;
  }
  if (!existing) {
    const sectionHtml = buildUserImagesSectionHtml();
    const fondosHeader = Array.from(contentDiv.querySelectorAll('h3')).find(h => h.textContent.trim() === 'Fondos');
    if (fondosHeader) fondosHeader.insertAdjacentHTML('afterend', sectionHtml);
    else contentDiv.insertAdjacentHTML('beforeend', sectionHtml);
    bindUserImagesSection();
    return;
  }
  const content = existing.querySelector('.bg-category-content');
  const toolbar = content.querySelector('.user-images-toolbar');
  const bgOptions = content.querySelector('.bg-options');
  if (toolbar) {
    toolbar.innerHTML = `
      <button type="button" class="btn-secondary user-images-toggle-select" style="flex:1; min-width: 120px;">
        ${userImagesDeleteMode ? 'Cancelar' : 'Seleccionar'}
      </button>
      <button type="button" class="btn-secondary user-images-select-all" style="flex:1; min-width: 120px; ${userImagesDeleteMode ? '' : 'opacity: 0.5;'}" ${userImagesDeleteMode ? '' : 'disabled'}>
        Todo
      </button>
      <button type="button" class="btn-cancel user-images-delete" style="flex:1; min-width: 120px; ${userImagesDeleteMode ? '' : 'opacity: 0.5;'}" ${userImagesDeleteMode ? '' : 'disabled'}>
        Eliminar${selectedUserImages.size ? ` (${selectedUserImages.size})` : ''}
      </button>
    `;
  }
  if (bgOptions) {
    bgOptions.innerHTML = userImages.map(url => `
      <div class="bg-preview ${draftBgMode === 'custom' && draftCustomBg === url ? 'active' : ''} ${selectedUserImages.has(url) ? 'user-delete-selected' : ''}" data-bg="${url}" data-user-image="1" style="background-image: url('${url}'); position: relative; ${userImagesDeleteMode && selectedUserImages.has(url) ? 'outline: 3px solid #ef4444; outline-offset: 2px;' : ''}">
        ${userImagesDeleteMode ? `<span style="position:absolute; top:6px; right:6px; background: rgba(0,0,0,0.65); color: #fff; border-radius: 999px; padding: 2px 6px; font-size: 11px; line-height: 1;">${selectedUserImages.has(url) ? '✓' : '+'}</span>` : ''}
      </div>
    `).join('');
  }
  bindUserImagesSection();
}

function deleteSelectedUserImages() {
  if (!selectedUserImages.size) {
    showTransientNotification('No hay fondos seleccionados');
    return;
  }
  const toDelete = Array.from(selectedUserImages);
  const deletedCurrentDraft = draftBgMode === 'custom' && draftCustomBg && selectedUserImages.has(draftCustomBg);
  const deletedCurrentConfirmed = confirmedBgMode === 'custom' && confirmedCustomBg && selectedUserImages.has(confirmedCustomBg);
  removeUserImages(toDelete);
  selectedUserImages.clear();
  userImagesDeleteMode = false;
  if (deletedCurrentDraft) {
    draftBgMode = 'theme';
    draftCustomBg = '';
    applyDraftPreview();
    updateActiveIndicators();
  }
  if (deletedCurrentConfirmed) {
    confirmedBgMode = 'theme';
    confirmedCustomBg = '';
    saveConfirmedState(confirmedTheme, 'theme', '', confirmedOpacity);
    applyConfirmedBackground(confirmedTheme, 'theme', '', confirmedOpacity);
  }
  refreshUserImagesSection();
  showTransientNotification('Fondos eliminados');
}

let opacityModal = null;
let opacitySlider = null;
let opacityPreviewImage = null;
let onOpacityGalleryRequest = null;
let onOpacityImageChange = null;

function applyDraftPreview() {
  const themeToApply = draftTheme !== null ? draftTheme : confirmedTheme;
  document.documentElement.setAttribute('data-theme', themeToApply);
  let bgUrl = null;
  if (draftBgMode === 'custom' && draftCustomBg) {
    bgUrl = draftCustomBg;
  } else if (draftBgMode === 'theme' || draftBgMode === null) {
    bgUrl = themes[themeToApply]?.bg || null;
  }
  const themeObj = themes[themeToApply] || themes.dark;
  const bgColor = themeObj.color;
  const root = document.documentElement;
  if (bgUrl) {
    root.style.setProperty('--app-bg-image', `url('${bgUrl}')`);
  } else {
    root.style.setProperty('--app-bg-image', 'none');
  }
  root.style.setProperty('--app-bg-color', bgColor);
  root.style.setProperty('--app-bg-opacity', draftOpacity.toString());
}

function updateActiveIndicators() {
  document.querySelectorAll('#theme-content .theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === draftTheme);
  });
  document.querySelectorAll('#theme-content .bg-preview').forEach(preview => {
    const bgValue = preview.dataset.bg;
    if (bgValue === 'reset') {
      preview.classList.toggle('active', draftBgMode === 'theme' && !draftCustomBg);
    } else if (bgValue && bgValue.startsWith('color:')) {
      const color = bgValue.substring(6);
      preview.classList.toggle('active', draftBgMode === 'custom' && draftCustomBg === color);
    } else {
      preview.classList.toggle('active', draftBgMode === 'custom' && draftCustomBg === bgValue);
    }
  });
}

function restoreConfirmedState() {
  draftTheme = confirmedTheme;
  draftBgMode = confirmedBgMode;
  draftCustomBg = confirmedCustomBg;
  draftOpacity = confirmedOpacity;
  applyDraftPreview();
  updateActiveIndicators();
}

function createOpacityModal() {
  if (opacityModal) return;
  opacityModal = document.createElement('div');
  opacityModal.id = 'opacity-modal';
  opacityModal.className = 'opacity-modal';
  opacityModal.style.display = 'none';
  opacityModal.innerHTML = `
    <div class="opacity-card">
      <div class="opacity-header">
        <h2>Ajustar opacidad</h2>
        <button class="opacity-close-btn" aria-label="Cerrar">✕</button>
      </div>
      <div class="opacity-preview">
        <img id="opacity-preview-img" src="" alt="Vista previa" />
      </div>
      <div class="opacity-slider-container">
        <input type="range" id="opacity-slider" min="0" max="1" step="0.01" value="1" />
      </div>
      <button class="opacity-gallery-btn" id="opacity-gallery-btn">🖼️ Elegir de galería</button>
      <div class="opacity-actions">
        <button class="btn-cancel" id="opacity-cancel">Cancelar</button>
        <button class="btn-save" id="opacity-save">Aplicar</button>
      </div>
    </div>
  `;
  document.body.appendChild(opacityModal);
  opacitySlider = document.getElementById('opacity-slider');
  opacityPreviewImage = document.getElementById('opacity-preview-img');
  const closeAndRestore = () => {
    restoreDraftSnapshot({
      draftOpacity: preOpacityDraftOpacity,
      draftBgMode: preOpacityDraftBgMode,
      draftCustomBg: preOpacityDraftCustomBg,
      draftTheme: preOpacityDraftTheme,
      currentPreviewUrl: preOpacityPreviewUrl
    });
    opacitySlider.value = preOpacityDraftOpacity;
    opacityPreviewImage.src = preOpacityPreviewUrl || opacityPreviewImage.src;
    opacityPreviewImage.style.opacity = preOpacityDraftOpacity;
    hideOpacityModal();
  };
  opacityModal.querySelector('.opacity-close-btn').onclick = closeAndRestore;
  document.getElementById('opacity-cancel').onclick = closeAndRestore;
  document.getElementById('opacity-save').onclick = () => {
    const newOpacity = parseFloat(opacitySlider.value);
    if (opacityImageChanged && currentPreviewUrl && !currentPreviewUrl.startsWith('color:')) {
      draftBgMode = 'custom';
      draftCustomBg = currentPreviewUrl;
      setCustomBackground(currentPreviewUrl);
      applyDraftPreview();
      updateActiveIndicators();
      refreshUserImagesSection();
    }
    setBackgroundOpacity(newOpacity);
    draftOpacity = newOpacity;
    hideOpacityModal();
    showTransientNotification('Opacidad actualizada');
  };
  document.getElementById('opacity-gallery-btn').onclick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          opacityPreviewImage.src = dataUrl;
          currentPreviewUrl = dataUrl;
          opacityImageChanged = true;
          if (onOpacityImageChange) onOpacityImageChange(dataUrl);
          saveUserImage(dataUrl);
        };
        reader.readAsDataURL(file);
      }
      document.body.removeChild(fileInput);
    });
    fileInput.click();
  };
  opacityModal.addEventListener('click', (e) => {
    if (e.target === opacityModal) closeAndRestore();
  });
  opacitySlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    opacityPreviewImage.style.opacity = val;
    document.documentElement.style.setProperty('--app-bg-opacity', val.toString());
    draftOpacity = val;
  });
}

function showOpacityModal(previewUrl, galleryCallback = null, imageChangeCallback = null, restoreSnapshot = null) {
  createOpacityModal();
  onOpacityGalleryRequest = galleryCallback;
  onOpacityImageChange = imageChangeCallback;
  currentPreviewUrl = previewUrl;
  opacityImageChanged = false;
  if (!previewUrl) {
    const themeObj = themes[draftTheme] || themes.dark;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = themeObj.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    previewUrl = canvas.toDataURL('image/png');
  }
  opacityPreviewImage.src = previewUrl;
  const currentOpacity = draftOpacity !== undefined ? draftOpacity : getCurrentBgOpacity();
  opacitySlider.value = currentOpacity;
  opacityPreviewImage.style.opacity = currentOpacity;
  const snapshot = restoreSnapshot || getDraftSnapshot();
  preOpacityDraftOpacity = snapshot.draftOpacity;
  preOpacityDraftBgMode = snapshot.draftBgMode;
  preOpacityDraftCustomBg = snapshot.draftCustomBg;
  preOpacityDraftTheme = snapshot.draftTheme;
  preOpacityPreviewUrl = snapshot.currentPreviewUrl;
  opacityModal.style.display = 'flex';
  const card = opacityModal.querySelector('.opacity-card');
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'bounceIn 0.4s ease-out forwards';
}

function hideOpacityModal() {
  if (opacityModal) opacityModal.style.display = 'none';
}

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    element.appendChild(handle);
  });
}

function centerModal() {
  if (!windowElement) return;
  const rect = windowElement.getBoundingClientRect();
  windowX = (window.innerWidth - rect.width) / 2;
  windowY = (window.innerHeight - rect.height) / 2;
  windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
  windowElement.setAttribute('data-x', windowX);
  windowElement.setAttribute('data-y', windowY);
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

function setupInteractForModal() {
  interact(windowElement).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 150, height: 150 },
        max: { width: window.innerWidth * 0.9, height: window.innerHeight * 0.9 }
      })
    ],
    listeners: {
      move(event) {
        let width = event.rect.width;
        let height = event.rect.height;
        windowElement.style.width = `${width}px`;
        windowElement.style.height = `${height}px`;
        windowX += event.deltaRect.left;
        windowY += event.deltaRect.top;
        windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        windowElement.setAttribute('data-x', windowX);
        windowElement.setAttribute('data-y', windowY);
        constrainAllModals();
      }
    }
  });

  interact(headerElement).draggable({
    inertia: false,
    manualStart: false,
    allowFrom: headerElement,
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
        const keyboardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
        
        if (keyboardHeight > 0) {
          const inputElement = document.getElementById('layerInput');
          if (inputElement) {
            const inputRect = inputElement.getBoundingClientRect();
            const modalRect = windowElement.getBoundingClientRect();
            const inputTop = inputRect.top;
            const modalBottom = modalRect.bottom;
            
            if (modalBottom + event.dy > inputTop - 10) {
              return;
            }
          }
        }
        
        windowX += event.dx;
        windowY += event.dy;
        windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        windowElement.setAttribute('data-x', windowX);
        windowElement.setAttribute('data-y', windowY);
        constrainAllModals();
      },
      end(event) {
        window.isDraggingModal = false;
        if (isLessThan10PercentVisible(windowElement)) {
          restoreConfirmedState();
          hideModal();
          showTransientNotification('Modal cerrado por estar fuera de pantalla');
        }
        constrainAllModals();
      }
    }
  });
}

function loadThemeContent() {
  const contentDiv = document.getElementById('theme-content');
  if (!contentDiv) return;
  confirmedTheme = getCurrentTheme();
  confirmedBgMode = getCurrentBgMode();
  confirmedCustomBg = getCurrentCustomBg();
  confirmedOpacity = getCurrentBgOpacity();
  draftTheme = confirmedTheme;
  draftBgMode = confirmedBgMode;
  draftCustomBg = confirmedCustomBg;
  draftOpacity = confirmedOpacity;
  const userImagesHtml = buildUserImagesSectionHtml();
  let bgCategoriesHtml = '';
  for (const [category, items] of Object.entries(nativeBackgroundsGrouped)) {
    bgCategoriesHtml += `
      <div class="bg-category" data-category="${category}">
        <button class="bg-category-header" type="button">
          <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
          <span class="arrow">▼</span>
        </button>
        <div class="bg-category-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out, padding 0.3s ease; padding-top: 0;">
          <div class="bg-options">
            ${items.map(item => {
              if (item.url) {
                return `<div class="bg-preview ${draftBgMode === 'custom' && draftCustomBg === item.url ? 'active' : ''}" data-bg="${item.url}" style="background-image: url('${item.url}');"></div>`;
              } else {
                return `<div class="bg-preview ${draftBgMode === 'custom' && draftCustomBg === item.color ? 'active' : ''}" data-bg="color:${item.color}" style="background-color: ${item.color};" title="${item.name}"></div>`;
              }
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
  contentDiv.innerHTML = `
    <div class="theme-header"><h2>Personaliza tu<br>chat</h2></div>
    <h3 class="tittle">Temas</h3>
    <div class="theme-options ">
      ${Object.entries(themes).map(([id, t]) => `
        <button data-theme="${id}" class="theme-btn ${draftTheme === id ? 'active' : ''}">${t.name}</button>
      `).join('')}
    </div>
    <span class="backgrounds-tittle">Fondos</span>
    ${userImagesHtml}
    ${bgCategoriesHtml}
    <div class="bg-options" style="margin-top: 12px;">
      <div class="bg-preview ${draftBgMode === 'theme' && !draftCustomBg ? 'active' : ''}" data-bg="reset" style="background: var(--modal-input-bg); display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--modal-text);">⟳</div>
    </div>
    <span class="choose-from-gallery">Elegir desde galería</span>
    <div class="custom-file-upload">
      <label class="file-upload-btn" for="galleryInput">📁 Seleccionar imagen</label>
      <input type="file" id="galleryInput" accept="image/*" style="display: none;">
    </div>
    <div class="edit-container" style="margin-top: 12px;">
      <button class="btn-secondary" id="adjust-opacity-btn" style="width: 100%;">Ajustar opacidad</button>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" id="cancelThemeBtn">Descartar cambios</button>
      <button class="btn-save" id="saveThemeBtn">Guardar cambios</button>
    </div>
  `;
  document.querySelectorAll('.bg-category-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const categoryDiv = header.closest('.bg-category');
      if (!categoryDiv) return;
      const content = categoryDiv.querySelector('.bg-category-content');
      const arrow = header.querySelector('.arrow');
      if (!content) return;
      const isExpanded = content.classList.contains('expanded');
      if (isExpanded) {
        content.style.maxHeight = '0px';
        content.style.paddingTop = '0';
        content.classList.remove('expanded');
        if (arrow) arrow.textContent = '▼';
      } else {
        content.style.display = 'block';
        requestAnimationFrame(() => {
          content.style.maxHeight = content.scrollHeight + 'px';
          content.style.paddingTop = '12px';
        });
        content.classList.add('expanded');
        if (arrow) arrow.textContent = '▲';
      }
    });
  });
  bindUserImagesSection();
  const themeBtns = document.querySelectorAll('#theme-content .theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const restoreSnapshot = getDraftSnapshot();
      draftTheme = btn.dataset.theme;
      draftBgMode = 'theme';
      draftCustomBg = '';
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('#theme-content .bg-preview').forEach(p => p.classList.remove('active'));
      applyDraftPreview();
      const bgUrl = themes[draftTheme]?.bg;
      showOpacityModal(bgUrl, null, (newImageUrl) => {
        draftBgMode = 'custom';
        draftCustomBg = newImageUrl;
        applyDraftPreview();
        updateActiveIndicators();
        refreshUserImagesSection();
      }, restoreSnapshot);
    });
  });
  const bgPreviews = document.querySelectorAll('#theme-content .bg-preview:not([data-user-image="1"])');
  bgPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
      const restoreSnapshot = getDraftSnapshot();
      const bgValue = preview.dataset.bg;
      if (bgValue === 'reset') {
        draftBgMode = 'theme';
        draftCustomBg = '';
      } else if (bgValue && bgValue.startsWith('color:')) {
        const color = bgValue.substring(6);
        draftBgMode = 'custom';
        draftCustomBg = color;
      } else {
        draftBgMode = 'custom';
        draftCustomBg = bgValue;
      }
      bgPreviews.forEach(p => p.classList.remove('active'));
      preview.classList.add('active');
      applyDraftPreview();
      let previewUrl = draftCustomBg;
      if (draftBgMode === 'theme') previewUrl = themes[draftTheme]?.bg;
      if (previewUrl && !previewUrl.startsWith('color:')) {
        showOpacityModal(previewUrl, null, (newImageUrl) => {
          draftBgMode = 'custom';
          draftCustomBg = newImageUrl;
          applyDraftPreview();
          updateActiveIndicators();
          refreshUserImagesSection();
        }, restoreSnapshot);
      }
    });
  });
  const fileInput = document.getElementById('galleryInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const restoreSnapshot = getDraftSnapshot();
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          draftBgMode = 'custom';
          draftCustomBg = dataUrl;
          document.querySelectorAll('#theme-content .bg-preview').forEach(p => p.classList.remove('active'));
          applyDraftPreview();
          saveUserImage(dataUrl);
          showOpacityModal(dataUrl, null, (newImageUrl) => {
            draftBgMode = 'custom';
            draftCustomBg = newImageUrl;
            applyDraftPreview();
            updateActiveIndicators();
            refreshUserImagesSection();
          }, restoreSnapshot);
          showTransientNotification('Fondo personalizado seleccionado');
          refreshUserImagesSection();
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    });
  }
  document.getElementById('adjust-opacity-btn')?.addEventListener('click', () => {
    const restoreSnapshot = getDraftSnapshot();
    let previewUrl = '';
    if (draftBgMode === 'custom' && draftCustomBg) previewUrl = draftCustomBg;
    else if (draftTheme) previewUrl = themes[draftTheme]?.bg || '';
    if (previewUrl && !previewUrl.startsWith('color:')) {
      showOpacityModal(previewUrl, null, (newImageUrl) => {
        draftBgMode = 'custom';
        draftCustomBg = newImageUrl;
        applyDraftPreview();
        updateActiveIndicators();
        refreshUserImagesSection();
      }, restoreSnapshot);
    } else {
      showTransientNotification('No hay imagen para ajustar opacidad');
    }
  });
  const saveBtn = document.getElementById('saveThemeBtn');
  const cancelBtn = document.getElementById('cancelThemeBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (draftTheme !== null) {
        if (draftBgMode === 'custom' && draftCustomBg) {
          setCustomBackground(draftCustomBg);
          if (draftTheme !== confirmedTheme) {
            document.documentElement.setAttribute('data-theme', draftTheme);
            saveConfirmedState(draftTheme, 'custom', draftCustomBg, draftOpacity);
            applyConfirmedBackground(draftTheme, 'custom', draftCustomBg, draftOpacity);
          }
        } else {
          if (draftTheme !== confirmedTheme || confirmedBgMode !== 'theme') {
            setTheme(draftTheme);
            resetToThemeBackground();
          } else {
            resetToThemeBackground();
          }
        }
        setBackgroundOpacity(draftOpacity);
      }
      hideModal();
      showTransientNotification('Tema guardado');
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      restoreConfirmedState();
      hideModal();
      showTransientNotification('Cambios descartados');
    });
  }
}

function showTransientNotification(text) {
  let notif = document.querySelector('.transient-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.className = 'transient-notif';
    document.body.appendChild(notif);
  }
  notif.textContent = text;
  notif.classList.add('visible');
  setTimeout(() => notif.classList.remove('visible'), 1500);
}

function hideModal() {
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
}

function showModal() {
  if (!windowElement) {
    windowElement = document.getElementById('movable-window');
    headerElement = document.getElementById('modal-header');
    closeBtn = document.getElementById('close-theme-modal');
    overlay = document.getElementById('theme-modal-overlay');
    if (!windowElement || !headerElement) return;
    
    associateOverlay(windowElement, overlay);
    
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    
    if (closeBtn) {
      closeBtn.onclick = () => {
        restoreConfirmedState();
        hideModal();
        showTransientNotification('Cambios descartados');
      };
    }
    loadThemeContent();
  }
  
  overlay.classList.add('active');
  windowElement.style.display = 'block';
  centerModal();
  isModalOpen = true;
  
  registerModal(windowElement, 'theme-modal');
  bringModalToFront('theme-modal');
}

export function initThemeManager() {
  window.showThemeModal = showModal;
}