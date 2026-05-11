// src/scripts/AvatarEditorModal.js
import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';
import { setContactAvatar } from './contactStatus.js';
import { showNotification } from './notifications.js';

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

function showTransientNotification(text, duration = 2000) {
  showNotification(text, duration);
}

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-avatar-modal.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-avatar-modal resize-${dir}`;
      element.appendChild(handle);
    }
  });
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
      <div style="position: relative; width: 100%; height: 100%;">
        <img src="${currentImageDataUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">
        <span style="position: absolute; top: 4px; right: 4px; background: #14b8a6; color: white; font-size: 10px; padding: 2px 6px; border-radius: 20px;">🎬 Animado</span>
      </div>
      <div style="position: absolute; bottom: 4px; left: 4px; right: 4px; background: rgba(0,0,0,0.7); color: #ffaa33; font-size: 9px; padding: 2px 4px; border-radius: 4px; text-align: center;">
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
        <div class="avatar-canvas-container" style="display: flex; justify-content: center; background: #1e1e1e; border-radius: 12px; padding: 12px;">
          <canvas id="avatar-editor-canvas" style="max-width: 100%; max-height: 350px; border-radius: 12px;"></canvas>
        </div>
        <div id="avatar-animated-preview" style="position: absolute; top: 16px; right: 16px; width: 80px; height: 80px; background: rgba(0,0,0,0.6); border-radius: 12px; overflow: hidden; display: none; border: 2px solid #14b8a6;"></div>
      </div>
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
        <button id="avatar-upload-btn" class="btn">📁 Subir imagen</button>
        <button id="avatar-reset" class="btn">⟳ Resetear todo</button>
      </div>
      
      <div id="avatar-animation-controls" style="display: none; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button id="avatar-preserve-animation" class="btn" style="background: #14b8a6; border-color: #14b8a6;">🎬 Preservar animación</button>
        <button id="avatar-remove-animation" class="btn" style="background: #3a3a4a;">❌ Eliminar animación</button>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
        <div><label>🔄 Rotación</label><input type="range" id="avatar-rotation" min="-180" max="180" value="0" step="1"></div>
        <div><label>🔍 Zoom</label><input type="range" id="avatar-zoom" min="0.5" max="3" step="0.01" value="1"></div>
        <div><label>☀️ Brillo</label><input type="range" id="avatar-brightness" min="0" max="200" value="100"></div>
        <div><label>🌓 Contraste</label><input type="range" id="avatar-contrast" min="0" max="200" value="100"></div>
        <div><label>🎨 Saturación</label><input type="range" id="avatar-saturate" min="0" max="200" value="100"></div>
        <div><label>🌀 Desenfoque</label><input type="range" id="avatar-blur" min="0" max="10" step="0.1" value="0"></div>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button id="avatar-flip-x" class="btn">⇄ Voltear H</button>
        <button id="avatar-flip-y" class="btn">⇅ Voltear V</button>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button id="avatar-move-left" class="btn">←</button>
        <button id="avatar-move-up" class="btn">↑</button>
        <button id="avatar-move-down" class="btn">↓</button>
        <button id="avatar-move-right" class="btn">→</button>
      </div>
      
      <div style="border-top: 1px solid #3a3a4a; margin: 8px 0;"></div>
      
      <div>
        <label style="display: block; margin-bottom: 8px;">✂️ Forma de recorte:</label>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="shape-btn ${cropShape === 'circle' ? 'active' : ''}" data-shape="circle">⚪ Círculo</button>
          <button class="shape-btn ${cropShape === 'square' ? 'active' : ''}" data-shape="square">⬜ Cuadrado</button>
          <button class="shape-btn ${cropShape === 'triangle' ? 'active' : ''}" data-shape="triangle">🔺 Triángulo</button>
          <button class="shape-btn ${cropShape === 'heart' ? 'active' : ''}" data-shape="heart">❤️ Corazón</button>
          <button class="shape-btn ${cropShape === 'star' ? 'active' : ''}" data-shape="star">⭐ Estrella</button>
          <button class="shape-btn ${cropShape === 'hexagon' ? 'active' : ''}" data-shape="hexagon">⬡ Hexágono</button>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 8px;">
        <button id="avatar-draw-rectangle" class="btn">⬛ Dibujar rectángulo</button>
        <button id="avatar-draw-circle" class="btn">● Dibujar círculo</button>
        <button id="avatar-cancel-draw" class="btn">❌ Cancelar dibujo</button>
      </div>
      
      <div style="border-top: 1px solid #3a3a4a; margin: 8px 0;"></div>
      
      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
        <button id="avatar-cancel" class="btn-cancel">Cancelar</button>
        <button id="avatar-save" class="btn primary">💾 Guardar avatar</button>
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
  
  if (rotationSlider) rotationSlider.addEventListener('input', (e) => { rotation = parseInt(e.target.value); applyFiltersAndDraw(); });
  if (zoomSlider) zoomSlider.addEventListener('input', (e) => { zoom = parseFloat(e.target.value); applyFiltersAndDraw(); });
  if (brightnessSlider) brightnessSlider.addEventListener('input', (e) => { brightness = parseInt(e.target.value); applyFiltersAndDraw(); });
  if (contrastSlider) contrastSlider.addEventListener('input', (e) => { contrast = parseInt(e.target.value); applyFiltersAndDraw(); });
  if (saturateSlider) saturateSlider.addEventListener('input', (e) => { saturate = parseInt(e.target.value); applyFiltersAndDraw(); });
  if (blurSlider) blurSlider.addEventListener('input', (e) => { blurAmount = parseFloat(e.target.value); applyFiltersAndDraw(); });
  
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
          showTransientNotification('Avatar guardado con efectos aplicados', 1500);
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