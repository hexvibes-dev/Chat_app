import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../modalStackManager.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;
let currentColor = '#000000';
let currentFormat = 'hex';
let onColorSelected = null;

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-global-color.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-global-color resize-${dir}`;
      element.appendChild(handle);
    }
  });
}

function centerModal() {
  if (!windowElement) return;
  const rect = windowElement.getBoundingClientRect();
  windowX = (window.innerWidth - rect.width) / 2;
  windowY = (window.innerHeight - rect.height) / 2;
  windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
  windowElement.setAttribute('data-x', String(windowX));
  windowElement.setAttribute('data-y', String(windowY));
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
  if (getComputedStyle(windowElement).position === 'static') {
    windowElement.style.position = 'relative';
  }
  interact(windowElement).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 250, height: 200 },
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
        windowElement.setAttribute('data-x', String(windowX));
        windowElement.setAttribute('data-y', String(windowY));
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
        windowElement.setAttribute('data-x', String(windowX));
        windowElement.setAttribute('data-y', String(windowY));
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

function formatColor(color, format) {
  if (!color) return '';
  if (format === 'hex') return color.toUpperCase();
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  if (format === 'rgb') return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  if (format === 'hsl') {
    const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  return color;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

async function startEyeDropper() {
  if (!window.EyeDropper) {
    alert('Tu navegador no soporta el selector de color. Usa Chrome/Edge.');
    return;
  }
  try {
    const eyeDropper = new window.EyeDropper();
    const result = await eyeDropper.open();
    const hexColor = result.sRGBHex.toUpperCase();
    currentColor = hexColor;
    updatePreview(hexColor);
    if (onColorSelected) onColorSelected(formatColor(hexColor, currentFormat));
  } catch (err) {
    console.log('EyeDropper cancelado o error', err);
  }
}

function updatePreview(hexColor) {
  const preview = document.getElementById('global-color-preview');
  const codeInput = document.getElementById('global-color-code');
  if (preview) preview.style.backgroundColor = hexColor;
  if (codeInput) codeInput.value = formatColor(hexColor, currentFormat);
}

function renderModalContent() {
  let contentDiv = document.getElementById('global-color-inner-content');
  if (!contentDiv && windowElement) {
    const inner = windowElement.querySelector('.modal-inner-content') || windowElement;
    contentDiv = document.createElement('div');
    contentDiv.id = 'global-color-inner-content';
    inner.appendChild(contentDiv);
  }
  if (!contentDiv) return;
  contentDiv.innerHTML = `
    <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div id="global-color-preview" style="width: 56px; height: 56px; border-radius: 12px; border: 1px solid var(--modal-input-border); background: ${currentColor};"></div>
        <div style="flex: 1;">
          <label style="color: var(--modal-text); font-size: 12px;">Formato</label>
          <select id="global-format-select" style="width: 100%; padding: 6px; border-radius: 6px; background: var(--modal-input-bg); color: var(--modal-text); border: 1px solid var(--modal-input-border);">
            <option value="hex" ${currentFormat === 'hex' ? 'selected' : ''}>HEX</option>
            <option value="rgb" ${currentFormat === 'rgb' ? 'selected' : ''}>RGB</option>
            <option value="hsl" ${currentFormat === 'hsl' ? 'selected' : ''}>HSL</option>
          </select>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="global-color-code" value="${formatColor(currentColor, currentFormat)}" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--modal-input-bg); color: var(--modal-text); border: 1px solid var(--modal-input-border);">
        <button id="global-copy-btn" class="btn" style="padding: 0 12px;">Copiar</button>
      </div>
      <button id="global-eyedropper-btn" class="btn primary" style="width: 100%;">🎨 Seleccionar color de pantalla</button>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
        <button id="global-cancel-btn" class="btn-cancel">Cancelar</button>
        <button id="global-insert-btn" class="btn primary">Insertar</button>
      </div>
    </div>
  `;

  document.getElementById('global-format-select')?.addEventListener('change', (e) => {
    currentFormat = e.target.value;
    const codeInput = document.getElementById('global-color-code');
    if (codeInput) codeInput.value = formatColor(currentColor, currentFormat);
  });

  document.getElementById('global-copy-btn')?.addEventListener('click', () => {
    const code = document.getElementById('global-color-code')?.value;
    if (code) {
      navigator.clipboard.writeText(code);
      showTransientNotification('Color copiado');
    }
  });

  document.getElementById('global-eyedropper-btn')?.addEventListener('click', () => {
    startEyeDropper();
  });

  document.getElementById('global-cancel-btn')?.addEventListener('click', () => {
    hideModal();
  });

  document.getElementById('global-insert-btn')?.addEventListener('click', () => {
    const finalColor = formatColor(currentColor, currentFormat);
    if (onColorSelected) onColorSelected(finalColor);
    hideModal();
  });
}

function showTransientNotification(text, duration = 1500) {
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

function buildModalStructure() {
  if (document.getElementById('global-color-movable-window')) return;

  const modalHtml = `
    <div id="global-color-movable-window" class="movable-window" style="display: none; position: fixed; background: var(--modal-bg); border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 320px; min-height: 280px; z-index: 11000; flex-direction: column; border: 1px solid var(--modal-input-border);">
      <div id="global-color-modal-header" class="modal-header" style="padding: 12px; cursor: grab; user-select: none; background: var(--modal-header-bg); border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: var(--modal-text);">Selector de color</span>
        <button id="close-global-color-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--modal-text);">✕</button>
      </div>
      <div class="modal-inner-content" style="flex: 1; overflow-y: auto;"></div>
    </div>
    <div id="global-color-overlay" class="modal-blur-overlay" style="display: none;"></div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showModal(callback) {
  if (isModalOpen) return;
  onColorSelected = callback;
  if (!windowElement) {
    buildModalStructure();
    windowElement = document.getElementById('global-color-movable-window');
    headerElement = document.getElementById('global-color-modal-header');
    closeBtn = document.getElementById('close-global-color-modal');
    overlay = document.getElementById('global-color-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => hideModal();
    registerModal(windowElement, 'global-color-modal');
  }
  renderModalContent();
  overlay.style.display = 'block';
  overlay.classList.add('active');
  windowElement.style.display = 'flex';
  centerModal();
  isModalOpen = true;
  bringModalToFront('global-color-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }
  isModalOpen = false;
}

export function showGlobalColorPicker(callback) {
  showModal(callback);
}