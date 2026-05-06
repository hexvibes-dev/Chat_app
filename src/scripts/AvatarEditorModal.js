import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';
import { setContactAvatar } from './contactStatus.js';

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
let cropMode = false;
let cropStart = null;
let cropRect = { x: 0, y: 0, w: 0, h: 0 };
let imageX = 0, imageY = 0;

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

function addResizeHandles(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-avatar-modal resize-${dir}`;
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

function setupInteract() {
  interact(windowElement).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 500, height: 550 },
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
        windowX += event.dx;
        windowY += event.dy;
        windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        windowElement.setAttribute('data-x', windowX);
        windowElement.setAttribute('data-y', windowY);
        constrainAllModals();
      },
      end() {
        window.isDraggingModal = false;
        if (isLessThan10PercentVisible(windowElement)) hideModal();
        constrainAllModals();
      }
    }
  });
}

function applyFiltersAndDraw() {
  if (!ctx || !originalImage) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2 + imageX, canvas.height / 2 + imageY);
  ctx.scale(zoom * (flipX ? -1 : 1), zoom * (flipY ? -1 : 1));
  ctx.rotate(rotation * Math.PI / 180);
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blurAmount}px)`;
  ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
  ctx.restore();
  if (cropMode && cropRect.w > 0 && cropRect.h > 0) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
  }
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

function startCrop(e) {
  if (!cropMode) return;
  e.preventDefault();
  const pos = getCanvasCoords(e);
  cropStart = { x: pos.x, y: pos.y };
  cropRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
}

function drawCrop(e) {
  if (!cropMode || !cropStart) return;
  e.preventDefault();
  const pos = getCanvasCoords(e);
  cropRect.w = pos.x - cropStart.x;
  cropRect.h = pos.y - cropStart.y;
  applyFiltersAndDraw();
}

function endCrop(e) {
  if (!cropMode || !cropStart) return;
  e.preventDefault();
  if (cropRect.w < 0) {
    cropRect.x = cropStart.x + cropRect.w;
    cropRect.w = -cropRect.w;
  }
  if (cropRect.h < 0) {
    cropRect.y = cropStart.y + cropRect.h;
    cropRect.h = -cropRect.h;
  }
  cropStart = null;
  applyFiltersAndDraw();
}

function performCrop() {
  if (!originalImage || cropRect.w <= 0 || cropRect.h <= 0) return;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = cropRect.w;
  tempCanvas.height = cropRect.h;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
  const croppedDataUrl = tempCanvas.toDataURL('image/png');
  originalImage = new Image();
  originalImage.onload = () => {
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
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
    cropMode = false;
    cropRect = { x: 0, y: 0, w: 0, h: 0 };
    applyFiltersAndDraw();
    showTransientNotification('Recorte aplicado');
  };
  originalImage.src = croppedDataUrl;
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
  cropMode = false;
  cropRect = { x: 0, y: 0, w: 0, h: 0 };
  if (originalImage) {
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    applyFiltersAndDraw();
  }
}

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      canvas.width = img.width;
      canvas.height = img.height;
      resetAll();
    };
    img.src = ev.target.result;
    currentImageDataUrl = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function renderModal() {
  const container = document.getElementById('avatar-editor-inner-content');
  if (!container) return;
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">
      <div class="avatar-canvas-container" style="display: flex; justify-content: center; background: #1e1e1e; border-radius: 12px; padding: 12px;">
        <canvas id="avatar-editor-canvas" style="max-width: 100%; max-height: 300px; border-radius: 12px;"></canvas>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
        <button id="avatar-upload-btn" class="btn">📁 Subir imagen</button>
        <button id="avatar-crop-btn" class="btn ${cropMode ? 'active' : ''}">✂️ Recortar</button>
        <button id="avatar-apply-crop-btn" class="btn">✅ Aplicar recorte</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
        <div><label>Rotación</label><input type="range" id="avatar-rotation" min="-180" max="180" value="0"></div>
        <div><label>Zoom</label><input type="range" id="avatar-zoom" min="0.5" max="3" step="0.01" value="1"></div>
        <div><label>Brillo</label><input type="range" id="avatar-brightness" min="0" max="200" value="100"></div>
        <div><label>Contraste</label><input type="range" id="avatar-contrast" min="0" max="200" value="100"></div>
        <div><label>Saturación</label><input type="range" id="avatar-saturate" min="0" max="200" value="100"></div>
        <div><label>Desenfoque</label><input type="range" id="avatar-blur" min="0" max="10" step="0.1" value="0"></div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: center;">
        <button id="avatar-flip-x" class="btn">⇄ Voltear H</button>
        <button id="avatar-flip-y" class="btn">⇅ Voltear V</button>
        <button id="avatar-reset" class="btn">⟳ Resetear</button>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px;">
        <button id="avatar-cancel" class="btn-cancel">Cancelar</button>
        <button id="avatar-save" class="btn primary">Guardar avatar</button>
      </div>
    </div>
  `;

  canvas = document.getElementById('avatar-editor-canvas');
  ctx = canvas.getContext('2d');

  document.getElementById('avatar-upload-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target.files[0]) loadImage(e.target.files[0]);
    };
    input.click();
  });

  document.getElementById('avatar-crop-btn').addEventListener('click', () => {
    cropMode = !cropMode;
    if (!cropMode) cropRect = { x: 0, y: 0, w: 0, h: 0 };
    applyFiltersAndDraw();
  });

  document.getElementById('avatar-apply-crop-btn').addEventListener('click', performCrop);

  const rotationSlider = document.getElementById('avatar-rotation');
  rotationSlider.addEventListener('input', (e) => { rotation = parseInt(e.target.value); applyFiltersAndDraw(); });
  const zoomSlider = document.getElementById('avatar-zoom');
  zoomSlider.addEventListener('input', (e) => { zoom = parseFloat(e.target.value); applyFiltersAndDraw(); });
  const brightnessSlider = document.getElementById('avatar-brightness');
  brightnessSlider.addEventListener('input', (e) => { brightness = parseInt(e.target.value); applyFiltersAndDraw(); });
  const contrastSlider = document.getElementById('avatar-contrast');
  contrastSlider.addEventListener('input', (e) => { contrast = parseInt(e.target.value); applyFiltersAndDraw(); });
  const saturateSlider = document.getElementById('avatar-saturate');
  saturateSlider.addEventListener('input', (e) => { saturate = parseInt(e.target.value); applyFiltersAndDraw(); });
  const blurSlider = document.getElementById('avatar-blur');
  blurSlider.addEventListener('input', (e) => { blurAmount = parseFloat(e.target.value); applyFiltersAndDraw(); });

  document.getElementById('avatar-flip-x').addEventListener('click', () => { flipX = !flipX; applyFiltersAndDraw(); });
  document.getElementById('avatar-flip-y').addEventListener('click', () => { flipY = !flipY; applyFiltersAndDraw(); });
  document.getElementById('avatar-reset').addEventListener('click', resetAll);

  document.getElementById('avatar-cancel').addEventListener('click', hideModal);
  document.getElementById('avatar-save').addEventListener('click', () => {
    if (canvas) {
      const finalDataUrl = canvas.toDataURL('image/png');
      setContactAvatar(finalDataUrl);
      showTransientNotification('Avatar actualizado');
      hideModal();
    }
  });

  if (canvas) {
    canvas.addEventListener('mousedown', startCrop);
    canvas.addEventListener('mousemove', drawCrop);
    canvas.addEventListener('mouseup', endCrop);
    canvas.addEventListener('touchstart', startCrop);
    canvas.addEventListener('touchmove', drawCrop);
    canvas.addEventListener('touchend', endCrop);
  }
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
    addResizeHandles(windowElement);
    setupInteract();
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