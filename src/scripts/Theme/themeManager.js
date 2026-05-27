// scripts/Theme/themeManager.js

import { ThemeStorage } from './themeStorage.js';
import { ModalDraggable } from './modalDraggable.js';
import { ThemeOpacity } from './themeOpacity.js';
import { ALLOWED_THEMES } from './themeConstants.js';
import { getThemeData } from './themeUtils.js';

const STORAGE_USER_IMAGES = 'chat_user_images';

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

const THEMES_UI = {
  dark: { name: 'Oscuro' },
  light: { name: 'Claro' },
  basic: { name: 'Basico' },
  terminal: { name: 'Terminal' },
  spongebob: { name: 'Bob Esponja' },
  cristal: { name: 'Cristal' },
  forest: { name: 'Bosque' },
  ocean: { name: 'Océano' },
  magenta: { name: 'Magenta' },
  whatsapp: { name: 'WhatsApp' },
  midnight: { name: 'Midnight' },
  reference: { name: 'Referencia' },
  nuevo: { name: 'Nuevo' }
};

const NATIVE_BACKGROUNDS = {
  movil: [
    { name: 'Bosque encantado version movil', url: '/img/bg.jpg' },
    { name: 'Nubes', url: '/img/nubes.jpg' },
    { name: 'Planton', url: '/img/planton.jpg' }
  ],
  tableta: [
    { name: 'Ballena', url: '/img/ballena.jpg' }
  ],
  pc: [
    { name: 'Bosque encantado version pc', url: '/img/magic.jpg' }
  ],
  'colores solidos': [
    { name: 'Blanco', url: '/img/light.jpg', color: '#ffffff' },
    { name: 'Negro', url: '/img/dark.jpg', color: '#000000' }
  ]
};

export class ThemeManager {
  constructor(options = {}) {
    this.storage = new ThemeStorage();
    
    this.currentState = null;
    this.previewState = null;
    
    this.modal = null;
    this.opacityModal = null;
    this.windowElement = null;
    this.headerElement = null;
    this.overlay = null;
    this.closeBtn = null;
    
    this.userImagesDeleteMode = false;
    this.selectedUserImages = new Set();
    
    this.onTerminalUpdate = options.onTerminalUpdate;
    
    this.init();
  }

  init() {
    this.currentState = this.loadCurrentState();
    this.applyStyles(this.currentState);
    this.setupGlobalApi();
  }

  loadCurrentState() {
    return {
      theme: this.storage.getThemePrefs().theme,
      bgMode: this.storage.getBgMode(),
      customBg: this.storage.getCustomBg(),
      opacity: this.storage.getBgOpacity()
    };
  }

  applyStyles(state) {
    const { theme, bgMode, customBg, opacity } = state;
    const root = document.documentElement;
    const themeData = getThemeData(theme);
    
    root.setAttribute('data-theme', theme);
    
    let bgUrl = null;
    if (bgMode === 'custom' && customBg) {
      bgUrl = customBg;
    } else if (themeData.bg && themeData.bg !== 'null') {
      bgUrl = themeData.bg;
    }
    
    root.style.setProperty('--app-bg-image', bgUrl ? `url('${bgUrl}')` : 'none');
    root.style.setProperty('--app-bg-color', themeData.color);
    root.style.setProperty('--app-bg-opacity', opacity.toString());
    
    this.onTerminalUpdate?.();
  }

  saveToLocalStorage(state) {
    const { theme, bgMode, customBg, opacity } = state;
    this.storage.saveThemePrefs(theme, bgMode, customBg, opacity);
    
    if (customBg && customBg.startsWith('data:')) {
      saveUserImage(customBg);
    }
    
    this.currentState = { ...state };
  }

  resetPreview() {
    this.previewState = { ...this.currentState };
    this.applyPreviewStyles();
    this.updateActiveIndicators();
  }

  applyPreviewStyles() {
    if (!this.previewState) return;
    const { theme, bgMode, customBg, opacity } = this.previewState;
    const root = document.documentElement;
    const themeData = getThemeData(theme);
    
    root.setAttribute('data-theme', theme);
    
    let bgUrl = null;
    if (bgMode === 'custom' && customBg) {
      bgUrl = customBg;
    } else if (themeData.bg && themeData.bg !== 'null') {
      bgUrl = themeData.bg;
    }
    
    root.style.setProperty('--app-bg-image', bgUrl ? `url('${bgUrl}')` : 'none');
    root.style.setProperty('--app-bg-color', themeData.color);
    root.style.setProperty('--app-bg-opacity', opacity.toString());
  }

  updateActiveIndicators() {
    if (!this.previewState) return;
    const { theme, bgMode, customBg } = this.previewState;
    
    document.querySelectorAll('#theme-content .theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    
    document.querySelectorAll('#theme-content .bg-preview').forEach(preview => {
      const bgValue = preview.dataset.bg;
      if (bgValue === 'reset') {
        preview.classList.toggle('active', bgMode === 'theme' && !customBg);
      } else if (bgValue && bgValue.startsWith('color:')) {
        const color = bgValue.substring(6);
        preview.classList.toggle('active', bgMode === 'custom' && customBg === color);
      } else {
        preview.classList.toggle('active', bgMode === 'custom' && customBg === bgValue);
      }
    });
  }

  buildUserImagesSectionHtml() {
    const userImages = getUserImages();
    if (!userImages.length) return '';
    
    const { bgMode, customBg } = this.previewState || this.currentState;
    
    return `
      <div class="bg-category" data-category="user">
        <button class="bg-category-header" type="button" data-user-header="1">
          <span>Tus fondos</span>
          <span class="arrow">▼</span>
        </button>
        <div class="bg-category-content">
          <div class="user-images-toolbar" style="display:flex; gap:8px; margin: 8px 0 12px; flex-wrap: wrap;">
            <button type="button" class="btn-secondary user-images-toggle-select" style="flex:1; min-width: 120px;">
              ${this.userImagesDeleteMode ? 'Cancelar' : 'Seleccionar'}
            </button>
            <button type="button" class="btn-secondary user-images-select-all" style="flex:1; min-width: 120px; ${this.userImagesDeleteMode ? '' : 'opacity: 0.5;'}" ${this.userImagesDeleteMode ? '' : 'disabled'}>
              Todo
            </button>
            <button type="button" class="btn-cancel user-images-delete" style="flex:1; min-width: 120px; ${this.userImagesDeleteMode ? '' : 'opacity: 0.5;'}" ${this.userImagesDeleteMode ? '' : 'disabled'}>
              Eliminar${this.selectedUserImages.size ? ` (${this.selectedUserImages.size})` : ''}
            </button>
          </div>
          <div class="bg-options">
            ${userImages.map(url => `
              <div class="bg-preview ${bgMode === 'custom' && customBg === url ? 'active' : ''} ${this.selectedUserImages.has(url) ? 'user-delete-selected' : ''}" data-bg="${url}" data-user-image="1" style="background-image: url('${url}'); position: relative; ${this.userImagesDeleteMode && this.selectedUserImages.has(url) ? 'outline: 3px solid #ef4444; outline-offset: 2px;' : ''}">
                ${this.userImagesDeleteMode ? `<span style="position:absolute; top:6px; right:6px; background: rgba(0,0,0,0.65); color: #fff; border-radius: 999px; padding: 2px 6px; font-size: 11px; line-height: 1;">${this.selectedUserImages.has(url) ? '✓' : '+'}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  loadThemeContent() {
    const contentDiv = document.getElementById('theme-content');
    if (!contentDiv) return;
    
    const state = this.previewState || this.currentState;
    const { theme, bgMode, customBg } = state;
    
    const userImagesHtml = this.buildUserImagesSectionHtml();
    let bgCategoriesHtml = '';
    
    for (const [category, items] of Object.entries(NATIVE_BACKGROUNDS)) {
      bgCategoriesHtml += `
        <div class="bg-category" data-category="${category}">
          <button class="bg-category-header" type="button">
            <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
            <span class="arrow">▼</span>
          </button>
          <div class="bg-category-content">
            <div class="bg-options">
              ${items.map(item => {
                if (item.url) {
                  return `<div class="bg-preview ${bgMode === 'custom' && customBg === item.url ? 'active' : ''}" data-bg="${item.url}" style="background-image: url('${item.url}');"></div>`;
                } else {
                  return `<div class="bg-preview ${bgMode === 'custom' && customBg === item.color ? 'active' : ''}" data-bg="color:${item.color}" style="background-color: ${item.color};" title="${item.name}"></div>`;
                }
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    contentDiv.innerHTML = `
      <div class="theme-header"><div></div></div>
      <h3 class="tittle">Temas</h3>
      <div class="theme-options">
        ${Object.entries(THEMES_UI).map(([id, t]) => `
          <button data-theme="${id}" class="theme-btn ${theme === id ? 'active' : ''}">${t.name}</button>
        `).join('')}
      </div>
      <span class="backgrounds-tittle">Fondos</span>
      ${userImagesHtml}
      ${bgCategoriesHtml}
      <div class="bg-options" style="margin-top: 12px;">
        <div class="bg-preview ${bgMode === 'theme' && !customBg ? 'active' : ''}" data-bg="reset">⟳</div>
      </div>
      <span class="choose-from-gallery">Elegir desde galería</span>
      <div class="custom-file-upload">
        <label class="file-upload-btn" for="galleryInput">📁 Seleccionar imagen</label>
        <input type="file" id="galleryInput" accept="image/*" style="display: none;">
      </div>
      <div class="edit-container">
        <button class="btn-secondary" id="adjust-opacity-btn">Ajustar opacidad</button>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="cancelThemeBtn">Descartar cambios</button>
        <button class="btn-save" id="saveThemeBtn">Guardar cambios</button>
      </div>
    `;
    
    this.bindEvents();
    this.bindUserImagesEvents();
  }

  bindEvents() {
    const contentDiv = document.getElementById('theme-content');
    if (!contentDiv) return;
    
    document.querySelectorAll('.bg-category-header').forEach(header => {
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
      newHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCategoryContent(newHeader);
      });
    });
    
    const themeBtns = document.querySelectorAll('#theme-content .theme-btn');
    themeBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        this.handleThemeSelect(newBtn.dataset.theme);
      });
    });
    
    const bgPreviews = document.querySelectorAll('#theme-content .bg-preview:not([data-user-image="1"])');
    bgPreviews.forEach(preview => {
      const newPreview = preview.cloneNode(true);
      preview.parentNode.replaceChild(newPreview, preview);
      newPreview.addEventListener('click', () => {
        this.handleBackgroundSelect(newPreview.dataset.bg);
      });
    });
    
    const fileInput = document.getElementById('galleryInput');
    if (fileInput) {
      const newFileInput = fileInput.cloneNode(true);
      fileInput.parentNode.replaceChild(newFileInput, fileInput);
      newFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            this.handleCustomImageSelect(ev.target.result);
          };
          reader.readAsDataURL(file);
        }
        e.target.value = '';
      });
    }
    
    document.getElementById('adjust-opacity-btn')?.addEventListener('click', () => {
      this.handleAdjustOpacity();
    });
    
    const saveBtn = document.getElementById('saveThemeBtn');
    const cancelBtn = document.getElementById('cancelThemeBtn');
    
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', () => this.handleSave());
    }
    if (cancelBtn) {
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      newCancelBtn.addEventListener('click', () => this.handleCancel());
    }
  }

  toggleCategoryContent(header) {
    const categoryDiv = header.closest('.bg-category');
    if (!categoryDiv) return;
    const content = categoryDiv.querySelector('.bg-category-content');
    const arrow = header.querySelector('.arrow');
    if (!content) return;
    
    const isExpanded = content.classList.contains('expanded');
    if (isExpanded) {
      content.classList.remove('expanded');
      if (arrow) arrow.textContent = '▼';
    } else {
      content.classList.add('expanded');
      if (arrow) arrow.textContent = '▲';
    }
  }

  bindUserImagesEvents() {
    const userCategory = document.querySelector('.bg-category[data-category="user"]');
    if (!userCategory) return;
    
    const toggleBtn = userCategory.querySelector('.user-images-toggle-select');
    const selectAllBtn = userCategory.querySelector('.user-images-select-all');
    const deleteBtn = userCategory.querySelector('.user-images-delete');
    const previews = userCategory.querySelectorAll('.bg-preview[data-user-image="1"]');
    
    if (toggleBtn) {
      const newToggleBtn = toggleBtn.cloneNode(true);
      toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
      newToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.userImagesDeleteMode = !this.userImagesDeleteMode;
        if (!this.userImagesDeleteMode) this.selectedUserImages.clear();
        this.refreshUserImagesSection();
      });
    }
    
    if (selectAllBtn) {
      const newSelectAllBtn = selectAllBtn.cloneNode(true);
      selectAllBtn.parentNode.replaceChild(newSelectAllBtn, selectAllBtn);
      newSelectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.userImagesDeleteMode) return;
        this.selectedUserImages = new Set(getUserImages());
        this.refreshUserImagesSection();
      });
    }
    
    if (deleteBtn) {
      const newDeleteBtn = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
      newDeleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.userImagesDeleteMode) return;
        this.deleteSelectedUserImages();
      });
    }
    
    previews.forEach(preview => {
      const newPreview = preview.cloneNode(true);
      preview.parentNode.replaceChild(newPreview, preview);
      newPreview.addEventListener('click', (e) => {
        e.stopPropagation();
        const bgValue = newPreview.dataset.bg;
        if (this.userImagesDeleteMode) {
          if (this.selectedUserImages.has(bgValue)) {
            this.selectedUserImages.delete(bgValue);
          } else {
            this.selectedUserImages.add(bgValue);
          }
          this.refreshUserImagesSection();
          return;
        }
        this.handleUserImageSelect(bgValue);
      });
    });
  }

  refreshUserImagesSection() {
    this.loadThemeContent();
  }

  deleteSelectedUserImages() {
    if (!this.selectedUserImages.size) return;
    
    const toDelete = Array.from(this.selectedUserImages);
    const images = getUserImages().filter(url => !toDelete.includes(url));
    localStorage.setItem(STORAGE_USER_IMAGES, JSON.stringify(images));
    this.selectedUserImages.clear();
    this.userImagesDeleteMode = false;
    this.refreshUserImagesSection();
    this.showNotification('Fondos eliminados');
  }

  handleThemeSelect(themeId) {
    if (!ALLOWED_THEMES.includes(themeId)) return;
    
    const oldPreviewState = { ...this.previewState };
    this.previewState = {
      theme: themeId,
      bgMode: 'theme',
      customBg: '',
      opacity: this.previewState?.opacity ?? this.currentState.opacity
    };
    this.applyPreviewStyles();
    this.updateActiveIndicators();
    
    const bgUrl = getThemeData(themeId)?.bg;
    if (bgUrl && bgUrl !== 'null') {
      if (!this.opacityModal) {
        this.opacityModal = new ThemeOpacity({
          onSave: (opacity, newImageUrl) => this.updatePreviewOpacity(opacity, newImageUrl)
        });
      }
      this.opacityModal.show(bgUrl);
    }
  }

  handleBackgroundSelect(bgValue) {
    const oldPreviewState = { ...this.previewState };
    
    if (bgValue === 'reset') {
      this.previewState = {
        ...this.previewState,
        bgMode: 'theme',
        customBg: ''
      };
    } else if (bgValue?.startsWith('color:')) {
      this.previewState = {
        ...this.previewState,
        bgMode: 'custom',
        customBg: bgValue
      };
    } else {
      this.previewState = {
        ...this.previewState,
        bgMode: 'custom',
        customBg: bgValue
      };
      if (!this.opacityModal) {
        this.opacityModal = new ThemeOpacity({
          onSave: (opacity, newImageUrl) => this.updatePreviewOpacity(opacity, newImageUrl)
        });
      }
      this.opacityModal.show(bgValue);
    }
    this.applyPreviewStyles();
    this.updateActiveIndicators();
  }

  handleCustomImageSelect(dataUrl) {
    this.previewState = {
      ...this.previewState,
      bgMode: 'custom',
      customBg: dataUrl
    };
    this.applyPreviewStyles();
    this.updateActiveIndicators();
    saveUserImage(dataUrl);
    if (!this.opacityModal) {
      this.opacityModal = new ThemeOpacity({
        onSave: (opacity, newImageUrl) => this.updatePreviewOpacity(opacity, newImageUrl)
      });
    }
    this.opacityModal.show(dataUrl);
    this.refreshUserImagesSection();
  }

  handleUserImageSelect(url) {
    this.previewState = {
      ...this.previewState,
      bgMode: 'custom',
      customBg: url
    };
    this.applyPreviewStyles();
    this.updateActiveIndicators();
    
    if (url && !url.startsWith('color:')) {
      if (!this.opacityModal) {
        this.opacityModal = new ThemeOpacity({
          onSave: (opacity, newImageUrl) => this.updatePreviewOpacity(opacity, newImageUrl)
        });
      }
      this.opacityModal.show(url);
    }
  }

  handleAdjustOpacity() {
    const state = this.previewState || this.currentState;
    let previewUrl = '';
    if (state.bgMode === 'custom' && state.customBg) {
      previewUrl = state.customBg;
    } else if (state.theme) {
      previewUrl = getThemeData(state.theme)?.bg || '';
    }
    if (previewUrl && !previewUrl.startsWith('color:')) {
      if (!this.opacityModal) {
        this.opacityModal = new ThemeOpacity({
          onSave: (opacity, newImageUrl) => this.updatePreviewOpacity(opacity, newImageUrl)
        });
      }
      this.opacityModal.show(previewUrl);
    }
  }

  updatePreviewOpacity(opacity, newImageUrl) {
    if (newImageUrl) {
      this.previewState = {
        ...this.previewState,
        bgMode: 'custom',
        customBg: newImageUrl
      };
      saveUserImage(newImageUrl);
      this.refreshUserImagesSection();
    }
    this.previewState = {
      ...this.previewState,
      opacity: opacity
    };
    this.applyPreviewStyles();
    this.updateActiveIndicators();
  }

  handleSave() {
    if (this.previewState) {
      this.saveToLocalStorage(this.previewState);
      this.currentState = { ...this.previewState };
    }
    this.hideModal();
    this.showNotification('Tema guardado');
  }

  handleCancel() {
    this.resetPreview();
    this.hideModal();
    this.showNotification('Cambios descartados');
  }

  showModal() {
    if (!this.windowElement) {
      this.windowElement = document.getElementById('movable-window');
      this.headerElement = document.getElementById('modal-header');
      this.closeBtn = document.getElementById('close-theme-modal');
      this.overlay = document.getElementById('theme-modal-overlay');
      
      if (!this.windowElement || !this.headerElement) return;
      
      this.modal = new ModalDraggable({
        element: this.windowElement,
        header: this.headerElement,
        overlay: this.overlay,
        onClose: () => this.handleCancel()
      });
      
      if (this.closeBtn) {
        this.closeBtn.onclick = () => this.handleCancel();
      }
    }
    
    this.resetPreview();
    this.loadThemeContent();
    this.modal?.show();
  }

  hideModal() {
    this.modal?.hide();
  }

  showNotification(text, duration = 1500) {
    const notification = document.createElement('div');
    notification.textContent = text;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
  }

  setupGlobalApi() {
    window.showThemeModal = () => this.showModal();
  }
}

export function initThemeManager(options = {}) {
  return new ThemeManager(options);
}