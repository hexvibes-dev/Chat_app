// scripts/Theme/themeUi.js

import { THEMES_UI, NATIVE_BACKGROUNDS } from './themeConstants.js';

export class ThemeUI {
  constructor(options) {
    this.containerId = options.containerId || 'theme-content';
    this.onThemeSelect = options.onThemeSelect;
    this.onBackgroundSelect = options.onBackgroundSelect;
    this.onCustomImageSelect = options.onCustomImageSelect;
    this.onAdjustOpacity = options.onAdjustOpacity;
    this.onSave = options.onSave;
    this.onCancel = options.onCancel;
    this.getPreviewState = options.getPreviewState;
  }

  get container() {
    return document.getElementById(this.containerId);
  }

  render(draftState, userImagesHtml = '') {
    if (!this.container) return;

    const { theme, bgMode, customBg } = draftState;
    
    let bgCategoriesHtml = '';
    for (const [category, items] of Object.entries(NATIVE_BACKGROUNDS)) {
      bgCategoriesHtml += this.renderCategory(category, items, draftState);
    }

    this.container.innerHTML = `
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
  }

  renderCategory(category, items, draftState) {
    const { bgMode, customBg } = draftState;
    return `
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

  bindEvents() {
    this.bindCategoryHeaders();
    this.bindThemeButtons();
    this.bindBackgroundPreviews();
    this.bindGalleryInput();
    this.bindOpacityButton();
    this.bindSaveCancelButtons();
  }

  bindCategoryHeaders() {
    const headers = this.container.querySelectorAll('.bg-category-header');
    headers.forEach(header => {
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
      newHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCategoryContent(newHeader);
      });
    });
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

  bindThemeButtons() {
    const themeBtns = this.container.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        this.onThemeSelect?.(newBtn.dataset.theme);
      });
    });
  }

  bindBackgroundPreviews() {
    const previews = this.container.querySelectorAll('.bg-preview:not([data-user-image="1"])');
    previews.forEach(preview => {
      const newPreview = preview.cloneNode(true);
      preview.parentNode.replaceChild(newPreview, preview);
      newPreview.addEventListener('click', () => {
        const bgValue = newPreview.dataset.bg;
        this.onBackgroundSelect?.(bgValue);
      });
    });
  }

  bindGalleryInput() {
    const fileInput = this.container.querySelector('#galleryInput');
    if (fileInput) {
      const newFileInput = fileInput.cloneNode(true);
      fileInput.parentNode.replaceChild(newFileInput, fileInput);
      newFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            this.onCustomImageSelect?.(ev.target.result);
          };
          reader.readAsDataURL(file);
        }
        e.target.value = '';
      });
    }
  }

  bindOpacityButton() {
    const btn = this.container.querySelector('#adjust-opacity-btn');
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        this.onAdjustOpacity?.();
      });
    }
  }

  bindSaveCancelButtons() {
    const saveBtn = this.container.querySelector('#saveThemeBtn');
    const cancelBtn = this.container.querySelector('#cancelThemeBtn');
    
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', () => this.onSave?.());
    }
    if (cancelBtn) {
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      newCancelBtn.addEventListener('click', () => this.onCancel?.());
    }
  }

  updateActiveIndicators(draftState) {
    if (!this.container) return;
    const { theme, bgMode, customBg } = draftState;
    
    this.container.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.dataset.theme === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    this.container.querySelectorAll('.bg-preview').forEach(preview => {
      const bgValue = preview.dataset.bg;
      if (bgValue === 'reset') {
        if (bgMode === 'theme' && !customBg) {
          preview.classList.add('active');
        } else {
          preview.classList.remove('active');
        }
      } else if (bgValue && bgValue.startsWith('color:')) {
        const color = bgValue.substring(6);
        if (bgMode === 'custom' && customBg === color) {
          preview.classList.add('active');
        } else {
          preview.classList.remove('active');
        }
      } else {
        if (bgMode === 'custom' && customBg === bgValue) {
          preview.classList.add('active');
        } else {
          preview.classList.remove('active');
        }
      }
    });
  }
}