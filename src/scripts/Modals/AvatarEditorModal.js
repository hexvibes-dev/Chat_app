import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../Utils/modalStackManager.js';
import { setContactAvatar } from '../Messages/contactStatus.js';
import { showNotification } from '../Utils/notifications.js';
import { addResizeHandlesToModal } from '../Utils/resizeModals.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;
let currentImageDataUrl = null;
let canvas = null;
let ctx = null;
let originalImage = null;
let rotation = 0;
let zoom = 1;
let flipX = false;
let flipY = false;
let brightness = 100;
let contrast = 100;
let saturate = 100;
let blurAmount = 0;
let imageX = 0, imageY = 0;
let cropShape = 'circle';
let isDrawingShape = false;
let shapeStart = null;
let currentShape = null;
let isAnimatedImage = false;
let preserveAnimation = true;

const ZOOM_IN_SVG = `<svg id="zoom-icon-in" class="zoom-icon-in" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  <line x1="11" y1="8" x2="11" y2="14"/>
  <line x1="8" y1="11" x2="14" y2="11"/>
</svg>`;

const ZOOM_OUT_SVG = `<svg id="zoom-icon-out" class="zoom-icon-out" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  <line x1="8" y1="11" x2="14" y2="11"/>
</svg>`;

const ZOOM_NORMAL_SVG = `<svg id="zoom-icon-normal" class="zoom-icon-normal" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg>`;

const ROTATE_RIGHT_SVG = `<svg id="rotate-icon-right" class="rotate-icon-right" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 12a9 9 0 1 1-9-9" />
  <path d="M21 3v6h-6" />
  <path d="M15 9L21 3" />
</svg>`;

const ROTATE_LEFT_SVG = `<svg id="rotate-icon-left" class="rotate-icon-left" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M3 12a9 9 0 1 0 9-9" />
  <path d="M3 3v6h6" />
  <path d="M3 3L9 9" />
</svg>`;

const ROTATE_NORMAL_SVG = `<svg id="rotate-icon-normal" class="rotate-icon-normal" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 12a9 9 0 1 1-9-9" />
  <path d="M21 3v6h-6" />
</svg>`;

const BRIGHTNESS_UP_SVG = `<svg id="brightness-icon-up" class="brightness-icon-up" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  <path d="M12 8v8M8 12h8"/>
</svg>`;

const BRIGHTNESS_DOWN_SVG = `<svg id="brightness-icon-down" class="brightness-icon-down" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  <path d="M8 12h8"/>
</svg>`;

const BRIGHTNESS_NORMAL_SVG = `<svg id="brightness-icon-normal" class="brightness-icon-normal" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
</svg>`;

const CONTRAST_UP_SVG = `<svg id="contrast-icon-up" class="contrast-icon-up" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 2v20"/>
  <path d="M12 8v8"/>
</svg>`;

const CONTRAST_DOWN_SVG = `<svg id="contrast-icon-down" class="contrast-icon-down" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 2v20"/>
  <path d="M8 12h8"/>
</svg>`;

const CONTRAST_NORMAL_SVG = `<svg id="contrast-icon-normal" class="contrast-icon-normal" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 2v20"/>
</svg>`;

const SATURATE_UP_SVG = `<svg id="saturate-icon-up" class="saturate-icon-up" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2C8 6 4 10 4 14s8 8 8 8 8-4 8-8-4-8-8-8z"/>
  <path d="M12 6v12"/>
</svg>`;

const SATURATE_DOWN_SVG = `<svg id="saturate-icon-down" class="saturate-icon-down" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2C8 6 4 10 4 14s8 8 8 8 8-4 8-8-4-8-8-8z"/>
  <path d="M8 14h8"/>
</svg>`;

const SATURATE_NORMAL_SVG = `<svg id="saturate-icon-normal" class="saturate-icon-normal" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2C8 6 4 10 4 14s8 8 8 8 8-4 8-8-4-8-8-8z"/>
</svg>`;

const BLUR_UP_SVG = `<svg id="blur-icon-up" class="blur-icon-up" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2v20M18 6v12M6 6v12"/>
  <line x1="4" y1="12" x2="20" y2="12"/>
  <line x1="12" y1="4" x2="12" y2="20"/>
</svg>`;

const BLUR_DOWN_SVG = `<svg id="blur-icon-down" class="blur-icon-down" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2v20M18 6v12M6 6v12"/>
  <line x1="4" y1="12" x2="20" y2="12"/>
</svg>`;

const BLUR_NORMAL_SVG = `<svg id="blur-icon-normal" class="blur-icon-normal" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2v20M18 6v12M6 6v12"/>
</svg>`;

function showTransientNotification(text, duration = 2000) {
  showNotification(text, duration);
}

function centerModal() {
  if (!windowElement) return;
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

  if (getComputedStyle(windowElement).position !== 'fixed') {
    windowElement.style.position = 'fixed';
  }

  interact(windowElement).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 100, height: 150 },
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

function applyFiltersAndDraw() {
  if (!ctx || !originalImage) return;
  
  const size = Math.min(canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.beginPath();
  
  if (cropShape === 'circle') {
    ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  } else if (cropShape === 'square') {
    ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
  } else if (cropShape === 'triangle') {
    const side = size;
    const height = side * Math.sqrt(3) / 2;
    ctx.moveTo(centerX, centerY - height / 2);
    ctx.lineTo(centerX + side / 2, centerY + height / 2);
    ctx.lineTo(centerX - side / 2, centerY + height / 2);
    ctx.closePath();
  } else if (cropShape === 'heart') {
    ctx.moveTo(centerX, centerY + size / 4);
    ctx.bezierCurveTo(centerX - size / 2, centerY - size / 2, centerX - size, centerY + size / 3, centerX, centerY + size / 1.5);
    ctx.bezierCurveTo(centerX + size, centerY + size / 3, centerX + size / 2, centerY - size / 2, centerX, centerY + size / 4);
  } else if (cropShape === 'star') {
    const outerR = size / 2;
    const innerR = size / 4;
    const spikes = 5;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.moveTo(centerX + Math.cos(rot) * outerR, centerY + Math.sin(rot) * outerR);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(centerX + Math.cos(rot) * innerR, centerY + Math.sin(rot) * innerR);
      rot += step;
      ctx.lineTo(centerX + Math.cos(rot) * outerR, centerY + Math.sin(rot) * outerR);
    }
    ctx.closePath();
  } else if (cropShape === 'hexagon') {
    const sides = 6;
    const radius = size / 2;
    for (let i = 0; i <= sides; i++) {
      const angle = i * (Math.PI * 2 / sides) - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  
  ctx.clip();
  
  ctx.translate(centerX + imageX, centerY + imageY);
  ctx.scale(zoom * (flipX ? -1 : 1), zoom * (flipY ? -1 : 1));
  ctx.rotate(rotation * Math.PI / 180);
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blurAmount}px)`;
  ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
  ctx.restore();
  
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  
  if (cropShape === 'circle') {
    ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  } else if (cropShape === 'square') {
    ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
  } else if (cropShape === 'triangle') {
    const side = size;
    const height = side * Math.sqrt(3) / 2;
    ctx.moveTo(centerX, centerY - height / 2);
    ctx.lineTo(centerX + side / 2, centerY + height / 2);
    ctx.lineTo(centerX - side / 2, centerY + height / 2);
    ctx.closePath();
  } else if (cropShape === 'heart') {
    ctx.moveTo(centerX, centerY + size / 4);
    ctx.bezierCurveTo(centerX - size / 2, centerY - size / 2, centerX - size, centerY + size / 3, centerX, centerY + size / 1.5);
    ctx.bezierCurveTo(centerX + size, centerY + size / 3, centerX + size / 2, centerY - size / 2, centerX, centerY + size / 4);
  } else if (cropShape === 'star') {
    const outerR = size / 2;
    const innerR = size / 4;
    const spikes = 5;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.moveTo(centerX + Math.cos(rot) * outerR, centerY + Math.sin(rot) * outerR);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(centerX + Math.cos(rot) * innerR, centerY + Math.sin(rot) * innerR);
      rot += step;
      ctx.lineTo(centerX + Math.cos(rot) * outerR, centerY + Math.sin(rot) * outerR);
    }
    ctx.closePath();
  } else if (cropShape === 'hexagon') {
    const sides = 6;
    const radius = size / 2;
    for (let i = 0; i <= sides; i++) {
      const angle = i * (Math.PI * 2 / sides) - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  
  ctx.stroke();
  ctx.restore();
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  let clientX, clientY;
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDrawShape(e) {
  if (!isDrawingShape) return;
  e.preventDefault();
  const pos = getCanvasCoords(e);
  shapeStart = pos;
}

function drawShape(e) {
  if (!isDrawingShape || !shapeStart) return;
  e.preventDefault();
  const pos = getCanvasCoords(e);
  applyFiltersAndDraw();
  
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = '#ef4444';
  ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  
  const width = pos.x - shapeStart.x;
  const height = pos.y - shapeStart.y;
  const x = Math.min(shapeStart.x, pos.x);
  const y = Math.min(shapeStart.y, pos.y);
  
  if (currentShape === 'rectangle') {
    ctx.rect(x, y, width, height);
  } else if (currentShape === 'circle') {
    const radius = Math.sqrt(width * width + height * height) / 2;
    const centerX = shapeStart.x + width / 2;
    const centerY = shapeStart.y + height / 2;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  }
  
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function endDrawShape(e) {
  if (!isDrawingShape || !shapeStart) return;
  e.preventDefault();
  const pos = getCanvasCoords(e);
  const width = Math.abs(pos.x - shapeStart.x);
  const height = Math.abs(pos.y - shapeStart.y);
  if (width > 10 && height > 10) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = Math.max(width / originalImage.width, height / originalImage.height);
    zoom = scale;
    imageX = (canvas.width / 2 - centerX) / zoom;
    imageY = (canvas.height / 2 - centerY) / zoom;
    applyFiltersAndDraw();
    showTransientNotification('Forma aplicada al recorte');
  }
  isDrawingShape = false;
  shapeStart = null;
  currentShape = null;
}

function resetAll() {
  rotation = 0;
  zoom = 1;
  flipX = false;
  flipY = false;
  brightness = 100;
  contrast = 100;
  saturate = 100;
  blurAmount = 0;
  imageX = 0;
  imageY = 0;
  cropShape = 'circle';
  if (originalImage) {
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    applyFiltersAndDraw();
  }
  const shapeBtns = document.querySelectorAll('.shape-btn');
  if (shapeBtns.length) {
    shapeBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.shape === 'circle') btn.classList.add('active');
    });
  }
}

function moveImage(dx, dy) {
  imageX += dx;
  imageY += dy;
  applyFiltersAndDraw();
}

function loadImage(file) {
  const fileExt = file.name.split('.').pop().toLowerCase();
  isAnimatedImage = fileExt === 'gif' || fileExt === 'webp';
  preserveAnimation = true;
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    const imageDataUrl = ev.target.result;
    currentImageDataUrl = imageDataUrl;
    
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      const maxSize = 512;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      resetAll();
      if (isAnimatedImage && preserveAnimation) {
        showTransientNotification('Imagen animada cargada. Los efectos visuales NO se aplicarán si conservas la animación.', 4000);
      } else if (isAnimatedImage && !preserveAnimation) {
        showTransientNotification('Animación eliminada, se guardará como imagen estática', 2000);
      }
      updateAnimationButtons();
      updateAnimatedPreview();
    };
    img.src = imageDataUrl;
  };
  reader.readAsDataURL(file);
}

function updateAnimatedPreview() {
  const previewContainer = document.getElementById('avatar-animated-preview');
  if (!previewContainer) return;
  
  if (isAnimatedImage && preserveAnimation && currentImageDataUrl) {
    previewContainer.style.display = 'flex';
    previewContainer.innerHTML = `
      <div class="animated-preview-container">
        <img class="aninated-preview" src="${currentImageDataUrl}" />
      </div>
      <div class="alert-aninated">
        ⚠️ Efectos no aplicados
      </div>
    `;
  } else { 
    previewContainer.style.display = 'none';
    previewContainer.innerHTML = '';
  }
}

function updateAnimationButtons() {
  const animationContainer = document.getElementById('avatar-animation-controls');
  if (!animationContainer) return;
  
  if (isAnimatedImage) {
    animationContainer.style.display = 'flex';
    const preserveBtn = document.getElementById('avatar-preserve-animation');
    const removeBtn = document.getElementById('avatar-remove-animation');
    
    if (preserveBtn) {
      preserveBtn.style.background = preserveAnimation ? '#14b8a6' : '#3a3a4a';
      preserveBtn.style.borderColor = preserveAnimation ? '#14b8a6' : '#3a3a4a';
    }
    if (removeBtn) {
      removeBtn.style.background = !preserveAnimation ? '#ef4444' : '#3a3a4a';
      removeBtn.style.borderColor = !preserveAnimation ? '#ef4444' : '#3a3a4a';
    }
  } else {
    animationContainer.style.display = 'none';
  }
  updateAnimatedPreview();
}

function setPreserveAnimation(value) {
  preserveAnimation = value;
  if (originalImage && currentImageDataUrl) {
    if (isAnimatedImage && preserveAnimation) {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        resetAll();
        showTransientNotification('Animación preservada. Los efectos NO se aplican a la animación.', 3000);
      };
      img.src = currentImageDataUrl;
    } else if (isAnimatedImage && !preserveAnimation) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const tempImg = new Image();
      tempImg.onload = () => {
        tempCanvas.width = tempImg.width;
        tempCanvas.height = tempImg.height;
        tempCtx.drawImage(tempImg, 0, 0);
        const staticDataUrl = tempCanvas.toDataURL('image/png');
        const staticImg = new Image();
        staticImg.onload = () => {
          originalImage = staticImg;
          resetAll();
          showTransientNotification('Animación eliminada, versión estática. Ahora puedes aplicar efectos.', 3000);
        };
        staticImg.src = staticDataUrl;
      };
      tempImg.src = currentImageDataUrl;
    }
  }
  updateAnimationButtons();
}

function renderModal() {
  const container = document.getElementById('avatar-editor-inner-content');
  if (!container) return;
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px; padding: 12px; height: 100%; overflow-y: auto;">
      <div style="position: relative;">
        <div class="avatar-canvas-container">
          <canvas id="avatar-editor-canvas"></canvas>
        </div>
        <div id="avatar-animated-preview" style="position: absolute; top: 16px; right: 16px; width: 80px; height: 80px; background: rgba(0,0,0,0.6); border-radius: 12px; overflow: hidden; display: none; border: 2px solid #14b8a6;"></div>
      </div>
      
      <div class="avatar-buttons-upload-reset">
        <div class="avatar-upload-button-container"><button id="avatar-upload-btn">📁 Subir imagen</button>
        </div>
        <div class="avatar-reset-container">
          <button id="avatar-reset" class="btn">⟳Resetear</button>
        </div>
      </div>
      
      <div id="avatar-animation-controls">
        <button id="avatar-preserve-animation">[ ▶︎ ] Preservar animación</button>
        <button id="avatar-remove-animation"> [ || ] Eliminar animación</button>
      </div>
      
      <div class="Avatar-options">
        <div>
          <label style="color:var(--avatar-option-rotation-color);font-size:var(--avatar-option-rotation-font-size);font-family:var(--avatar-option-rotation-font-family);font-weight:var(--avatar-option-rotation-font-weight);line-height:var(--avatar-option-rotation-line-height);letter-spacing:var(--avatar-option-rotation-letter-spacing);word-spacing:var(--avatar-option-rotation-word-spacing);text-transform:var(--avatar-option-rotation-text-transform);text-shadow:var(--avatar-option-rotation-text-shadow);font-style:var(--avatar-option-rotation-font-style);margin:0 6px 0 12px;">
            <span id="rotate-icon"></span> Rotación <span id="rotation-value">0</span>°
          </label>
          <input type="range" id="avatar-rotation" min="-180" max="180" value="0" step="1" style="width:var(--avatar-option-rotation-slider-width);height:var(--avatar-option-rotation-slider-track-height);background:var(--avatar-option-rotation-slider-track-bg);border-top:var(--avatar-option-rotation-slider-track-border-top-width) var(--avatar-option-rotation-slider-track-border-top-style) var(--avatar-option-rotation-slider-track-border-top-color);border-right:var(--avatar-option-rotation-slider-track-border-right-width) var(--avatar-option-rotation-slider-track-border-right-style) var(--avatar-option-rotation-slider-track-border-right-color);border-bottom:var(--avatar-option-rotation-slider-track-border-bottom-width) var(--avatar-option-rotation-slider-track-border-bottom-style) var(--avatar-option-rotation-slider-track-border-bottom-color);border-left:var(--avatar-option-rotation-slider-track-border-left-width) var(--avatar-option-rotation-slider-track-border-left-style) var(--avatar-option-rotation-slider-track-border-left-color);border-radius:var(--avatar-option-rotation-slider-track-radius);box-shadow:var(--avatar-option-rotation-slider-track-shadow);transition:var(--avatar-option-rotation-slider-transition);appearance:none;outline:none;">
        </div>
        <div>
          <label style="color:var(--avatar-option-zoom-color);font-size:var(--avatar-option-zoom-font-size);font-family:var(--avatar-option-zoom-font-family);font-weight:var(--avatar-option-zoom-font-weight);line-height:var(--avatar-option-zoom-line-height);letter-spacing:var(--avatar-option-zoom-letter-spacing);word-spacing:var(--avatar-option-zoom-word-spacing);text-transform:var(--avatar-option-zoom-text-transform);text-shadow:var(--avatar-option-zoom-text-shadow);font-style:var(--avatar-option-zoom-font-style);margin:0 6px 0 12px;">
            <span id="zoom-icon"></span> Zoom <span id="zoom-value">1.0</span>x
          </label>
          <input type="range" id="avatar-zoom" min="0.5" max="3" step="0.01" value="1" style="width:var(--avatar-option-zoom-slider-width);height:var(--avatar-option-zoom-slider-track-height);background:var(--avatar-option-zoom-slider-track-bg);border-top:var(--avatar-option-zoom-slider-track-border-top-width) var(--avatar-option-zoom-slider-track-border-top-style) var(--avatar-option-zoom-slider-track-border-top-color);border-right:var(--avatar-option-zoom-slider-track-border-right-width) var(--avatar-option-zoom-slider-track-border-right-style) var(--avatar-option-zoom-slider-track-border-right-color);border-bottom:var(--avatar-option-zoom-slider-track-border-bottom-width) var(--avatar-option-zoom-slider-track-border-bottom-style) var(--avatar-option-zoom-slider-track-border-bottom-color);border-left:var(--avatar-option-zoom-slider-track-border-left-width) var(--avatar-option-zoom-slider-track-border-left-style) var(--avatar-option-zoom-slider-track-border-left-color);border-radius:var(--avatar-option-zoom-slider-track-radius);box-shadow:var(--avatar-option-zoom-slider-track-shadow);transition:var(--avatar-option-zoom-slider-transition);appearance:none;outline:none;">
        </div>
        <div>
          <label style="color:var(--avatar-option-brightness-color);font-size:var(--avatar-option-brightness-font-size);font-family:var(--avatar-option-brightness-font-family);font-weight:var(--avatar-option-brightness-font-weight);line-height:var(--avatar-option-brightness-line-height);letter-spacing:var(--avatar-option-brightness-letter-spacing);word-spacing:var(--avatar-option-brightness-word-spacing);text-transform:var(--avatar-option-brightness-text-transform);text-shadow:var(--avatar-option-brightness-text-shadow);font-style:var(--avatar-option-brightness-font-style);margin:0 6px 0 12px;">
            <span id="brightness-icon"></span> Brillo <span id="brightness-value">100</span>%
          </label>
          <input type="range" id="avatar-brightness" min="0" max="200" value="100" style="width:var(--avatar-option-brightness-slider-width);height:var(--avatar-option-brightness-slider-track-height);background:var(--avatar-option-brightness-slider-track-bg);border-top:var(--avatar-option-brightness-slider-track-border-top-width) var(--avatar-option-brightness-slider-track-border-top-style) var(--avatar-option-brightness-slider-track-border-top-color);border-right:var(--avatar-option-brightness-slider-track-border-right-width) var(--avatar-option-brightness-slider-track-border-right-style) var(--avatar-option-brightness-slider-track-border-right-color);border-bottom:var(--avatar-option-brightness-slider-track-border-bottom-width) var(--avatar-option-brightness-slider-track-border-bottom-style) var(--avatar-option-brightness-slider-track-border-bottom-color);border-left:var(--avatar-option-brightness-slider-track-border-left-width) var(--avatar-option-brightness-slider-track-border-left-style) var(--avatar-option-brightness-slider-track-border-left-color);border-radius:var(--avatar-option-brightness-slider-track-radius);box-shadow:var(--avatar-option-brightness-slider-track-shadow);transition:var(--avatar-option-brightness-slider-transition);appearance:none;outline:none;">
        </div>
        <div>
          <label style="color:var(--avatar-option-contrast-color);font-size:var(--avatar-option-contrast-font-size);font-family:var(--avatar-option-contrast-font-family);font-weight:var(--avatar-option-contrast-font-weight);line-height:var(--avatar-option-contrast-line-height);letter-spacing:var(--avatar-option-contrast-letter-spacing);word-spacing:var(--avatar-option-contrast-word-spacing);text-transform:var(--avatar-option-contrast-text-transform);text-shadow:var(--avatar-option-contrast-text-shadow);font-style:var(--avatar-option-contrast-font-style);margin:0 6px 0 12px;">
            <span id="contrast-icon"></span> Contraste <span id="contrast-value">100</span>%
          </label>
          <input type="range" id="avatar-contrast" min="0" max="200" value="100" style="width:var(--avatar-option-contrast-slider-width);height:var(--avatar-option-contrast-slider-track-height);background:var(--avatar-option-contrast-slider-track-bg);border-top:var(--avatar-option-contrast-slider-track-border-top-width) var(--avatar-option-contrast-slider-track-border-top-style) var(--avatar-option-contrast-slider-track-border-top-color);border-right:var(--avatar-option-contrast-slider-track-border-right-width) var(--avatar-option-contrast-slider-track-border-right-style) var(--avatar-option-contrast-slider-track-border-right-color);border-bottom:var(--avatar-option-contrast-slider-track-border-bottom-width) var(--avatar-option-contrast-slider-track-border-bottom-style) var(--avatar-option-contrast-slider-track-border-bottom-color);border-left:var(--avatar-option-contrast-slider-track-border-left-width) var(--avatar-option-contrast-slider-track-border-left-style) var(--avatar-option-contrast-slider-track-border-left-color);border-radius:var(--avatar-option-contrast-slider-track-radius);box-shadow:var(--avatar-option-contrast-slider-track-shadow);transition:var(--avatar-option-contrast-slider-transition);appearance:none;outline:none;">
        </div>
        <div>
          <label style="color:var(--avatar-option-saturate-color);font-size:var(--avatar-option-saturate-font-size);font-family:var(--avatar-option-saturate-font-family);font-weight:var(--avatar-option-saturate-font-weight);line-height:var(--avatar-option-saturate-line-height);letter-spacing:var(--avatar-option-saturate-letter-spacing);word-spacing:var(--avatar-option-saturate-word-spacing);text-transform:var(--avatar-option-saturate-text-transform);text-shadow:var(--avatar-option-saturate-text-shadow);font-style:var(--avatar-option-saturate-font-style);margin:0 6px 0 12px;">
            <span id="saturate-icon"></span> Saturación <span id="saturate-value">100</span>%
          </label>
          <input type="range" id="avatar-saturate" min="0" max="200" value="100" style="width:var(--avatar-option-saturate-slider-width);height:var(--avatar-option-saturate-slider-track-height);background:var(--avatar-option-saturate-slider-track-bg);border-top:var(--avatar-option-saturate-slider-track-border-top-width) var(--avatar-option-saturate-slider-track-border-top-style) var(--avatar-option-saturate-slider-track-border-top-color);border-right:var(--avatar-option-saturate-slider-track-border-right-width) var(--avatar-option-saturate-slider-track-border-right-style) var(--avatar-option-saturate-slider-track-border-right-color);border-bottom:var(--avatar-option-saturate-slider-track-border-bottom-width) var(--avatar-option-saturate-slider-track-border-bottom-style) var(--avatar-option-saturate-slider-track-border-bottom-color);border-left:var(--avatar-option-saturate-slider-track-border-left-width) var(--avatar-option-saturate-slider-track-border-left-style) var(--avatar-option-saturate-slider-track-border-left-color);border-radius:var(--avatar-option-saturate-slider-track-radius);box-shadow:var(--avatar-option-saturate-slider-track-shadow);transition:var(--avatar-option-saturate-slider-transition);appearance:none;outline:none;">
        </div>
        <div>
          <label style="color:var(--avatar-option-blur-color);font-size:var(--avatar-option-blur-font-size);font-family:var(--avatar-option-blur-font-family);font-weight:var(--avatar-option-blur-font-weight);line-height:var(--avatar-option-blur-line-height);letter-spacing:var(--avatar-option-blur-letter-spacing);word-spacing:var(--avatar-option-blur-word-spacing);text-transform:var(--avatar-option-blur-text-transform);text-shadow:var(--avatar-option-blur-text-shadow);font-style:var(--avatar-option-blur-font-style);margin:0 6px 0 12px;">
            <span id="blur-icon"></span> Desenfoque <span id="blur-value">0</span>px
          </label>
          <input type="range" id="avatar-blur" min="0" max="10" step="0.1" value="0" style="width:var(--avatar-option-blur-slider-width);height:var(--avatar-option-blur-slider-track-height);background:var(--avatar-option-blur-slider-track-bg);border-top:var(--avatar-option-blur-slider-track-border-top-width) var(--avatar-option-blur-slider-track-border-top-style) var(--avatar-option-blur-slider-track-border-top-color);border-right:var(--avatar-option-blur-slider-track-border-right-width) var(--avatar-option-blur-slider-track-border-right-style) var(--avatar-option-blur-slider-track-border-right-color);border-bottom:var(--avatar-option-blur-slider-track-border-bottom-width) var(--avatar-option-blur-slider-track-border-bottom-style) var(--avatar-option-blur-slider-track-border-bottom-color);border-left:var(--avatar-option-blur-slider-track-border-left-width) var(--avatar-option-blur-slider-track-border-left-style) var(--avatar-option-blur-slider-track-border-left-color);border-radius:var(--avatar-option-blur-slider-track-radius);box-shadow:var(--avatar-option-blur-slider-track-shadow);transition:var(--avatar-option-blur-slider-transition);appearance:none;outline:none;">
        </div>
      </div>
      
      <div class="avatar-move-buttons-container">
        <button id="avatar-flip-x"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-symmetry-vertical" viewBox="0 0 16 16">
  <path d="M7 2.5a.5.5 0 0 0-.939-.24l-6 11A.5.5 0 0 0 .5 14h6a.5.5 0 0 0 .5-.5zm2.376-.484a.5.5 0 0 1 .563.245l6 11A.5.5 0 0 1 15.5 14h-6a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .376-.484M10 4.46V13h4.658z"/>
</svg></button>
        <button id="avatar-flip-y"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-symmetry-horizontal" viewBox="0 0 16 16">
  <path d="M13.5 7a.5.5 0 0 0 .24-.939l-11-6A.5.5 0 0 0 2 .5v6a.5.5 0 0 0 .5.5zm.485 2.376a.5.5 0 0 1-.246.563l-11 6A.5.5 0 0 1 2 15.5v-6a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .485.376M11.539 10H3v4.658z"/>
</svg></button>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button id="avatar-move-left"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l14 0" /><path d="M5 12l4 4" /><path d="M5 12l4 -4" /></svg></button>
        <button id="avatar-move-up"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5l0 14" /><path d="M16 9l-4 -4" /><path d="M8 9l4 -4" /></svg></button>
        <button id="avatar-move-down"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5l0 14" /><path d="M16 15l-4 4" /><path d="M8 15l4 4" /></svg></button>
        <button id="avatar-move-right"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l14 0" /><path d="M15 16l4 -4" /><path d="M15 8l4 4" /></svg></button>
      </div>
      
      <div style="border-top: 1px solid #3a3a4a; margin: 8px 0;"></div>
      
      <div class="avatar-form-container">
        <label class="avatar-form-enun">Forma de recorte:</label>
        <div class="avatar-form-buttons-container">
          <button class="shape-btn ${cropShape === 'circle' ? 'active' : ''}" data-shape="circle"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-circle" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
</svg></button>
          <button class="shape-btn ${cropShape === 'square' ? 'active' : ''}" data-shape="square"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-square" viewBox="0 0 16 16">
  <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
</svg></button>
          <button class="shape-btn ${cropShape === 'triangle' ? 'active' : ''}" data-shape="triangle"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-triangle" viewBox="0 0 16 16">
  <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
</svg></button>
          <button class="shape-btn ${cropShape === 'heart' ? 'active' : ''}" data-shape="heart"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-heart" viewBox="0 0 16 16">
  <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
</svg></button>
          <button class="shape-btn ${cropShape === 'star' ? 'active' : ''}" data-shape="star"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16">
  <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.56.56 0 0 0-.163-.505L1.71 6.745l4.052-.576a.53.53 0 0 0 .393-.288L8 2.223l1.847 3.658a.53.53 0 0 0 .393.288l4.052.575-2.906 2.77a.56.56 0 0 0-.163.506l.694 3.957-3.686-1.894a.5.5 0 0 0-.461 0z"/>
</svg></button>
          <button class="shape-btn ${cropShape === 'hexagon' ? 'active' : ''}" data-shape="hexagon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hexagon" viewBox="0 0 16 16">
  <path d="M14 4.577v6.846L8 15l-6-3.577V4.577L8 1zM8.5.134a1 1 0 0 0-1 0l-6 3.577a1 1 0 0 0-.5.866v6.846a1 1 0 0 0 .5.866l6 3.577a1 1 0 0 0 1 0l6-3.577a1 1 0 0 0 .5-.866V4.577a1 1 0 0 0-.5-.866z"/>
</svg></button>
        </div>
      </div>
      
      <div class="avatar-cut-container">
        <button id="avatar-draw-rectangle">ibujar rectángulo</button>
        <button id="avatar-draw-circle">Dibujar círculo</button>
        <button id="avatar-cancel-draw">Cancelar dibujo</button>
      </div>
      
      <div style="border-top: 1px solid #3a3a4a; margin: 8px 0;"></div>
      
      <div class="avatar-modal-footer">
        <button id="avatar-cancel">Cancelar</button>
        <button id="avatar-save">Usar</button>
      </div>
    </div>
  `;

  canvas = document.getElementById('avatar-editor-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  
  const rotationSlider = document.getElementById('avatar-rotation');
  const zoomSlider = document.getElementById('avatar-zoom');
  const brightnessSlider = document.getElementById('avatar-brightness');
  const contrastSlider = document.getElementById('avatar-contrast');
  const saturateSlider = document.getElementById('avatar-saturate');
  const blurSlider = document.getElementById('avatar-blur');
  const flipXBtn = document.getElementById('avatar-flip-x');
  const flipYBtn = document.getElementById('avatar-flip-y');
  const moveLeftBtn = document.getElementById('avatar-move-left');
  const moveUpBtn = document.getElementById('avatar-move-up');
  const moveDownBtn = document.getElementById('avatar-move-down');
  const moveRightBtn = document.getElementById('avatar-move-right');
  const resetBtn = document.getElementById('avatar-reset');
  const uploadBtn = document.getElementById('avatar-upload-btn');
  const cancelBtn = document.getElementById('avatar-cancel');
  const saveBtn = document.getElementById('avatar-save');
  const drawRectBtn = document.getElementById('avatar-draw-rectangle');
  const drawCircleBtn = document.getElementById('avatar-draw-circle');
  const cancelDrawBtn = document.getElementById('avatar-cancel-draw');
  const preserveAnimBtn = document.getElementById('avatar-preserve-animation');
  const removeAnimBtn = document.getElementById('avatar-remove-animation');
  
  const rotateIcon = document.getElementById('rotate-icon');
  const rotationValueSpan = document.getElementById('rotation-value');
  if (rotateIcon) {
    rotateIcon.innerHTML = ROTATE_NORMAL_SVG;
    rotateIcon.style.display = 'inline-flex';
    rotateIcon.style.alignItems = 'center';
    rotateIcon.style.marginRight = '4px';
    
    let previousRotation = 0;
    
    rotationSlider.addEventListener('input', (e) => {
      const newRotation = parseInt(e.target.value);
      rotation = newRotation;
      applyFiltersAndDraw();
      
      if (rotationValueSpan) rotationValueSpan.textContent = Math.abs(newRotation);
      
      if (newRotation > previousRotation) {
        rotateIcon.innerHTML = ROTATE_RIGHT_SVG;
        rotateIcon.style.color = '#4ade80';
      } else if (newRotation < previousRotation) {
        rotateIcon.innerHTML = ROTATE_LEFT_SVG;
        rotateIcon.style.color = '#f87171';
      }
      
      previousRotation = newRotation;
    });
    
    rotationSlider.addEventListener('change', () => {
      setTimeout(() => {
        if (rotation === 0) {
          rotateIcon.innerHTML = ROTATE_NORMAL_SVG;
          rotateIcon.style.color = 'inherit';
        } else if (rotation > 0) {
          rotateIcon.innerHTML = ROTATE_RIGHT_SVG;
          rotateIcon.style.color = '#4ade80';
        } else {
          rotateIcon.innerHTML = ROTATE_LEFT_SVG;
          rotateIcon.style.color = '#f87171';
        }
      }, 500);
    });
  }
  
  function updateZoomIconSize(zoomValue) {
    const zoomSvg = document.querySelector('#zoom-icon svg');
    if (zoomSvg) {
      const baseSize = 14;
      const newSize = baseSize + (zoomValue - 1) * 4;
      const clampedSize = Math.max(10, Math.min(22, newSize));
      zoomSvg.setAttribute('width', clampedSize);
      zoomSvg.setAttribute('height', clampedSize);
    }
  }
  
  const zoomIcon = document.getElementById('zoom-icon');
  const zoomValueSpan = document.getElementById('zoom-value');
  if (zoomIcon) {
    zoomIcon.innerHTML = ZOOM_NORMAL_SVG;
    zoomIcon.style.display = 'inline-flex';
    zoomIcon.style.alignItems = 'center';
    zoomIcon.style.marginRight = '4px';
    
    let previousZoom = 1;
    
    zoomSlider.addEventListener('input', (e) => {
      const newZoom = parseFloat(e.target.value);
      zoom = newZoom;
      applyFiltersAndDraw();
      
      if (zoomValueSpan) zoomValueSpan.textContent = newZoom.toFixed(2);
      
      if (newZoom > previousZoom) {
        zoomIcon.innerHTML = ZOOM_IN_SVG;
        zoomIcon.style.color = '#4ade80';
        updateZoomIconSize(newZoom);
      } else if (newZoom < previousZoom) {
        zoomIcon.innerHTML = ZOOM_OUT_SVG;
        zoomIcon.style.color = '#f87171';
        updateZoomIconSize(newZoom);
      }
      
      previousZoom = newZoom;
    });
    
    zoomSlider.addEventListener('change', () => {
      setTimeout(() => {
        if (zoom === 1) {
          zoomIcon.innerHTML = ZOOM_NORMAL_SVG;
          zoomIcon.style.color = 'inherit';
          updateZoomIconSize(1);
        } else if (zoom > 1) {
          zoomIcon.innerHTML = ZOOM_IN_SVG;
          zoomIcon.style.color = '#4ade80';
          updateZoomIconSize(zoom);
        } else {
          zoomIcon.innerHTML = ZOOM_OUT_SVG;
          zoomIcon.style.color = '#f87171';
          updateZoomIconSize(zoom);
        }
      }, 500);
    });
  }
  
  const brightnessIcon = document.getElementById('brightness-icon');
  const brightnessValueSpan = document.getElementById('brightness-value');
  if (brightnessIcon) {
    brightnessIcon.innerHTML = BRIGHTNESS_NORMAL_SVG;
    brightnessIcon.style.display = 'inline-flex';
    brightnessIcon.style.alignItems = 'center';
    brightnessIcon.style.marginRight = '4px';
    
    let previousBrightness = 100;
    
    brightnessSlider.addEventListener('input', (e) => {
      const newBrightness = parseInt(e.target.value);
      brightness = newBrightness;
      applyFiltersAndDraw();
      
      if (brightnessValueSpan) brightnessValueSpan.textContent = newBrightness;
      
      if (newBrightness > previousBrightness) {
        brightnessIcon.innerHTML = BRIGHTNESS_UP_SVG;
        brightnessIcon.style.color = '#4ade80';
      } else if (newBrightness < previousBrightness) {
        brightnessIcon.innerHTML = BRIGHTNESS_DOWN_SVG;
        brightnessIcon.style.color = '#f87171';
      }
      
      previousBrightness = newBrightness;
    });
    
    brightnessSlider.addEventListener('change', () => {
      setTimeout(() => {
        if (brightness === 100) {
          brightnessIcon.innerHTML = BRIGHTNESS_NORMAL_SVG;
          brightnessIcon.style.color = 'inherit';
        } else if (brightness > 100) {
          brightnessIcon.innerHTML = BRIGHTNESS_UP_SVG;
          brightnessIcon.style.color = '#4ade80';
        } else {
          brightnessIcon.innerHTML = BRIGHTNESS_DOWN_SVG;
          brightnessIcon.style.color = '#f87171';
        }
      }, 500);
    });
  }
  
  const contrastIcon = document.getElementById('contrast-icon');
  const contrastValueSpan = document.getElementById('contrast-value');
  if (contrastIcon) {
    contrastIcon.innerHTML = CONTRAST_NORMAL_SVG;
    contrastIcon.style.display = 'inline-flex';
    contrastIcon.style.alignItems = 'center';
    contrastIcon.style.marginRight = '4px';
    
    let previousContrast = 100;
    
    contrastSlider.addEventListener('input', (e) => {
      const newContrast = parseInt(e.target.value);
      contrast = newContrast;
      applyFiltersAndDraw();
      
      if (contrastValueSpan) contrastValueSpan.textContent = newContrast;
      
      if (newContrast > previousContrast) {
        contrastIcon.innerHTML = CONTRAST_UP_SVG;
        contrastIcon.style.color = '#4ade80';
      } else if (newContrast < previousContrast) {
        contrastIcon.innerHTML = CONTRAST_DOWN_SVG;
        contrastIcon.style.color = '#f87171';
      }
      
      previousContrast = newContrast;
    });
    
    contrastSlider.addEventListener('change', () => {
      setTimeout(() => {
        if (contrast === 100) {
          contrastIcon.innerHTML = CONTRAST_NORMAL_SVG;
          contrastIcon.style.color = 'inherit';
        } else if (contrast > 100) {
          contrastIcon.innerHTML = CONTRAST_UP_SVG;
          contrastIcon.style.color = '#4ade80';
        } else {
          contrastIcon.innerHTML = CONTRAST_DOWN_SVG;
          contrastIcon.style.color = '#f87171';
        }
      }, 500);
    });
  }
  
  const saturateIcon = document.getElementById('saturate-icon');
  const saturateValueSpan = document.getElementById('saturate-value');
  if (saturateIcon) {
    saturateIcon.innerHTML = SATURATE_NORMAL_SVG;
    saturateIcon.style.display = 'inline-flex';
    saturateIcon.style.alignItems = 'center';
    saturateIcon.style.marginRight = '4px';
    
    let previousSaturate = 100;
    
    saturateSlider.addEventListener('input', (e) => {
      const newSaturate = parseInt(e.target.value);
      saturate = newSaturate;
      applyFiltersAndDraw();
      
      if (saturateValueSpan) saturateValueSpan.textContent = newSaturate;
      
      if (newSaturate > previousSaturate) {
        saturateIcon.innerHTML = SATURATE_UP_SVG;
        saturateIcon.style.color = '#4ade80';
      } else if (newSaturate < previousSaturate) {
        saturateIcon.innerHTML = SATURATE_DOWN_SVG;
        saturateIcon.style.color = '#f87171';
      }
      
      previousSaturate = newSaturate;
    });
    
    saturateSlider.addEventListener('change', () => {
      setTimeout(() => {
        if (saturate === 100) {
          saturateIcon.innerHTML = SATURATE_NORMAL_SVG;
          saturateIcon.style.color = 'inherit';
        } else if (saturate > 100) {
          saturateIcon.innerHTML = SATURATE_UP_SVG;
          saturateIcon.style.color = '#4ade80';
        } else {
          saturateIcon.innerHTML = SATURATE_DOWN_SVG;
          saturateIcon.style.color = '#f87171';
        }
      }, 500);
    });
  }
  
  const blurIcon = document.getElementById('blur-icon');
  const blurValueSpan = document.getElementById('blur-value');
  if (blurIcon) {
    blurIcon.innerHTML = BLUR_NORMAL_SVG;
    blurIcon.style.display = 'inline-flex';
    blurIcon.style.alignItems = 'center';
    blurIcon.style.marginRight = '4px';
    
    let previousBlur = 0;
    
    blurSlider.addEventListener('input', (e) => {
      const newBlur = parseFloat(e.target.value);
      blurAmount = newBlur;
      applyFiltersAndDraw();
      
      if (blurValueSpan) blurValueSpan.textContent = newBlur.toFixed(1);
      
      if (newBlur > previousBlur) {
        blurIcon.innerHTML = BLUR_UP_SVG;
        blurIcon.style.color = '#4ade80';
      } else if (newBlur < previousBlur) {
        blurIcon.innerHTML = BLUR_DOWN_SVG;
        blurIcon.style.color = '#f87171';
      }
      
      previousBlur = newBlur;
    });
    
    blurSlider.addEventListener('change', () => {
      setTimeout(() => {
        if (blurAmount === 0) {
          blurIcon.innerHTML = BLUR_NORMAL_SVG;
          blurIcon.style.color = 'inherit';
        } else if (blurAmount > 0) {
          blurIcon.innerHTML = BLUR_UP_SVG;
          blurIcon.style.color = '#4ade80';
        }
      }, 500);
    });
  }
  
  if (flipXBtn) flipXBtn.addEventListener('click', () => { flipX = !flipX; applyFiltersAndDraw(); });
  if (flipYBtn) flipYBtn.addEventListener('click', () => { flipY = !flipY; applyFiltersAndDraw(); });
  
  if (moveLeftBtn) moveLeftBtn.addEventListener('click', () => moveImage(-10, 0));
  if (moveUpBtn) moveUpBtn.addEventListener('click', () => moveImage(0, -10));
  if (moveDownBtn) moveDownBtn.addEventListener('click', () => moveImage(0, 10));
  if (moveRightBtn) moveRightBtn.addEventListener('click', () => moveImage(10, 0));
  
  if (resetBtn) resetBtn.addEventListener('click', resetAll);
  
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        if (e.target.files[0]) loadImage(e.target.files[0]);
      };
      input.click();
    });
  }
  
  if (preserveAnimBtn) {
    preserveAnimBtn.addEventListener('click', () => {
      setPreserveAnimation(true);
    });
  }
  
  if (removeAnimBtn) {
    removeAnimBtn.addEventListener('click', () => {
      setPreserveAnimation(false);
    });
  }
  
  if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (canvas) {
        let finalDataUrl;
        if (isAnimatedImage && preserveAnimation) {
          finalDataUrl = currentImageDataUrl;
          showTransientNotification('Avatar animado guardado. Los efectos visuales no se aplicaron.', 2500);
        } else {
          finalDataUrl = canvas.toDataURL('image/png');
          showTransientNotification('Avatar actualizado', 1500);
        }
        setContactAvatar(finalDataUrl);
        hideModal();
      }
    });
  }
  
  if (drawRectBtn) {
    drawRectBtn.addEventListener('click', () => {
      isDrawingShape = true;
      currentShape = 'rectangle';
      showTransientNotification('Dibuja un rectángulo sobre la imagen para recortar', 2000);
    });
  }
  
  if (drawCircleBtn) {
    drawCircleBtn.addEventListener('click', () => {
      isDrawingShape = true;
      currentShape = 'circle';
      showTransientNotification('Dibuja un círculo sobre la imagen para recortar', 2000);
    });
  }
  
  if (cancelDrawBtn) {
    cancelDrawBtn.addEventListener('click', () => {
      isDrawingShape = false;
      shapeStart = null;
      currentShape = null;
      applyFiltersAndDraw();
      showTransientNotification('Dibujo cancelado', 1500);
    });
  }
  
  const shapeBtns = document.querySelectorAll('.shape-btn');
  if (shapeBtns.length) {
    shapeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        shapeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cropShape = btn.dataset.shape;
        applyFiltersAndDraw();
        showTransientNotification(`Forma cambiada a ${btn.textContent}`, 1500);
      });
    });
  }
  
  if (canvas) {
    canvas.addEventListener('mousedown', startDrawShape);
    canvas.addEventListener('mousemove', drawShape);
    canvas.addEventListener('mouseup', endDrawShape);
    canvas.addEventListener('touchstart', startDrawShape);
    canvas.addEventListener('touchmove', drawShape);
    canvas.addEventListener('touchend', endDrawShape);
  }
  
  updateAnimationButtons();
}

function showModal() {
  if (isModalOpen) return;
  if (!windowElement) {
    windowElement = document.getElementById('avatar-editor-movable-window');
    headerElement = document.getElementById('avatar-editor-modal-header');
    closeBtn = document.getElementById('close-avatar-editor-modal');
    overlay = document.getElementById('avatar-editor-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => hideModal();
    registerModal(windowElement, 'avatar-editor-modal');
    renderModal();
  }
  overlay.classList.add('active');
  windowElement.style.display = 'flex';
  centerModal();
  isModalOpen = true;
  bringModalToFront('avatar-editor-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
}

export function showAvatarEditor() {
  showModal();
}