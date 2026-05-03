import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals, unregisterModal } from './modalStackManager.js';
import { showGlobalColorPicker } from './editor/GlobalColorPicker.js';
import { appendMessage } from './messages.js';
import { getCategories, addCustomSticker, canAddStickerToCategory, refreshStickersInPicker } from './StickerManager.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;

let backgroundCanvas = null;
let backgroundCtx = null;
let drawingCanvas = null;
let drawingCtx = null;

let drawing = false;
let currentTool = 'brush';
let currentBrushType = 'round';
let currentShape = null;
let drawColor = '#000000';
let bgSolidColor = '#000000';
let currentSize = 4;
let currentOpacity = 100;
let backgroundColor = 'transparent';
let backgroundImage = null;
let backgroundRotation = 0;
let backgroundScaleX = 1;
let backgroundScaleY = 1;
let backgroundZoom = 1;
let backgroundPosX = 0;
let backgroundPosY = 0;

let history = [];
let historyIndex = -1;
let shapeStart = null;
let lastPoint = null;
let canvasZoom = 1;
let currentLayout = 'classic';
let sidebarOriginal = null;
let sidebarParent = null;
let floatingSidebarActive = false;
let savedStateBeforeShape = null;

let tempTextData = null;
let textTransformControls = null;

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

async function showConfirmModal(message) {
  return new Promise((resolve) => {
    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'modal-blur-overlay';
    overlayDiv.style.zIndex = '30000';
    document.body.appendChild(overlayDiv);
    setTimeout(() => overlayDiv.classList.add('visible'), 10);
    
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.innerHTML = `
      <div class="confirm-header">
        <span>Confirmar</span>
        <span style="cursor:pointer;" id="confirm-close">✕</span>
      </div>
      <div class="confirm-content">
        <p>${message}</p>
        <div class="confirm-actions">
          <button id="confirm-yes">Sí</button>
          <button id="confirm-no">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const cleanup = (result) => {
      modal.remove();
      overlayDiv.classList.remove('visible');
      setTimeout(() => overlayDiv.remove(), 200);
      resolve(result);
    };
    modal.querySelector('#confirm-yes').onclick = () => cleanup(true);
    modal.querySelector('#confirm-no').onclick = () => cleanup(false);
    modal.querySelector('#confirm-close').onclick = () => cleanup(false);
  });
}

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-paint resize-${dir}`;
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
  if (!windowElement || !headerElement) return;

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

let activeLayoutDropdown = null;
function showLayoutDropdown(anchorBtn) {
  if (activeLayoutDropdown) {
    activeLayoutDropdown.remove();
    activeLayoutDropdown = null;
    return;
  }
  const rect = anchorBtn.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'layout-dropdown-menu';
  dropdown.style.position = 'fixed';
  dropdown.style.left = `${rect.left + rect.width / 2}px`;
  dropdown.style.top = `${rect.bottom + 5}px`;
  dropdown.style.transform = 'translateX(-50%)';
  dropdown.innerHTML = `
    <button class="layout-option" data-layout="classic">📐 Clásico</button>
    <button class="layout-option" data-layout="right-sidebar">➡️ Lateral derecho</button>
    <button class="layout-option" data-layout="floating">🪟 Herramientas flotantes</button>
    <button class="layout-option" data-layout="tools-only">🔧 Solo herramientas</button>
    <button class="layout-option" data-layout="mini">📱 Mini</button>
  `;
  document.body.appendChild(dropdown);
  activeLayoutDropdown = dropdown;
  const closeHandler = (e) => {
    const targetNode = e.target;
    if (targetNode && !dropdown.contains(targetNode) && targetNode !== anchorBtn) {
      dropdown.remove();
      activeLayoutDropdown = null;
      document.removeEventListener('click', closeHandler);
      document.removeEventListener('touchstart', closeHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
    document.addEventListener('touchstart', closeHandler);
  }, 0);
  dropdown.querySelectorAll('.layout-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const layout = opt.dataset.layout;
      currentLayout = layout;
      windowElement.classList.remove('layout-classic', 'layout-right-sidebar', 'layout-floating', 'layout-tools-only', 'layout-mini');
      windowElement.classList.add(`layout-${layout}`);
      dropdown.remove();
      activeLayoutDropdown = null;
      const layoutSelectorBtn = document.getElementById('layout-selector-btn');
      if (layoutSelectorBtn) {
        let iconSvg = '';
        switch (layout) {
          case 'classic': iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'; break;
          case 'right-sidebar': iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>'; break;
          case 'floating': iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/></svg>'; break;
          case 'tools-only': iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/></svg>'; break;
          case 'mini': iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>'; break;
        }
        layoutSelectorBtn.innerHTML = iconSvg;
      }
      toggleFloatingSidebar(layout === 'floating');
      showTransientNotification(`Diseño: ${opt.innerText}`);
    });
  });
}

let activeTextDropdown = null;
let selectedTextColor = '#ffffff';

function showTextDropdown(anchorBtn) {
  if (activeTextDropdown) {
    activeTextDropdown.remove();
    activeTextDropdown = null;
    return;
  }
  const rect = anchorBtn.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'text-dropdown';
  dropdown.style.position = 'fixed';
  dropdown.style.right = `${window.innerWidth - rect.right}px`;
  dropdown.style.top = `${rect.bottom + 5}px`;
  dropdown.style.transform = 'none';
  dropdown.innerHTML = `
    <textarea id="text-dropdown-input" rows="2" placeholder="Escribe tu texto...">Texto</textarea>
    <div style="display: flex; gap: 8px; align-items: center;">
      <select id="text-dropdown-font">
        <option value="system-ui">Sistema</option>
        <option value="Arial">Arial</option>
        <option value="Impact">Impact</option>
        <option value="Comic Sans MS">Comic Sans</option>
        <option value="Courier New">Courier New</option>
      </select>
      <div id="text-dropdown-color" class="color-preview" style="background: ${selectedTextColor};"></div>
    </div>
    <button id="text-dropdown-insert" class="insert-btn">Insertar</button>
  `;
  document.body.appendChild(dropdown);
  activeTextDropdown = dropdown;
  
  const closeHandler = (e) => {
    const targetNode = e.target;
    if (targetNode && !dropdown.contains(targetNode) && targetNode !== anchorBtn) {
      dropdown.remove();
      activeTextDropdown = null;
      document.removeEventListener('click', closeHandler);
      document.removeEventListener('touchstart', closeHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
    document.addEventListener('touchstart', closeHandler);
  }, 0);
  
  const colorPreview = dropdown.querySelector('#text-dropdown-color');
  colorPreview.addEventListener('click', () => {
    showGlobalColorPicker((color) => {
      selectedTextColor = color;
      colorPreview.style.backgroundColor = color;
    });
  });
  
  dropdown.querySelector('#text-dropdown-insert').addEventListener('click', () => {
    const text = dropdown.querySelector('#text-dropdown-input').value;
    if (!text.trim()) {
      showTransientNotification('El texto no puede estar vacío');
      return;
    }
    const fontFamily = dropdown.querySelector('#text-dropdown-font').value;
    const color = selectedTextColor;
    const centerX = drawingCanvas.width / 2;
    const centerY = drawingCanvas.height / 2;
    const textData = {
      text: text,
      x: centerX,
      y: centerY,
      fontSize: 32,
      rotation: 0,
      fontFamily: fontFamily,
      color: color
    };
    showTextTransformControls(textData);
    dropdown.remove();
    activeTextDropdown = null;
  });
}

function initTextTransformControls() {
  const sidebar = document.getElementById('paint-sidebar');
  if (!sidebar) return;
  
  const referenceNode = sidebar.querySelector('hr');
  if (!document.getElementById('text-transform-controls')) {
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'text-transform-controls';
    controlsDiv.innerHTML = `
      <div class="text-transform-group">
        <button data-action="left">←</button>
        <button data-action="up">↑</button>
        <button data-action="down">↓</button>
        <button data-action="right">→</button>
        <button data-action="rotate-left">↺</button>
        <button data-action="rotate-right">↻</button>
        <button data-action="zoom-out">-</button>
        <button data-action="zoom-in">+</button>
      </div>
      <div class="text-actions-group">
        <button id="text-accept-btn">✓ Aceptar</button>
        <button id="text-cancel-btn">✕ Cancelar</button>
      </div>
    `;
    if (referenceNode) {
      sidebar.insertBefore(controlsDiv, referenceNode);
    } else {
      sidebar.appendChild(controlsDiv);
    }
    textTransformControls = controlsDiv;
    
    controlsDiv.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!tempTextData) return;
        const action = btn.dataset.action;
        const step = 5;
        const angleStep = 10;
        const zoomStep = 4;
        switch(action) {
          case 'left': tempTextData.x -= step; break;
          case 'right': tempTextData.x += step; break;
          case 'up': tempTextData.y -= step; break;
          case 'down': tempTextData.y += step; break;
          case 'rotate-left': tempTextData.rotation -= angleStep; break;
          case 'rotate-right': tempTextData.rotation += angleStep; break;
          case 'zoom-out': tempTextData.fontSize = Math.max(12, tempTextData.fontSize - zoomStep); break;
          case 'zoom-in': tempTextData.fontSize = Math.min(120, tempTextData.fontSize + zoomStep); break;
        }
        drawTempText();
      });
    });
    
    controlsDiv.querySelector('#text-accept-btn').addEventListener('click', () => {
      if (!tempTextData) return;
      drawingCtx.putImageData(tempTextData.savedState, 0, 0);
      drawingCtx.save();
      drawingCtx.translate(tempTextData.x, tempTextData.y);
      drawingCtx.rotate(tempTextData.rotation * Math.PI / 180);
      drawingCtx.font = `${tempTextData.fontSize}px ${tempTextData.fontFamily}, system-ui, sans-serif`;
      drawingCtx.fillStyle = tempTextData.color;
      drawingCtx.textAlign = 'center';
      drawingCtx.textBaseline = 'middle';
      drawingCtx.fillText(tempTextData.text, 0, 0);
      drawingCtx.restore();
      saveDrawingState();
      hideTextTransformControls();
    });
    
    controlsDiv.querySelector('#text-cancel-btn').addEventListener('click', () => {
      if (!tempTextData) return;
      drawingCtx.putImageData(tempTextData.savedState, 0, 0);
      hideTextTransformControls();
    });
  } else {
    textTransformControls = document.getElementById('text-transform-controls');
  }
}

function showTextTransformControls(textData) {
  initTextTransformControls();
  const savedState = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
  tempTextData = { ...textData, savedState };
  drawTempText();
  textTransformControls.classList.add('visible');
}

function hideTextTransformControls() {
  if (textTransformControls) textTransformControls.classList.remove('visible');
  tempTextData = null;
}

function drawTempText() {
  if (!tempTextData) return;
  drawingCtx.putImageData(tempTextData.savedState, 0, 0);
  drawingCtx.save();
  drawingCtx.translate(tempTextData.x, tempTextData.y);
  drawingCtx.rotate(tempTextData.rotation * Math.PI / 180);
  drawingCtx.font = `${tempTextData.fontSize}px ${tempTextData.fontFamily}, system-ui, sans-serif`;
  drawingCtx.fillStyle = tempTextData.color;
  drawingCtx.textAlign = 'center';
  drawingCtx.textBaseline = 'middle';
  drawingCtx.fillText(tempTextData.text, 0, 0);
  drawingCtx.restore();
}

function saveDrawingState() {
  const imageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
  history = history.slice(0, historyIndex + 1);
  history.push(imageData);
  historyIndex++;
  if (history.length > 50) {
    history.shift();
    historyIndex--;
  }
  updateUndoRedoButtons();
}

function restoreDrawingState(index) {
  if (index < 0 || index >= history.length) return;
  const imageData = history[index];
  drawingCtx.putImageData(imageData, 0, 0);
  historyIndex = index;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('paint-undo');
  const redoBtn = document.getElementById('paint-redo');
  if (undoBtn) undoBtn.disabled = (historyIndex <= 0);
  if (redoBtn) redoBtn.disabled = (historyIndex >= history.length - 1);
}

function drawBackground() {
  backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
  if (backgroundColor === 'color') {
    backgroundCtx.fillStyle = bgSolidColor;
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
  } else if (backgroundColor === 'image' && backgroundImage) {
    backgroundCtx.save();
    backgroundCtx.translate(backgroundCanvas.width / 2 + backgroundPosX, backgroundCanvas.height / 2 + backgroundPosY);
    backgroundCtx.scale(backgroundZoom * backgroundScaleX, backgroundZoom * backgroundScaleY);
    backgroundCtx.rotate(backgroundRotation * Math.PI / 180);
    backgroundCtx.drawImage(backgroundImage, -backgroundImage.width / 2, -backgroundImage.height / 2);
    backgroundCtx.restore();
  }
}

function applyBackground() { drawBackground(); }

function setBackgroundSolidColor() {
  showGlobalColorPicker((color) => {
    bgSolidColor = color;
    backgroundColor = 'color';
    applyBackground();
    document.getElementById('paint-bg-preview').style.background = color;
    document.getElementById('bg-image-controls').style.display = 'none';
  });
}

function setBackgroundImageFromGallery() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        backgroundImage = img;
        backgroundColor = 'image';
        backgroundRotation = 0;
        backgroundScaleX = 1;
        backgroundScaleY = 1;
        backgroundZoom = 1;
        backgroundPosX = 0;
        backgroundPosY = 0;
        applyBackground();
        document.getElementById('paint-bg-preview').style.backgroundImage = `url(${ev.target.result})`;
        document.getElementById('paint-bg-preview').style.backgroundSize = 'cover';
        document.getElementById('bg-image-controls').style.display = 'block';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  fileInput.click();
}

function setBackgroundTransparent() {
  backgroundColor = 'transparent';
  applyBackground();
  document.getElementById('paint-bg-preview').style.background = 'repeating-linear-gradient(45deg, #ccc 0px, #ccc 10px, #999 10px, #999 20px)';
  document.getElementById('bg-image-controls').style.display = 'none';
}

function transformBackground(deltaZoom = 0, deltaRot = 0, flipH = false, flipV = false, deltaX = 0, deltaY = 0) {
  if (backgroundColor !== 'image' || !backgroundImage) return;
  if (deltaZoom !== 0) backgroundZoom = Math.min(Math.max(backgroundZoom + deltaZoom, 0.5), 5);
  if (deltaRot !== 0) backgroundRotation = (backgroundRotation + deltaRot) % 360;
  if (flipH) backgroundScaleX *= -1;
  if (flipV) backgroundScaleY *= -1;
  if (deltaX !== 0) backgroundPosX += deltaX;
  if (deltaY !== 0) backgroundPosY += deltaY;
  applyBackground();
}

function resetBackgroundTransform() {
  if (backgroundColor !== 'image' || !backgroundImage) return;
  backgroundZoom = 1;
  backgroundRotation = 0;
  backgroundScaleX = 1;
  backgroundScaleY = 1;
  backgroundPosX = 0;
  backgroundPosY = 0;
  applyBackground();
}

function drawStroke(x, y, lastX, lastY, size, color, opacity, brushType) {
  if (!drawingCtx) return;
  drawingCtx.save();
  drawingCtx.globalCompositeOperation = 'source-over';
  drawingCtx.beginPath();
  drawingCtx.lineCap = brushType === 'round' ? 'round' : 'square';
  drawingCtx.lineJoin = 'round';
  drawingCtx.lineWidth = size;
  const rgba = `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, ${opacity/100})`;
  drawingCtx.strokeStyle = rgba;
  if (brushType === 'dashed') drawingCtx.setLineDash([size * 2, size]);
  else drawingCtx.setLineDash([]);
  if (lastX && lastY) {
    drawingCtx.moveTo(lastX, lastY);
    drawingCtx.lineTo(x, y);
    drawingCtx.stroke();
  } else {
    drawingCtx.fillStyle = rgba;
    drawingCtx.fillRect(x - size/2, y - size/2, size, size);
  }
  drawingCtx.restore();
}

function drawShapeOnCanvas(shapeType, start, end, color, opacity, size) {
  if (!drawingCtx) return;
  drawingCtx.save();
  drawingCtx.globalCompositeOperation = 'source-over';
  drawingCtx.beginPath();
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const rgba = `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, ${opacity/100})`;
  
  if (shapeType === 'line') {
    drawingCtx.moveTo(start.x, start.y);
    drawingCtx.lineTo(end.x, end.y);
    drawingCtx.strokeStyle = rgba;
    drawingCtx.lineWidth = size;
    drawingCtx.stroke();
  } else {
    if (shapeType === 'circle') {
      const radiusX = width / 2;
      const radiusY = height / 2;
      drawingCtx.ellipse(x + radiusX, y + radiusY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    } else if (shapeType === 'square') {
      const side = Math.min(width, height);
      drawingCtx.rect(x, y, side, side);
    } else if (shapeType === 'rectangle') {
      drawingCtx.rect(x, y, width, height);
    } else if (shapeType === 'triangle') {
      drawingCtx.moveTo(x + width/2, y);
      drawingCtx.lineTo(x + width, y + height);
      drawingCtx.lineTo(x, y + height);
      drawingCtx.closePath();
    }
    drawingCtx.strokeStyle = rgba;
    drawingCtx.lineWidth = size;
    drawingCtx.stroke();
  }
  drawingCtx.restore();
}

function getCanvasCoords(e, targetCanvas) {
  const rect = targetCanvas.getBoundingClientRect();
  const scaleX = targetCanvas.width / rect.width;
  const scaleY = targetCanvas.height / rect.height;
  let clientX, clientY;
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  let x = (clientX - rect.left) * scaleX;
  let y = (clientY - rect.top) * scaleY;
  x = Math.min(Math.max(0, x), targetCanvas.width);
  y = Math.min(Math.max(0, y), targetCanvas.height);
  return { x, y };
}

function startDrawing(e) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  const pos = getCanvasCoords(e, drawingCanvas);
  if (currentShape) {
    savedStateBeforeShape = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
    shapeStart = pos;
    drawing = true;
  } else if (currentTool === 'brush') {
    drawing = true;
    lastPoint = pos;
    drawStroke(pos.x, pos.y, null, null, currentSize, drawColor, currentOpacity, currentBrushType);
  } else if (currentTool === 'eraser') {
    drawing = true;
    lastPoint = pos;
    drawingCtx.save();
    drawingCtx.globalCompositeOperation = 'destination-out';
    drawingCtx.fillStyle = 'rgba(0,0,0,1)';
    drawingCtx.fillRect(pos.x - currentSize/2, pos.y - currentSize/2, currentSize, currentSize);
    drawingCtx.restore();
  }
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const pos = getCanvasCoords(e, drawingCanvas);
  if (currentShape && shapeStart && savedStateBeforeShape) {
    drawingCtx.putImageData(savedStateBeforeShape, 0, 0);
    drawShapeOnCanvas(currentShape, shapeStart, pos, drawColor, currentOpacity, currentSize);
  } else if (currentTool === 'brush' && lastPoint) {
    drawStroke(pos.x, pos.y, lastPoint.x, lastPoint.y, currentSize, drawColor, currentOpacity, currentBrushType);
    lastPoint = pos;
  } else if (currentTool === 'eraser' && lastPoint) {
    drawingCtx.save();
    drawingCtx.globalCompositeOperation = 'destination-out';
    drawingCtx.beginPath();
    drawingCtx.lineCap = 'round';
    drawingCtx.lineWidth = currentSize;
    drawingCtx.moveTo(lastPoint.x, lastPoint.y);
    drawingCtx.lineTo(pos.x, pos.y);
    drawingCtx.stroke();
    drawingCtx.restore();
    lastPoint = pos;
  }
}

function endDrawing(e) {
  if (!drawing) return;
  e.preventDefault();
  if (currentShape && shapeStart) {
    const pos = getCanvasCoords(e, drawingCanvas);
    if (savedStateBeforeShape) drawingCtx.putImageData(savedStateBeforeShape, 0, 0);
    drawShapeOnCanvas(currentShape, shapeStart, pos, drawColor, currentOpacity, currentSize);
    shapeStart = null;
    savedStateBeforeShape = null;
    saveDrawingState();
  } else if (currentTool === 'brush' || currentTool === 'eraser') {
    saveDrawingState();
  }
  drawing = false;
  lastPoint = null;
}

function bindCanvasEvents() {
  drawingCanvas.addEventListener('pointerdown', startDrawing);
  drawingCanvas.addEventListener('pointermove', draw);
  drawingCanvas.addEventListener('pointerup', endDrawing);
  drawingCanvas.addEventListener('touchstart', startDrawing);
  drawingCanvas.addEventListener('touchmove', draw);
  drawingCanvas.addEventListener('touchend', endDrawing);
}

function setCanvasZoom(zoom) {
  canvasZoom = Math.min(Math.max(zoom, 0.5), 4);
  const wrapper = document.querySelector('.canvas-zoom-wrapper');
  if (wrapper) {
    wrapper.style.transform = `scale(${canvasZoom})`;
    wrapper.style.transformOrigin = 'center center';
  }
}

function toggleFloatingSidebar(enable) {
  if (!sidebarOriginal) sidebarOriginal = document.getElementById('paint-sidebar');
  if (!sidebarOriginal) return;

  if (enable && !floatingSidebarActive) {
    sidebarParent = sidebarOriginal.parentNode;
    document.body.appendChild(sidebarOriginal);
    sidebarOriginal.classList.add('floating-sidebar');
    sidebarOriginal.style.position = 'fixed';
    sidebarOriginal.style.left = '100px';
    sidebarOriginal.style.top = '100px';
    sidebarOriginal.style.width = '200px';
    sidebarOriginal.style.height = 'auto';
    sidebarOriginal.style.zIndex = '12000';
    sidebarOriginal.style.display = 'flex';
    sidebarOriginal.style.overflowY = 'auto';
    sidebarOriginal.style.transition = 'none';
    
    if (!sidebarOriginal.querySelector('.floating-sidebar-header')) {
      const headerDiv = document.createElement('div');
      headerDiv.className = 'floating-sidebar-header';
      headerDiv.innerHTML = '<span>🛠️ Herramientas</span><button class="close-floating-btn">✕</button>';
      sidebarOriginal.insertBefore(headerDiv, sidebarOriginal.firstChild);
      const closeBtnFloat = sidebarOriginal.querySelector('.close-floating-btn');
      if (closeBtnFloat) closeBtnFloat.addEventListener('click', () => {
        toggleFloatingSidebar(false);
        const classicBtn = document.querySelector('.layout-option[data-layout="classic"]');
        if (classicBtn) classicBtn.click();
      });
    }
    
    if (sidebarOriginal._interact) sidebarOriginal._interact.unset();
    sidebarOriginal._interact = interact(sidebarOriginal).resizable({
      edges: { top: true, bottom: true },
      inertia: false,
      modifiers: [ interact.modifiers.restrictSize({ min: { height: 150 }, max: { height: window.innerHeight * 0.8 } }) ],
      listeners: {
        move(event) {
          let newHeight = event.rect.height;
          let deltaTop = event.deltaRect.top;
          if (newHeight < 150) newHeight = 150;
          sidebarOriginal.style.height = `${newHeight}px`;
          if (deltaTop !== 0) {
            let currentTop = parseFloat(sidebarOriginal.style.top) || 100;
            sidebarOriginal.style.top = `${currentTop + deltaTop}px`;
          }
        }
      }
    }).draggable({
      inertia: false,
      manualStart: false,
      allowFrom: '.floating-sidebar-header',
      preventDefault: 'always',
      modifiers: [ interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true }) ],
      listeners: {
        start() { sidebarOriginal.style.cursor = 'grabbing'; },
        move(event) {
          let left = parseFloat(sidebarOriginal.style.left) || 100;
          let top = parseFloat(sidebarOriginal.style.top) || 100;
          left += event.dx;
          top += event.dy;
          sidebarOriginal.style.left = `${left}px`;
          sidebarOriginal.style.top = `${top}px`;
        },
        end() { sidebarOriginal.style.cursor = 'grab'; }
      }
    });
    floatingSidebarActive = true;
    registerModal(sidebarOriginal, 'floating-sidebar');
  } else if (!enable && floatingSidebarActive) {
    if (sidebarParent) {
      sidebarParent.appendChild(sidebarOriginal);
    } else {
      const mainArea = document.querySelector('.paint-main-area');
      if (mainArea) mainArea.insertBefore(sidebarOriginal, mainArea.firstChild);
    }
    sidebarOriginal.classList.remove('floating-sidebar');
    sidebarOriginal.style.position = '';
    sidebarOriginal.style.left = '';
    sidebarOriginal.style.top = '';
    sidebarOriginal.style.width = '';
    sidebarOriginal.style.height = '';
    sidebarOriginal.style.overflowY = '';
    sidebarOriginal.style.transition = '';
    const fakeHeader = sidebarOriginal.querySelector('.floating-sidebar-header');
    if (fakeHeader) fakeHeader.remove();
    if (sidebarOriginal._interact) sidebarOriginal._interact.unset();
    floatingSidebarActive = false;
    unregisterModal('floating-sidebar');
  }
}

function initTools() {
  const mainToolBtn = document.getElementById('paint-main-tool');
  const toolDropdown = document.getElementById('tool-dropdown');
  const eraserBtn = document.getElementById('paint-eraser');
  const sizeSlider = document.getElementById('paint-size');
  const colorPickerBtn = document.getElementById('paint-color-picker');
  const opacitySlider = document.getElementById('paint-opacity');
  const undoBtn = document.getElementById('paint-undo');
  const redoBtn = document.getElementById('paint-redo');
  const clearBtn = document.getElementById('paint-clear');
  const bgColorBtn = document.getElementById('paint-bg-color');
  const bgImageBtn = document.getElementById('paint-bg-image');
  const bgTransparentBtn = document.getElementById('paint-bg-transparent');
  const saveStickerBtn = document.getElementById('paint-save-sticker');
  const sendBtn = document.getElementById('paint-send');
  const zoomInBtn = document.getElementById('bg-zoom-in');
  const zoomOutBtn = document.getElementById('bg-zoom-out');
  const resetBtn = document.getElementById('bg-reset');
  const rotateLeftBtn = document.getElementById('bg-rotate-left');
  const rotateRightBtn = document.getElementById('bg-rotate-right');
  const flipHBtn = document.getElementById('bg-flip-h');
  const flipVBtn = document.getElementById('bg-flip-v');
  const moveLeftBtn = document.getElementById('bg-move-left');
  const moveUpBtn = document.getElementById('bg-move-up');
  const moveDownBtn = document.getElementById('bg-move-down');
  const moveRightBtn = document.getElementById('bg-move-right');
  const zoomCanvasOut = document.getElementById('zoom-out-btn');
  const zoomCanvasIn = document.getElementById('zoom-in-btn');
  const layoutSelectorBtn = document.getElementById('layout-selector-btn');
  const textBtn = document.getElementById('paint-text');

  const brushRound = document.getElementById('brush-round');
  const brushSquare = document.getElementById('brush-square');
  const brushDashed = document.getElementById('brush-dashed');
  const shapeLine = document.getElementById('shape-line');
  const shapeCircle = document.getElementById('shape-circle');
  const shapeSquare = document.getElementById('shape-square');
  const shapeRectangle = document.getElementById('shape-rectangle');
  const shapeTriangle = document.getElementById('shape-triangle');

  const oldLayoutDropdown = document.getElementById('layout-dropdown');
  if (oldLayoutDropdown) oldLayoutDropdown.style.display = 'none';

  function setTool(iconSvg, toolType, brushType = null, shapeType = null) {
    mainToolBtn.innerHTML = iconSvg;
    if (brushType !== null) {
      currentTool = 'brush';
      currentBrushType = brushType;
      currentShape = null;
    } else if (shapeType !== null) {
      currentTool = 'shape';
      currentShape = shapeType;
    }
    toolDropdown.style.display = 'none';
  }

  function getSvgForTool(tool) {
    const svgs = {
      'brush-round': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="6"/></svg>',
      'brush-square': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="12" height="12"/></svg>',
      'brush-dashed': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="4 4"/></svg>',
      'shape-line': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="4" y1="20" x2="20" y2="4"/></svg>',
      'shape-circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/></svg>',
      'shape-square': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="14" height="14"/></svg>',
      'shape-rectangle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="16" height="12"/></svg>',
      'shape-triangle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12,4 20,20 4,20"/></svg>'
    };
    return svgs[tool] || svgs['brush-round'];
  }

  if (brushRound) brushRound.addEventListener('click', () => setTool(getSvgForTool('brush-round'), 'brush', 'round', null));
  if (brushSquare) brushSquare.addEventListener('click', () => setTool(getSvgForTool('brush-square'), 'brush', 'square', null));
  if (brushDashed) brushDashed.addEventListener('click', () => setTool(getSvgForTool('brush-dashed'), 'brush', 'dashed', null));
  if (shapeLine) shapeLine.addEventListener('click', () => setTool(getSvgForTool('shape-line'), 'shape', null, 'line'));
  if (shapeCircle) shapeCircle.addEventListener('click', () => setTool(getSvgForTool('shape-circle'), 'shape', null, 'circle'));
  if (shapeSquare) shapeSquare.addEventListener('click', () => setTool(getSvgForTool('shape-square'), 'shape', null, 'square'));
  if (shapeRectangle) shapeRectangle.addEventListener('click', () => setTool(getSvgForTool('shape-rectangle'), 'shape', null, 'rectangle'));
  if (shapeTriangle) shapeTriangle.addEventListener('click', () => setTool(getSvgForTool('shape-triangle'), 'shape', null, 'triangle'));

  if (mainToolBtn && toolDropdown) {
    let dropdownOpen = false;
    mainToolBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownOpen = !dropdownOpen;
      toolDropdown.style.display = dropdownOpen ? 'flex' : 'none';
    });
    document.addEventListener('click', (e) => {
      if (!mainToolBtn.contains(e.target) && !toolDropdown.contains(e.target)) {
        dropdownOpen = false;
        toolDropdown.style.display = 'none';
      }
    });
  }

  if (eraserBtn) {
    eraserBtn.addEventListener('click', () => {
      currentTool = 'eraser';
      document.querySelectorAll('.paint-tool').forEach(btn => btn.classList.remove('active'));
      eraserBtn.classList.add('active');
      currentShape = null;
      toolDropdown.style.display = 'none';
    });
  }

  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => { currentSize = parseInt(e.target.value, 10); });
    currentSize = parseInt(sizeSlider.value, 10);
  }
  if (colorPickerBtn) {
    colorPickerBtn.addEventListener('click', () => {
      showGlobalColorPicker((color) => {
        drawColor = color;
        colorPickerBtn.style.background = color;
      });
    });
  }
  if (opacitySlider) {
    opacitySlider.addEventListener('input', () => {
      currentOpacity = parseInt(opacitySlider.value, 10);
      document.getElementById('paint-opacity-value').innerText = currentOpacity + '%';
    });
    currentOpacity = parseInt(opacitySlider.value, 10);
    document.getElementById('paint-opacity-value').innerText = currentOpacity + '%';
  }
  if (undoBtn) undoBtn.addEventListener('click', () => { if (historyIndex > 0) restoreDrawingState(historyIndex - 1); });
  if (redoBtn) redoBtn.addEventListener('click', () => { if (historyIndex < history.length - 1) restoreDrawingState(historyIndex + 1); });
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal('¿Borrar todo el dibujo?');
      if (confirmed) {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        saveDrawingState();
      }
    });
  }
  if (bgColorBtn) bgColorBtn.addEventListener('click', setBackgroundSolidColor);
  if (bgImageBtn) bgImageBtn.addEventListener('click', setBackgroundImageFromGallery);
  if (bgTransparentBtn) bgTransparentBtn.addEventListener('click', setBackgroundTransparent);
  if (saveStickerBtn) saveStickerBtn.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(backgroundCanvas, 0, 0);
    tempCtx.drawImage(drawingCanvas, 0, 0);
    const dataUrl = tempCanvas.toDataURL('image/png');
    const categories = getCategories();
    if (categories.length === 0) { showTransientNotification('No hay categorías. Crea una primero.'); return; }
    showCategorySelector(dataUrl);
  });
  if (sendBtn) sendBtn.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(backgroundCanvas, 0, 0);
    tempCtx.drawImage(drawingCanvas, 0, 0);
    const dataUrl = tempCanvas.toDataURL('image/png');
    const stickerHtml = `<img src="${dataUrl}" class="sticker-message" style="max-width:200px;max-height:200px;border-radius:12px;display:block;">`;
    appendMessage(stickerHtml, { me: true });
    hideModal();
    if (window.isAtBottom && typeof window.smoothScrollToBottom === 'function') window.smoothScrollToBottom();
  });
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => transformBackground(0.1, 0));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => transformBackground(-0.1, 0));
  if (resetBtn) resetBtn.addEventListener('click', resetBackgroundTransform);
  if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => transformBackground(0, -90));
  if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => transformBackground(0, 90));
  if (flipHBtn) flipHBtn.addEventListener('click', () => transformBackground(0, 0, true, false));
  if (flipVBtn) flipVBtn.addEventListener('click', () => transformBackground(0, 0, false, true));
  if (moveLeftBtn) moveLeftBtn.addEventListener('click', () => transformBackground(0, 0, false, false, -10, 0));
  if (moveUpBtn) moveUpBtn.addEventListener('click', () => transformBackground(0, 0, false, false, 0, -10));
  if (moveDownBtn) moveDownBtn.addEventListener('click', () => transformBackground(0, 0, false, false, 0, 10));
  if (moveRightBtn) moveRightBtn.addEventListener('click', () => transformBackground(0, 0, false, false, 10, 0));
  if (zoomCanvasOut) zoomCanvasOut.addEventListener('click', () => setCanvasZoom(canvasZoom - 0.1));
  if (zoomCanvasIn) zoomCanvasIn.addEventListener('click', () => setCanvasZoom(canvasZoom + 0.1));

  if (layoutSelectorBtn) {
    layoutSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLayoutDropdown(layoutSelectorBtn);
    });
  }

  if (textBtn) {
    textBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTextDropdown(textBtn);
    });
  }
}

function showCategorySelector(dataUrl) {
  const categories = getCategories();
  const overlayDiv = document.createElement('div');
  overlayDiv.className = 'modal-blur-overlay';
  overlayDiv.style.zIndex = '30000';
  document.body.appendChild(overlayDiv);
  setTimeout(() => overlayDiv.classList.add('visible'), 10);
  const selectorModal = document.createElement('div');
  selectorModal.className = 'add-reaction-modal enter';
  selectorModal.style.zIndex = '30001';
  selectorModal.style.width = '300px';
  let html = `
    <div class="add-reaction-card" style="padding: 20px;">
      <h1 style="font-size: 18px; margin-bottom: 16px; color: var(--modal-text);">📁 Guardar sticker en categoría</h1>
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 16px;">
  `;
  categories.forEach(cat => {
    const canAdd = cat.stickers.length < 30;
    html += `
      <button class="category-save-btn btn" data-category="${escapeHtml(cat.name)}" style="text-align: left; display: flex; justify-content: space-between; align-items: center;" ${!canAdd ? 'disabled style="opacity:0.5;"' : ''}>
        <span>📁 ${escapeHtml(cat.name)}</span>
        <span style="font-size: 12px;">(${cat.stickers.length}/30)</span>
      </button>
    `;
  });
  html += `
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
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
    overlayDiv.classList.remove('visible');
    setTimeout(() => {
      selectorModal.remove();
      overlayDiv.remove();
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
        await addCustomSticker({ id, url: dataUrl }, categoryName);
        showTransientNotification('✅ Sticker guardado correctamente', 2000);
        refreshStickersInPicker();
        cleanup();
        hideModal();
      } catch (err) {
        showTransientNotification('Error: ' + err.message, 3000);
      }
    });
  });
  selectorModal.querySelector('#cancel-selector').addEventListener('click', cleanup);
}

function initModal() {
  backgroundCanvas = document.getElementById('background-canvas');
  drawingCanvas = document.getElementById('drawing-canvas');
  if (!backgroundCanvas || !drawingCanvas) return;
  backgroundCtx = backgroundCanvas.getContext('2d');
  drawingCtx = drawingCanvas.getContext('2d');
  backgroundCanvas.width = 512;
  backgroundCanvas.height = 512;
  drawingCanvas.width = 512;
  drawingCanvas.height = 512;
  drawBackground();
  saveDrawingState();
  bindCanvasEvents();
  initTools();
  setCanvasZoom(1);
}

function showModal() {
  if (isModalOpen) return;
  if (!windowElement) {
    windowElement = document.getElementById('paint-movable-window');
    headerElement = document.getElementById('paint-modal-header');
    closeBtn = document.getElementById('close-paint-modal');
    overlay = document.getElementById('paint-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => hideModal();
    registerModal(windowElement, 'paint-modal');
    initModal();
  }
  overlay.classList.add('active');
  windowElement.style.display = 'flex';
  windowElement.style.width = '';
  windowElement.style.height = '';
  centerModal();
  isModalOpen = true;
  bringModalToFront('paint-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
  if (floatingSidebarActive) toggleFloatingSidebar(false);
  if (activeLayoutDropdown) {
    activeLayoutDropdown.remove();
    activeLayoutDropdown = null;
  }
  if (activeTextDropdown) {
    activeTextDropdown.remove();
    activeTextDropdown = null;
  }
  if (tempTextData) hideTextTransformControls();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showPaintModal() {
  showModal();
}