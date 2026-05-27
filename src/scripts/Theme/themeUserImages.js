// scripts/Theme/themeUserImages.js

import { MAX_USER_IMAGES } from './themeConstants.js';
import { isDataUrl } from './themeUtils.js';

export class ThemeUserImages {
  constructor(storage) {
    this.storage = storage;
    this.deleteMode = false;
    this.selectedImages = new Set();
    this.onImageSelect = null;
    this.onRefresh = null;
  }

  getImages() {
    alert('getImages llamado');
    const images = this.storage.getUserImages();
    alert(`getImages: ${images.length} imágenes encontradas`);
    return images;
  }

  save(dataUrl) {
    if (!isDataUrl(dataUrl)) return;
    
    const images = this.getImages();
    if (!images.includes(dataUrl)) {
      images.unshift(dataUrl);
      if (images.length > MAX_USER_IMAGES) images.pop();
      this.storage.storage.setItem('chat_user_images', JSON.stringify(images));
    }
  }

  remove(urls) {
    const toRemove = new Set(urls);
    const images = this.getImages().filter(url => !toRemove.has(url));
    this.storage.storage.setItem('chat_user_images', JSON.stringify(images));
    this.selectedImages.clear();
    return images;
  }

  renderHtml(draftState, onSelect, onRefresh) {
    alert('renderHtml iniciado');
    const images = this.getImages();
    alert(`renderHtml: ${images.length} imágenes`);
    
    if (!images.length) {
      alert('No hay imágenes de usuario, retornando string vacío');
      return '';
    }
    
    const { bgMode, customBg } = draftState;
    this.onImageSelect = onSelect;
    this.onRefresh = onRefresh;
    
    const html = `
      <div class="bg-category" data-category="user">
        <button class="bg-category-header" type="button" data-user-header="1">
          <span>Tus fondos</span>
          <span class="arrow">▼</span>
        </button>
        <div class="bg-category-content">
          <div class="user-images-toolbar" style="display:flex; gap:8px; margin: 8px 0 12px; flex-wrap: wrap;">
            <button type="button" class="btn-secondary user-images-toggle-select" style="flex:1; min-width: 120px;">
              ${this.deleteMode ? 'Cancelar' : 'Seleccionar'}
            </button>
            <button type="button" class="btn-secondary user-images-select-all" style="flex:1; min-width: 120px; ${this.deleteMode ? '' : 'opacity: 0.5;'}" ${this.deleteMode ? '' : 'disabled'}>
              Todo
            </button>
            <button type="button" class="btn-cancel user-images-delete" style="flex:1; min-width: 120px; ${this.deleteMode ? '' : 'opacity: 0.5;'}" ${this.deleteMode ? '' : 'disabled'}>
              Eliminar${this.selectedImages.size ? ` (${this.selectedImages.size})` : ''}
            </button>
          </div>
          <div class="bg-options">
            ${images.map(url => `
              <div class="bg-preview ${bgMode === 'custom' && customBg === url ? 'active' : ''} ${this.selectedImages.has(url) ? 'user-delete-selected' : ''}" 
                   data-bg="${url}" 
                   data-user-image="1" 
                   style="background-image: url('${url}'); position: relative; ${this.deleteMode && this.selectedImages.has(url) ? 'outline: 3px solid #ef4444; outline-offset: 2px;' : ''}">
                ${this.deleteMode ? `<span style="position:absolute; top:6px; right:6px; background: rgba(0,0,0,0.65); color: #fff; border-radius: 999px; padding: 2px 6px; font-size: 11px; line-height: 1;">${this.selectedImages.has(url) ? '✓' : '+'}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    alert('renderHtml completado, retornando HTML');
    return html;
  }

  bindEvents(draftState, onSelect, onRefresh) {
    alert('bindEvents llamado');
    this.onImageSelect = onSelect;
    this.onRefresh = onRefresh;
    
    const userCategory = document.querySelector('.bg-category[data-category="user"]');
    if (!userCategory) {
      alert('No se encontró la categoría de usuario');
      return;
    }
    
    this.bindHeaderEvents(userCategory);
    this.bindToolbarEvents(userCategory);
    this.bindPreviewEvents(userCategory, draftState);
  }

  bindHeaderEvents(category) {
    const header = category.querySelector('.bg-category-header');
    if (!header) return;
    
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);
    newHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCategoryContent(newHeader);
    });
  }

  toggleCategoryContent(header) {
    const categoryDiv = header.closest('.bg-category');
    if (!categoryDiv) return;
    const content = categoryDiv.querySelector('.bg-category-content');
    const arrow = header.querySelector('.arrow');
    if (!content) return;
    
    const isExpanded = content.classList.contains('expanded');
    content.classList.toggle('expanded', !isExpanded);
    if (arrow) arrow.textContent = isExpanded ? '▼' : '▲';
  }

  bindToolbarEvents(category) {
    const toggleBtn = category.querySelector('.user-images-toggle-select');
    const selectAllBtn = category.querySelector('.user-images-select-all');
    const deleteBtn = category.querySelector('.user-images-delete');
    
    if (toggleBtn) {
      const newToggleBtn = toggleBtn.cloneNode(true);
      toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
      newToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMode = !this.deleteMode;
        if (!this.deleteMode) this.selectedImages.clear();
        this.onRefresh?.();
      });
    }
    
    if (selectAllBtn) {
      const newSelectAllBtn = selectAllBtn.cloneNode(true);
      selectAllBtn.parentNode.replaceChild(newSelectAllBtn, selectAllBtn);
      newSelectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.deleteMode) return;
        this.selectedImages = new Set(this.getImages());
        this.onRefresh?.();
      });
    }
    
    if (deleteBtn) {
      const newDeleteBtn = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
      newDeleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.deleteMode) return;
        this.deleteSelected();
      });
    }
  }

  bindPreviewEvents(category, draftState) {
    const previews = category.querySelectorAll('.bg-preview[data-user-image="1"]');
    
    previews.forEach(preview => {
      const newPreview = preview.cloneNode(true);
      preview.parentNode.replaceChild(newPreview, preview);
      newPreview.addEventListener('click', (e) => {
        e.stopPropagation();
        const bgValue = newPreview.dataset.bg;
        
        if (this.deleteMode) {
          if (this.selectedImages.has(bgValue)) {
            this.selectedImages.delete(bgValue);
          } else {
            this.selectedImages.add(bgValue);
          }
          this.onRefresh?.();
          return;
        }
        
        this.onImageSelect?.(bgValue);
      });
    });
  }

  deleteSelected() {
    if (!this.selectedImages.size) return;
    
    const toDelete = Array.from(this.selectedImages);
    this.remove(toDelete);
    this.deleteMode = false;
    this.onRefresh?.();
    this.showNotification('Fondos eliminados');
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

  reset() {
    this.deleteMode = false;
    this.selectedImages.clear();
  }
}