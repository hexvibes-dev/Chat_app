// src/scripts/StickerModal.js
import interact from 'interactjs';
import {
  getCategories,
  canCreateCategory,
  createCategory,
  addCustomSticker,
  processImageFile,
  canAddStickerToCategory,
  refreshStickersInPicker,
  removeCustomSticker,
  deleteCategory
} from './StickerManager.js';
import { registerModal, bringModalToFront } from './modalStackManager.js';

let modal = null;
let isOpen = false;
let isAnimating = false;
let container = null;
let header = null;
let closeBtn = null;
let windowX = 0, windowY = 0;
let modalId = 'custom-sticker-modal';

let cropModal = null;
let cropOverlay = null;
let currentImageDataUrl = null;
let cropCanvas = null;
let cropCtx = null;
let cropImage = null;
let cropZoom = 1;
let cropRotation = 0;
let cropOffsetX = 0, cropOffsetY = 0;
let cropImageOriginalWidth = 0, cropImageOriginalHeight = 0;
let isDraggingCrop = false;
let dragStartX = 0, dragStartY = 0;
let dragStartOffsetX = 0, dragStartOffsetY = 0;
let pendingCategoryForUpload = null;
let isQuickUpload = false;

let confirmPopup = null;
let expandedCategories = new Set();

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
    if (confirmPopup) {
      confirmPopup.remove();
      confirmPopup = null;
    }
    confirmPopup = document.createElement('div');
    confirmPopup.className = 'confirm-popup';
    confirmPopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--modal-bg);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 20000;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 250px;
      text-align: center;
      border: 1px solid var(--modal-input-border);
    `;
    confirmPopup.innerHTML = `
      <p style="margin: 0; font-size: 16px; color: var(--modal-text);">${message}</p>
      <div style="display: flex; justify-content: center; gap: 20px;">
        <button class="confirm-no" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #ef4444;">✗</button>
        <button class="confirm-yes" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #10b981;">✓</button>
      </div>
    `;
    document.body.appendChild(confirmPopup);
    confirmPopup.querySelector('.confirm-no').addEventListener('click', () => {
      confirmPopup.remove();
      confirmPopup = null;
      resolve(false);
    });
    confirmPopup.querySelector('.confirm-yes').addEventListener('click', () => {
      confirmPopup.remove();
      confirmPopup = null;
      resolve(true);
    });
  });
}

function showCreateCategoryModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-blur-overlay';
    overlay.style.zIndex = '30001';
    document.body.appendChild(overlay);
    overlay.classList.add('visible');
    const modalDiv = document.createElement('div');
    modalDiv.className = 'add-reaction-modal enter';
    modalDiv.style.zIndex = '30002';
    modalDiv.style.width = '300px';
    modalDiv.innerHTML = `
      <div class="add-reaction-card" style="padding: 20px;">
        <h1 style="font-size: 18px; margin-bottom: 16px; color: var(--modal-text);">Nueva categoría</h1>
        <input type="text" id="new-category-name" placeholder="Nombre (máx 20 caracteres)" maxlength="20" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--modal-input-border); background: var(--input-bg); color: var(--text-color); margin-bottom: 20px;">
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancel-category" class="btn-cancel">Cancelar</button>
          <button id="create-category" class="btn primary">Crear</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    modalDiv.style.left = '50%';
    modalDiv.style.top = '50%';
    modalDiv.style.transform = 'translate(-50%, -50%)';
    const input = modalDiv.querySelector('#new-category-name');
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
    const cleanup = () => {
      modalDiv.classList.add('leave');
      overlay.classList.remove('visible');
      setTimeout(() => {
        modalDiv.remove();
        overlay.remove();
      }, 200);
    };
    modalDiv.querySelector('#cancel-category').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    modalDiv.querySelector('#create-category').addEventListener('click', () => {
      const name = input.value.trim();
      if (name) {
        cleanup();
        resolve(name);
      } else {
        showTransientNotification('El nombre no puede estar vacío', 1500);
      }
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const name = input.value.trim();
        if (name) {
          cleanup();
          resolve(name);
        }
      }
    });
  });
}

function showCategorySelectorForUpload(croppedDataUrl) {
  const categories = getCategories();
  const overlay = document.createElement('div');
  overlay.className = 'modal-blur-overlay';
  overlay.style.zIndex = '20003';
  document.body.appendChild(overlay);
  overlay.classList.add('visible');
  const selectorModal = document.createElement('div');
  selectorModal.className = 'add-reaction-modal enter';
  selectorModal.style.zIndex = '20004';
  selectorModal.style.width = '300px';
  let html = `
    <div class="add-reaction-card" style="padding: 20px;">
      <h1 style="font-size: 18px; margin-bottom: 16px; color: var(--modal-text);">📁 Guardar sticker en categoría</h1>
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 16px;">
  `;
  if (categories.length === 0) {
    html += `<p style="color: var(--modal-text); text-align: center;">No hay categorías. Crea una nueva.</p>`;
  } else {
    categories.forEach(cat => {
      const canAdd = cat.stickers.length < 30;
      html += `
        <button class="category-save-btn btn" data-category="${escapeHtml(cat.name)}" style="text-align: left; display: flex; justify-content: space-between; align-items: center;" ${!canAdd ? 'disabled style="opacity:0.5;"' : ''}>
          <span>📁 ${escapeHtml(cat.name)}</span>
          <span style="font-size: 12px;">(${cat.stickers.length}/30)</span>
        </button>
      `;
    });
  }
  html += `
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="create-new-category-from-selector" class="btn" style="flex:1;">+ Nueva categoría</button>
        <button id="cancel-selector" class="btn-cancel">Cancelar</button>
      </div>
    </div>
  `;
  selectorModal.innerHTML = html;
  document.body.appendChild(selectorModal);
  selectorModal.style.left = '50%';
  selectorModal.style.top = '50%';
  selectorModal.style.transform = 'translate(-50%, -50%)';
  const cleanup = () => {
    selectorModal.classList.add('leave');
    overlay.classList.remove('visible');
    setTimeout(() => {
      selectorModal.remove();
      overlay.remove();
    }, 200);
  };
  selectorModal.querySelectorAll('.category-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const categoryName = btn.dataset.category;
      if (!canAddStickerToCategory(categoryName)) {
        showTransientNotification(`La categoría "${categoryName}" está llena.`, 2000);
        return;
      }
      try {
        const id = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await addCustomSticker({
          id: id,
          url: croppedDataUrl
        }, categoryName);
        showTransientNotification('✅ Sticker añadido correctamente', 2000);
        refreshStickersInPicker();
        if (isOpen) renderModalContent();
        cleanup();
      } catch (err) {
        showTransientNotification('Error: ' + err.message, 3000);
      }
    });
  });
  selectorModal.querySelector('#create-new-category-from-selector').addEventListener('click', async () => {
    const name = await showCreateCategoryModal();
    if (name) {
      try {
        createCategory(name.trim().substring(0, 20));
        showTransientNotification(`Categoría "${name}" creada`, 2000);
        cleanup();
        showCategorySelectorForUpload(croppedDataUrl);
      } catch (err) {
        showTransientNotification(err.message, 2000);
      }
    }
  });
  selectorModal.querySelector('#cancel-selector').addEventListener('click', () => {
    cleanup();
  });
}

function addResizeHandles(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    element.appendChild(handle);
  });
}

function setupInteract(element, dragHandle) {
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
        windowX += event.deltaRect.left;
        windowY += event.deltaRect.top;
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
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
      start() {
        window.isDraggingModal = true;
      },
      move(event) {
        windowX += event.dx;
        windowY += event.dy;
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
      },
      end() {
        window.isDraggingModal = false;
      }
    }
  });
}

function toggleCategory(categoryId) {
  const content = document.getElementById(`sticker-category-content-${categoryId}`);
  const arrow = document.getElementById(`sticker-category-arrow-${categoryId}`);
  if (!content || !arrow) return;
  const isExpanded = content.style.maxHeight && content.style.maxHeight !== '0px';
  if (isExpanded) {
    content.style.maxHeight = '0px';
    content.style.paddingTop = '0';
    arrow.textContent = '▼';
    expandedCategories.delete(categoryId);
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    content.style.paddingTop = '12px';
    arrow.textContent = '▲';
    expandedCategories.add(categoryId);
  }
}

function restoreExpandedState() {
  expandedCategories.forEach(categoryId => {
    const content = document.getElementById(`sticker-category-content-${categoryId}`);
    const arrow = document.getElementById(`sticker-category-arrow-${categoryId}`);
    if (content && arrow && content.style.maxHeight === '0px') {
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.paddingTop = '12px';
      arrow.textContent = '▲';
    }
  });
}

async function deleteCategoryHandler(categoryName) {
  const confirmed = await showConfirmPopup(`¿Eliminar categoría "${categoryName}" y todos sus stickers?`);
  if (confirmed) {
    deleteCategory(categoryName);
    showTransientNotification(`Categoría "${categoryName}" eliminada`, 2000);
    refreshStickersInPicker();
    renderModalContent();
    restoreExpandedState();
  }
}

async function deleteStickerHandler(categoryName, stickerId) {
  const confirmed = await showConfirmPopup('¿Eliminar este sticker?');
  if (confirmed) {
    removeCustomSticker(categoryName, stickerId);
    showTransientNotification('Sticker eliminado', 2000);
    refreshStickersInPicker();
    renderModalContent();
    restoreExpandedState();
  }
}

function addStickerHandler(categoryName) {
  pendingCategoryForUpload = categoryName;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/gif';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      document.body.removeChild(fileInput);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentImageDataUrl = ev.target.result;
      showCropModal(async (croppedDataUrl) => {
        if (!canAddStickerToCategory(pendingCategoryForUpload)) {
          showTransientNotification(`La categoría "${pendingCategoryForUpload}" está llena.`, 2000);
          return;
        }
        try {
          const id = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await addCustomSticker({
            id: id,
            url: croppedDataUrl
          }, pendingCategoryForUpload);
          showTransientNotification('✅ Sticker añadido correctamente', 2000);
          refreshStickersInPicker();
          renderModalContent();
          restoreExpandedState();
        } catch (err) {
          showTransientNotification('Error: ' + err.message, 3000);
        }
        document.body.removeChild(fileInput);
      });
    };
    reader.readAsDataURL(file);
  };
  fileInput.click();
}

function showCropModal(onSave) {
  if (cropModal) return;

  cropOverlay = document.createElement('div');
  cropOverlay.className = 'modal-blur-overlay';
  cropOverlay.style.zIndex = '20001';
  document.body.appendChild(cropOverlay);
  cropOverlay.classList.add('visible');

  cropModal = document.createElement('div');
  cropModal.className = 'add-reaction-modal enter';
  cropModal.style.zIndex = '20002';
  cropModal.style.width = '90vw';
  cropModal.style.maxWidth = '500px';
  cropModal.innerHTML = `
    <div class="add-reaction-card" style="width: 100%; max-width: 500px;">
      <h1 style="font-size: 20px; margin-bottom: 16px; color: var(--modal-text);">✂️ Recortar sticker (cuadrado)</h1>
      <div style="position: relative; width: 100%; aspect-ratio: 1; background: #1e1e1e; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        <canvas id="crop-canvas" style="width: 100%; height: 100%; display: block; cursor: grab;"></canvas>
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border: 2px solid var(--modal-btn-primary); pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
      </div>
      <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
        <button id="crop-zoom-out" class="btn" style="flex:1;">🔍 -</button>
        <button id="crop-zoom-in" class="btn" style="flex:1;">🔍 +</button>
        <button id="crop-rotate-left" class="btn" style="flex:1;">↺</button>
        <button id="crop-rotate-right" class="btn" style="flex:1;">↻</button>
        <button id="crop-reset" class="btn" style="flex:1;">⟳ Reset</button>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="crop-cancel" class="btn-cancel">Cancelar</button>
        <button id="crop-save" class="btn primary">Guardar recorte</button>
      </div>
    </div>
  `;
  document.body.appendChild(cropModal);
  cropModal.style.left = '50%';
  cropModal.style.top = '50%';
  cropModal.style.transform = 'translate(-50%, -50%)';

  const canvas = cropModal.querySelector('#crop-canvas');
  cropCanvas = canvas;
  cropCtx = canvas.getContext('2d');

  const img = new Image();
  img.onload = () => {
    cropImage = img;
    cropImageOriginalWidth = img.width;
    cropImageOriginalHeight = img.height;
    cropZoom = 1;
    cropRotation = 0;
    cropOffsetX = 0;
    cropOffsetY = 0;
    updateCropCanvasSize();
    drawCropImage();
  };
  img.src = currentImageDataUrl;

  function updateCropCanvasSize() {
    const container = canvas.parentElement;
    const size = container.clientWidth;
    canvas.width = size;
    canvas.height = size;
  }

  function drawCropImage() {
    if (!cropImage) return;
    cropCtx.clearRect(0, 0, canvas.width, canvas.height);
    cropCtx.save();
    cropCtx.translate(canvas.width / 2, canvas.height / 2);
    cropCtx.rotate(cropRotation * Math.PI / 180);
    const scaledWidth = cropImageOriginalWidth * cropZoom;
    const scaledHeight = cropImageOriginalHeight * cropZoom;
    const drawX = cropOffsetX - scaledWidth / 2;
    const drawY = cropOffsetY - scaledHeight / 2;
    cropCtx.drawImage(cropImage, drawX, drawY, scaledWidth, scaledHeight);
    cropCtx.restore();
  }

  function handleMouseDown(e) {
    isDraggingCrop = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    dragStartX = mouseX;
    dragStartY = mouseY;
    dragStartOffsetX = cropOffsetX;
    dragStartOffsetY = cropOffsetY;
    canvas.style.cursor = 'grabbing';
  }

  function handleMouseMove(e) {
    if (!isDraggingCrop) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    const deltaX = mouseX - dragStartX;
    const deltaY = mouseY - dragStartY;
    cropOffsetX = dragStartOffsetX + deltaX;
    cropOffsetY = dragStartOffsetY + deltaY;
    drawCropImage();
  }

  function handleMouseUp() {
    isDraggingCrop = false;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  cropModal.querySelector('#crop-zoom-in').addEventListener('click', () => {
    cropZoom = Math.min(cropZoom + 0.1, 3);
    drawCropImage();
  });
  cropModal.querySelector('#crop-zoom-out').addEventListener('click', () => {
    cropZoom = Math.max(cropZoom - 0.1, 0.5);
    drawCropImage();
  });
  cropModal.querySelector('#crop-rotate-left').addEventListener('click', () => {
    cropRotation = (cropRotation - 90) % 360;
    drawCropImage();
  });
  cropModal.querySelector('#crop-rotate-right').addEventListener('click', () => {
    cropRotation = (cropRotation + 90) % 360;
    drawCropImage();
  });
  cropModal.querySelector('#crop-reset').addEventListener('click', () => {
    cropZoom = 1;
    cropRotation = 0;
    cropOffsetX = 0;
    cropOffsetY = 0;
    drawCropImage();
  });

  cropModal.querySelector('#crop-cancel').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideCropModal();
  });

  cropModal.querySelector('#crop-save').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cropCanvas.width === 0 || cropCanvas.height === 0) return;
    const croppedDataUrl = cropCanvas.toDataURL('image/png');
    hideCropModal();
    if (onSave) {
      onSave(croppedDataUrl);
    }
  });

  window.addEventListener('resize', () => {
    if (cropModal) {
      updateCropCanvasSize();
      drawCropImage();
    }
  });

  function hideCropModal() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    if (cropModal) {
      cropModal.classList.add('leave');
      setTimeout(() => {
        if (cropModal && cropModal.parentNode) cropModal.parentNode.removeChild(cropModal);
        cropModal = null;
      }, 200);
    }
    if (cropOverlay) {
      cropOverlay.classList.remove('visible');
      setTimeout(() => {
        if (cropOverlay && cropOverlay.parentNode) cropOverlay.parentNode.removeChild(cropOverlay);
        cropOverlay = null;
      }, 200);
    }
    cropImage = null;
    cropCanvas = null;
    cropCtx = null;
  }
}

function renderModalContent() {
  if (!modal) return;
  const categories = getCategories();
  const contentDiv = modal.querySelector('.action-menu-content');
  if (!contentDiv) return;
  let html = `<div style="padding: 16px; overflow-y: auto; height: 100%; color: var(--modal-text);">`;
  categories.forEach((cat, idx) => {
    const categoryId = `sticker-cat-${idx}`;
    html += `
      <div class="custom-category-item" style="margin-bottom: 16px; border: 1px solid var(--modal-input-border); border-radius: 12px; overflow: hidden;">
        <div class="category-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--modal-input-bg); cursor: pointer; user-select: none;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="sticker-category-arrow-${categoryId}" style="font-size: 14px; color: var(--modal-text);">${expandedCategories.has(categoryId) ? '▲' : '▼'}</span>
            <strong style="color: var(--modal-text);">${escapeHtml(cat.name)}</strong>
            <span style="font-size: 12px; opacity: 0.7; color: var(--modal-text);">(${cat.stickers.length}/30)</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="delete-category-btn" data-category="${escapeHtml(cat.name)}" style="background: transparent; border: none; cursor: pointer; font-size: 20px; color: #ef4444;">🗑️</button>
            <button class="add-sticker-btn" data-category="${escapeHtml(cat.name)}" style="background: transparent; border: none; cursor: pointer; font-size: 20px; color: var(--modal-btn-primary);">➕</button>
          </div>
        </div>
        <div id="sticker-category-content-${categoryId}" class="category-content" style="max-height: ${expandedCategories.has(categoryId) ? '1000px' : '0'}; overflow: hidden; transition: max-height 0.3s ease-out; padding-top: ${expandedCategories.has(categoryId) ? '12px' : '0'};">
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; padding: 16px;">
    `;
    for (const sticker of cat.stickers) {
      html += `
        <div class="custom-sticker-item" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px; background: var(--input-bg); border-radius: 12px; position: relative;">
          <img src="${sticker.url}" alt="sticker" style="width: 64px; height: 64px; object-fit: contain; border-radius: 8px;">
          <button class="delete-sticker-btn" data-category="${escapeHtml(cat.name)}" data-sticker-id="${sticker.id}" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; color: white; font-size: 12px;">🗑️</button>
        </div>
      `;
    }
    html += `
          </div>
        </div>
      </div>
    `;
  });
  if (canCreateCategory()) {
    html += `
      <button id="create-new-sticker-category-btn" class="btn primary" style="width: 100%; margin-top: 16px; padding: 12px; border-radius: 12px; background: var(--modal-btn-primary); color: var(--modal-btn-primary-text); border: none; cursor: pointer;">
        + Crear nueva categoría (${getCategories().length}/4)
      </button>
    `;
  }
  html += `</div>`;
  contentDiv.innerHTML = html;

  document.querySelectorAll('.category-header').forEach(header => {
    const arrowSpan = header.querySelector('[id^="sticker-category-arrow-"]');
    if (arrowSpan) {
      const categoryId = arrowSpan.id.replace('sticker-category-arrow-', '');
      header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        toggleCategory(categoryId);
      });
    }
  });
  document.querySelectorAll('.delete-category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const categoryName = btn.dataset.category;
      deleteCategoryHandler(categoryName);
    });
  });
  document.querySelectorAll('.add-sticker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const categoryName = btn.dataset.category;
      addStickerHandler(categoryName);
    });
  });
  document.querySelectorAll('.delete-sticker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const categoryName = btn.dataset.category;
      const stickerId = btn.dataset.stickerId;
      deleteStickerHandler(categoryName, stickerId);
    });
  });
  const createBtn = document.getElementById('create-new-sticker-category-btn');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name = await showCreateCategoryModal();
      if (name) {
        try {
          createCategory(name.trim().substring(0, 20));
          showTransientNotification(`Categoría "${name}" creada`, 2000);
          refreshStickersInPicker();
          renderModalContent();
          restoreExpandedState();
        } catch (err) {
          showTransientNotification(err.message, 2000);
        }
      }
    });
  }
}

function showModal() {
  if (isOpen || isAnimating) return;
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'action-menu-modal';
    modal.innerHTML = `
      <div class="action-menu-container" style="width: 500px; height: 600px;">
        <div class="action-menu-header" id="custom-sticker-header">
          <h3 style="color: var(--modal-text);">🖼️ Gestionar stickers personalizados</h3>
          <button class="action-menu-close" id="custom-sticker-close" style="color: var(--modal-text);">&times;</button>
        </div>
        <div class="action-menu-content" style="padding: 0; overflow: hidden;"></div>
      </div>
    `;
    document.body.appendChild(modal);
    container = modal.querySelector('.action-menu-container');
    header = modal.querySelector('#custom-sticker-header');
    closeBtn = modal.querySelector('#custom-sticker-close');
    addResizeHandles(container);
    setupInteract(container, header);
    closeBtn.addEventListener('click', () => hideModal());
    registerModal(modal, modalId);
  }
  renderModalContent();
  isOpen = true;
  modal.classList.remove('closing');
  modal.style.display = 'flex';
  modal.getBoundingClientRect();
  modal.classList.add('open');
  windowX = 0;
  windowY = 0;
  if (container) {
    container.style.transform = '';
    container.removeAttribute('data-x');
    container.removeAttribute('data-y');
    container.style.width = '';
    container.style.height = '';
  }
  bringModalToFront(modalId);
}

function hideModal() {
  if (!isOpen || isAnimating) return;
  if (!modal) return;
  isAnimating = true;
  modal.classList.remove('open');
  modal.classList.add('closing');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('closing');
    isOpen = false;
    isAnimating = false;
  }, 300);
}

export function showCustomStickerModal() {
  showModal();
}

export function showQuickStickerUpload() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/gif';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      document.body.removeChild(fileInput);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentImageDataUrl = ev.target.result;
      showCropModal(async (croppedDataUrl) => {
        showCategorySelectorForUpload(croppedDataUrl);
        document.body.removeChild(fileInput);
      });
    };
    reader.readAsDataURL(file);
  };
  fileInput.click();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}