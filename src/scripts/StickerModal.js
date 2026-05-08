// src/scripts/StickerModal.js
import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';
import {
  getCategories,
  canCreateCategory,
  createCategory,
  addCustomSticker,
  canAddStickerToCategory,
  refreshStickersInPicker,
  removeCustomSticker,
  deleteCategory
} from './StickerManager.js';
import { showNotification } from './notifications.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;
let expandedCategories = new Set();

let cropModal = null;
let cropOverlay = null;
let currentImageDataUrl = null;
let cropCanvas = null;
let cropCtx = null;
let cropImage = null;
let cropPreviewImg = null;
let cropRotation = 0;
let pendingCategoryForUpload = null;
let isQuickUpload = false;
let confirmPopup = null;

let cropTransform = { zoom: 1, posX: 0, posY: 0 };
let isDraggingCropImage = false;
let cropDragStart = { x: 0, y: 0 };
let cropLastTransform = { zoom: 1, posX: 0, posY: 0 };
let cropInitialDistance = 0;
let cropIsPinching = false;
let isAnimatedFile = false;
let currentFileType = null;
let shouldPreserveAnimation = true;

function showTransientNotification(text, duration = 2000) {
  showNotification(text, duration);
}

function showModalNotification(text, type = 'success', duration = 2000) {
  const notif = document.createElement('div');
  notif.className = 'modal-transient-notif';
  notif.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${type === 'success' ? '#14b8a6' : '#ef4444'};
    color: white;
    padding: 12px 24px;
    border-radius: 40px;
    font-size: 14px;
    font-weight: 500;
    z-index: 20010;
    text-align: center;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: modalNotifFadeInOut ${duration}ms ease forwards;
    pointer-events: none;
  `;
  notif.textContent = text;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    if (notif && notif.parentNode) notif.remove();
  }, duration);
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
      background: #1e1e2e;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 20000;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 250px;
      text-align: center;
      border: 1px solid #3a3a4a;
    `;
    confirmPopup.innerHTML = `
      <p style="margin: 0; font-size: 16px; color: #e0e0e0;">${message}</p>
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
      <div class="add-reaction-card" style="padding: 20px; background: #1e1e2e; border-radius: 20px;">
        <h1 style="font-size: 18px; margin-bottom: 16px; color: #e0e0e0;">Nueva categoría</h1>
        <input type="text" id="new-category-name" placeholder="Nombre (máx 20 caracteres)" maxlength="20" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #3a3a4a; background: #2a2a3a; color: #e0e0e0; margin-bottom: 20px;">
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
    <div class="add-reaction-card" style="padding: 20px; background: #1e1e2e; border-radius: 20px;">
      <h1 style="font-size: 18px; margin-bottom: 16px; color: #e0e0e0;">📁 Guardar sticker en categoría</h1>
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 16px;">
  `;
  if (categories.length === 0) {
    html += `<p style="color: #a0a0b0; text-align: center;">No hay categorías. Crea una nueva.</p>`;
  } else {
    categories.forEach(cat => {
      const canAdd = cat.stickers.length < 30;
      html += `
        <button class="category-save-btn btn" data-category="${escapeHtml(cat.name)}" style="text-align: left; display: flex; justify-content: space-between; align-items: center; background: #2a2a3a; border: none; border-radius: 12px; padding: 10px; margin: 4px 0; cursor: pointer; color: #e0e0e0;" ${!canAdd ? 'disabled style="opacity:0.5;"' : ''}>
          <span>📁 ${escapeHtml(cat.name)}</span>
          <span style="font-size: 12px;">(${cat.stickers.length}/30)</span>
        </button>
      `;
    });
  }
  html += `
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="create-new-category-from-selector" class="btn" style="flex:1; background: #3a3a4a; border: none; border-radius: 40px; padding: 10px; cursor: pointer; color: #e0e0e0;">+ Nueva categoría</button>
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
          url: croppedDataUrl,
          animated: isAnimatedFile && shouldPreserveAnimation,
          animationType: (isAnimatedFile && shouldPreserveAnimation) ? currentFileType : null
        }, categoryName);
        showTransientNotification('✅ Sticker añadido correctamente', 2000);
        refreshStickersInPicker();
        if (isModalOpen) renderModalContent();
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

function redrawCropCanvas() {
  if (!cropCanvas || !cropCtx || !cropImage) return;
  const canvas = cropCanvas;
  const ctx = cropCtx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(canvas.width / 2 + cropTransform.posX, canvas.height / 2 + cropTransform.posY);
  ctx.scale(cropTransform.zoom, cropTransform.zoom);
  ctx.rotate(cropRotation * Math.PI / 180);
  ctx.drawImage(cropImage, -cropImage.width / 2, -cropImage.height / 2);
  ctx.restore();
}

function initCropZoomPan() {
  if (!cropCanvas || !cropCtx || !cropImage) return;
  
  const canvas = cropCanvas;
  cropTransform.zoom = 1;
  cropTransform.posX = 0;
  cropTransform.posY = 0;
  redrawCropCanvas();
  
  function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }
  
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    let newZoom = cropTransform.zoom * delta;
    newZoom = Math.min(Math.max(newZoom, 0.5), 8);
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const before = {
      x: (coords.x - canvas.width/2 - cropTransform.posX) / cropTransform.zoom,
      y: (coords.y - canvas.height/2 - cropTransform.posY) / cropTransform.zoom
    };
    cropTransform.zoom = newZoom;
    const after = {
      x: (coords.x - canvas.width/2 - cropTransform.posX) / cropTransform.zoom,
      y: (coords.y - canvas.height/2 - cropTransform.posY) / cropTransform.zoom
    };
    cropTransform.posX += (before.x - after.x) * cropTransform.zoom;
    cropTransform.posY += (before.y - after.y) * cropTransform.zoom;
    redrawCropCanvas();
  });
  
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      cropInitialDistance = Math.hypot(dx, dy);
      cropIsPinching = true;
    }
  });
  
  canvas.addEventListener('touchmove', (e) => {
    if (cropIsPinching && e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const newDistance = Math.hypot(dx, dy);
      const scale = newDistance / cropInitialDistance;
      let newZoom = cropTransform.zoom * scale;
      newZoom = Math.min(Math.max(newZoom, 0.5), 8);
      if (newZoom !== cropTransform.zoom) {
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;
        const coords = getCanvasCoords(centerX, centerY);
        const before = {
          x: (coords.x - canvas.width/2 - cropTransform.posX) / cropTransform.zoom,
          y: (coords.y - canvas.height/2 - cropTransform.posY) / cropTransform.zoom
        };
        cropTransform.zoom = newZoom;
        const after = {
          x: (coords.x - canvas.width/2 - cropTransform.posX) / cropTransform.zoom,
          y: (coords.y - canvas.height/2 - cropTransform.posY) / cropTransform.zoom
        };
        cropTransform.posX += (before.x - after.x) * cropTransform.zoom;
        cropTransform.posY += (before.y - after.y) * cropTransform.zoom;
        redrawCropCanvas();
      }
    }
  });
  
  canvas.addEventListener('touchend', () => { cropIsPinching = false; });
  canvas.addEventListener('mousedown', (e) => {
    isDraggingCropImage = true;
    cropLastTransform = { zoom: cropTransform.zoom, posX: cropTransform.posX, posY: cropTransform.posY };
    cropDragStart = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  });
  
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && !cropIsPinching) {
      e.preventDefault();
      isDraggingCropImage = true;
      cropLastTransform = { zoom: cropTransform.zoom, posX: cropTransform.posX, posY: cropTransform.posY };
      cropDragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      canvas.style.cursor = 'grabbing';
    }
  });
  
  function onCropMove(clientX, clientY) {
    if (!isDraggingCropImage) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dx = (clientX - cropDragStart.x) * scaleX;
    const dy = (clientY - cropDragStart.y) * scaleY;
    cropTransform.posX = cropLastTransform.posX + dx;
    cropTransform.posY = cropLastTransform.posY + dy;
    redrawCropCanvas();
  }
  
  window.addEventListener('mousemove', (e) => onCropMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDraggingCropImage && !cropIsPinching) {
      e.preventDefault();
      onCropMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  });
  window.addEventListener('mouseup', () => { isDraggingCropImage = false; canvas.style.cursor = 'grab'; });
  window.addEventListener('touchend', () => { isDraggingCropImage = false; canvas.style.cursor = 'grab'; });
  canvas.style.cursor = 'grab';
  canvas.addEventListener('dblclick', () => {
    cropTransform = { zoom: 1, posX: 0, posY: 0 };
    redrawCropCanvas();
  });
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
  
  const preserveCheckboxHtml = isAnimatedFile ? `
    <div style="margin-bottom: 16px; display: flex; gap: 20px; align-items: center; justify-content: center;">
      <button id="preserve-yes" class="preserve-btn preserve-yes" style="background: #2a2a3a; border: 2px solid #3a3a4a; border-radius: 40px; padding: 10px 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
        <span style="font-size: 20px;">✓</span>
        <span>Preservar animación</span>
      </button>
      <button id="preserve-no" class="preserve-btn preserve-no" style="background: #2a2a3a; border: 2px solid #3a3a4a; border-radius: 40px; padding: 10px 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
        <span style="font-size: 20px;">✗</span>
        <span>Eliminar animación</span>
      </button>
    </div>
  ` : '';
  
  const previewContent = isAnimatedFile ? `
    <div style="position: relative; width: 100%; aspect-ratio: 1; background: #1e1e1e; border-radius: 12px; overflow: hidden; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
      <img id="crop-preview-img" src="${currentImageDataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;">
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border: 2px solid #14b8a6; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
    </div>
  ` : `
    <div style="position: relative; width: 100%; aspect-ratio: 1; background: #1e1e1e; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
      <canvas id="crop-canvas" style="width: 100%; height: 100%; display: block; cursor: grab;"></canvas>
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border: 2px solid #14b8a6; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
    </div>
  `;
  
  cropModal.innerHTML = `
    <div class="add-reaction-card" style="width: 100%; max-width: 500px; background: #1e1e2e; border-radius: 20px;">
      <h1 style="font-size: 20px; margin-bottom: 16px; color: #e0e0e0;">✂️ ${isAnimatedFile ? 'Sticker animado' : 'Recortar sticker'}</h1>
      ${previewContent}
      ${preserveCheckboxHtml}
      ${!isAnimatedFile ? `
      <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
        <button id="crop-zoom-out" class="btn" style="flex:1; background: #3a3a4a; border: none; border-radius: 40px; padding: 8px; cursor: pointer; color: #e0e0e0;">🔍 -</button>
        <button id="crop-zoom-in" class="btn" style="flex:1; background: #3a3a4a; border: none; border-radius: 40px; padding: 8px; cursor: pointer; color: #e0e0e0;">🔍 +</button>
        <button id="crop-rotate-left" class="btn" style="flex:1; background: #3a3a4a; border: none; border-radius: 40px; padding: 8px; cursor: pointer; color: #e0e0e0;">↺</button>
        <button id="crop-rotate-right" class="btn" style="flex:1; background: #3a3a4a; border: none; border-radius: 40px; padding: 8px; cursor: pointer; color: #e0e0e0;">↻</button>
        <button id="crop-reset" class="btn" style="flex:1; background: #3a3a4a; border: none; border-radius: 40px; padding: 8px; cursor: pointer; color: #e0e0e0;">⟳ Reset</button>
      </div>
      ` : ''}
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="crop-cancel" class="btn-cancel">Cancelar</button>
        <button id="crop-save" class="btn primary">${isAnimatedFile ? 'Guardar sticker' : 'Guardar recorte'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(cropModal);
  cropModal.style.left = '50%';
  cropModal.style.top = '50%';
  cropModal.style.transform = 'translate(-50%, -50%)';
  
  if (isAnimatedFile) {
    shouldPreserveAnimation = true;
    const preserveYesBtn = cropModal.querySelector('#preserve-yes');
    const preserveNoBtn = cropModal.querySelector('#preserve-no');
    
    const updatePreserveButtons = () => {
      if (shouldPreserveAnimation) {
        preserveYesBtn.style.background = '#14b8a6';
        preserveYesBtn.style.borderColor = '#14b8a6';
        preserveYesBtn.style.color = '#fff';
        preserveNoBtn.style.background = '#2a2a3a';
        preserveNoBtn.style.borderColor = '#3a3a4a';
        preserveNoBtn.style.color = '#e0e0e0';
        showModalNotification('✅ Se mantendrá la animación del sticker', 'success', 1500);
      } else {
        preserveNoBtn.style.background = '#ef4444';
        preserveNoBtn.style.borderColor = '#ef4444';
        preserveNoBtn.style.color = '#fff';
        preserveYesBtn.style.background = '#2a2a3a';
        preserveYesBtn.style.borderColor = '#3a3a4a';
        preserveYesBtn.style.color = '#e0e0e0';
        showModalNotification('❌ Se eliminará la animación (solo fotograma estático)', 'error', 1500);
      }
    };
    
    preserveYesBtn.addEventListener('click', () => {
      shouldPreserveAnimation = true;
      updatePreserveButtons();
    });
    
    preserveNoBtn.addEventListener('click', () => {
      shouldPreserveAnimation = false;
      updatePreserveButtons();
    });
    
    updatePreserveButtons();
    cropPreviewImg = cropModal.querySelector('#crop-preview-img');
    if (cropPreviewImg) {
      cropPreviewImg.onload = () => {
        cropPreviewImg.style.animation = 'fadeIn 0.3s ease-out';
      };
    }
  } else {
    const canvas = cropModal.querySelector('#crop-canvas');
    cropCanvas = canvas;
    cropCtx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      cropImage = img;
      const container = canvas.parentElement;
      const size = container.clientWidth;
      canvas.width = size;
      canvas.height = size;
      initCropZoomPan();
    };
    img.src = currentImageDataUrl;
    
    function updateCropCanvasSize() {
      const container = canvas.parentElement;
      const size = container.clientWidth;
      canvas.width = size;
      canvas.height = size;
      redrawCropCanvas();
    }
    window.addEventListener('resize', () => {
      if (cropModal) updateCropCanvasSize();
    });
    
    const zoomOutBtn = cropModal.querySelector('#crop-zoom-out');
    const zoomInBtn = cropModal.querySelector('#crop-zoom-in');
    const rotateLeftBtn = cropModal.querySelector('#crop-rotate-left');
    const rotateRightBtn = cropModal.querySelector('#crop-rotate-right');
    const resetBtn = cropModal.querySelector('#crop-reset');
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        cropTransform.zoom = Math.max(0.5, cropTransform.zoom - 0.1);
        redrawCropCanvas();
      });
    }
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        cropTransform.zoom = Math.min(8, cropTransform.zoom + 0.1);
        redrawCropCanvas();
      });
    }
    if (rotateLeftBtn) {
      rotateLeftBtn.addEventListener('click', () => {
        cropRotation = (cropRotation - 90) % 360;
        redrawCropCanvas();
      });
    }
    if (rotateRightBtn) {
      rotateRightBtn.addEventListener('click', () => {
        cropRotation = (cropRotation + 90) % 360;
        redrawCropCanvas();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        cropTransform = { zoom: 1, posX: 0, posY: 0 };
        cropRotation = 0;
        redrawCropCanvas();
      });
    }
  }
  
  cropModal.querySelector('#crop-cancel').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideCropModal();
  });
  
  cropModal.querySelector('#crop-save').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let finalDataUrl;
    
    if (isAnimatedFile && shouldPreserveAnimation) {
      finalDataUrl = currentImageDataUrl;
    } else if (isAnimatedFile && !shouldPreserveAnimation) {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        finalDataUrl = tempCanvas.toDataURL('image/png');
        hideCropModal();
        if (onSave) onSave(finalDataUrl);
      };
      img.src = currentImageDataUrl;
      return;
    } else if (!isAnimatedFile) {
      if (cropCanvas && cropCanvas.width > 0 && cropCanvas.height > 0) {
        finalDataUrl = cropCanvas.toDataURL('image/png');
      } else {
        finalDataUrl = currentImageDataUrl;
      }
    } else {
      finalDataUrl = currentImageDataUrl;
    }
    
    hideCropModal();
    if (onSave) onSave(finalDataUrl);
  });
  
  function hideCropModal() {
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
    cropPreviewImg = null;
    cropTransform = { zoom: 1, posX: 0, posY: 0 };
    isDraggingCropImage = false;
    cropIsPinching = false;
  }
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
  isAnimatedFile = false;
  currentFileType = null;
  shouldPreserveAnimation = true;
  
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/gif,image/webp';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      document.body.removeChild(fileInput);
      return;
    }
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    const isGif = fileExt === 'gif';
    const isWebp = fileExt === 'webp';
    isAnimatedFile = isGif || isWebp;
    currentFileType = isGif ? 'gif' : (isWebp ? 'webp' : 'image');
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentImageDataUrl = ev.target.result;
      showCropModal(async (finalDataUrl) => {
        if (!canAddStickerToCategory(pendingCategoryForUpload)) {
          showTransientNotification(`La categoría "${pendingCategoryForUpload}" está llena.`, 2000);
          return;
        }
        try {
          const id = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await addCustomSticker({
            id: id,
            url: finalDataUrl,
            animated: isAnimatedFile && shouldPreserveAnimation,
            animationType: (isAnimatedFile && shouldPreserveAnimation) ? currentFileType : null
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

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-custom-sticker.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-custom-sticker resize-${dir}`;
      element.appendChild(handle);
    }
  });
}

function centerModal() {
  if (!windowElement) return;
  windowElement.offsetHeight;
  const rect = windowElement.getBoundingClientRect();
  const modalWidth = rect.width;
  const modalHeight = rect.height;
  windowX = (window.innerWidth - modalWidth) / 2;
  windowY = (window.innerHeight - modalHeight) / 2;
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
  if (!windowElement || !headerElement) return;

  interact(windowElement).resizable({
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
      start() { window.isDraggingModal = true; },
      move(event) {
        const keyboardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
        if (keyboardHeight > 0) {
          const inputElement = document.getElementById('layerInput');
          if (inputElement) {
            const inputRect = inputElement.getBoundingClientRect();
            const modalRect = windowElement.getBoundingClientRect();
            const inputTop = inputRect.top;
            const modalBottom = modalRect.bottom;
            if (modalBottom + event.dy > inputTop - 10) return;
          }
        }
        windowX += event.dx;
        windowY += event.dy;
        windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        windowElement.setAttribute('data-x', windowX);
        windowElement.setAttribute('data-y', windowY);
        constrainAllModals();
      },
      end() {
        window.isDraggingModal = false;
        if (isLessThan10PercentVisible(windowElement)) {
          hideModal();
        }
        constrainAllModals();
      }
    }
  });
}

function renderModalContent() {
  const contentDiv = document.getElementById('custom-sticker-inner-content');
  if (!contentDiv) return;
  const categories = getCategories();
  let html = `<div style="padding: 16px; overflow-y: auto; height: 100%;">`;
  categories.forEach((cat, idx) => {
    const categoryId = `sticker-cat-${idx}`;
    html += `
      <div class="custom-category-item" style="margin-bottom: 16px; border: 1px solid #3a3a4a; border-radius: 12px; overflow: hidden;">
        <div class="category-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #2a2a3a; cursor: pointer; user-select: none;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="sticker-category-arrow-${categoryId}" style="font-size: 14px; color: #e0e0e0;">${expandedCategories.has(categoryId) ? '▲' : '▼'}</span>
            <strong style="color: #e0e0e0;">${escapeHtml(cat.name)}</strong>
            <span style="font-size: 12px; opacity: 0.7; color: #a0a0b0;">(${cat.stickers.length}/30)</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="delete-category-btn" data-category="${escapeHtml(cat.name)}" style="background: transparent; border: none; cursor: pointer; font-size: 20px; color: #ef4444;">🗑️</button>
            <button class="add-sticker-btn" data-category="${escapeHtml(cat.name)}" style="background: transparent; border: none; cursor: pointer; font-size: 20px; color: #14b8a6;">➕</button>
          </div>
        </div>
        <div id="sticker-category-content-${categoryId}" class="category-content" style="max-height: ${expandedCategories.has(categoryId) ? '1000px' : '0'}; overflow: hidden; transition: max-height 0.3s ease-out; padding-top: ${expandedCategories.has(categoryId) ? '12px' : '0'};">
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; padding: 16px;">
    `;
    for (const sticker of cat.stickers) {
      const isAnimated = sticker.animated || (sticker.url && (sticker.url.match(/\.(gif|webp)(\?|$)/i)));
      html += `
        <div class="custom-sticker-item ${isAnimated ? 'animated-sticker' : ''}" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px; background: #2a2a3a; border-radius: 12px; position: relative;">
          <img src="${sticker.url}" alt="sticker" style="width: 64px; height: 64px; object-fit: contain; border-radius: 8px;" ${isAnimated ? 'class="sticker-animated"' : ''}>
          ${isAnimated ? '<span style="font-size: 10px; color: #14b8a6;">🎬 Animado</span>' : ''}
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
      <button id="create-new-sticker-category-btn" class="btn primary" style="width: 100%; margin-top: 16px; padding: 12px; border-radius: 12px; background: #14b8a6; color: white; border: none; cursor: pointer;">
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
  if (isModalOpen) return;
  if (!windowElement) {
    windowElement = document.getElementById('custom-sticker-movable-window');
    headerElement = document.getElementById('custom-sticker-modal-header');
    closeBtn = document.getElementById('close-custom-sticker-modal');
    overlay = document.getElementById('custom-sticker-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => hideModal();
    registerModal(windowElement, 'custom-sticker-modal');
  }
  renderModalContent();
  overlay.classList.add('active');
  windowElement.style.display = 'flex';
  centerModal();
  isModalOpen = true;
  bringModalToFront('custom-sticker-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
}

export function showCustomStickerModal() {
  showModal();
}

export function showQuickStickerUpload() {
  isAnimatedFile = false;
  currentFileType = null;
  shouldPreserveAnimation = true;
  
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/gif,image/webp';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      document.body.removeChild(fileInput);
      return;
    }
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    const isGif = fileExt === 'gif';
    const isWebp = fileExt === 'webp';
    isAnimatedFile = isGif || isWebp;
    currentFileType = isGif ? 'gif' : (isWebp ? 'webp' : 'image');
    
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