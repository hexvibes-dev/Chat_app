import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../modalStackManager.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;
let currentColor = '#000000';
let currentFormat = 'hex';
let onColorSelected = null;
let recentColors = [];
function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-color-picker.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-color-picker resize-${dir}`;
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
        min: { width: 250, height: 280 },
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

/* ---------------------------
   Utilidades de color
   --------------------------- */

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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
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

function rgbaToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/* ---------------------------
   Estado del muestreador de imagen
   --------------------------- */

const imageState = {
  active: false,
  lastSampleHex: null,
  canvasRect: null,
  rafPending: false,
  resizeObserver: null
};

/* ---------------------------
   Helpers para evitar duplicados con HTML existente
   --------------------------- */

function getContentArea() {
  return document.getElementById('color-picker-content-area')
    || document.getElementById('color-picker-inner-content')
    || document.getElementById('color-picker-inner-content-root')
    || null;
}

function attachExistingTabHandlers() {
  const tabColor = document.getElementById('tab-color');
  const tabImage = document.getElementById('tab-image');
  const tabHistory = document.getElementById('tab-history');

  if (tabColor) {
    tabColor.onclick = () => {
      setActiveTabVisual('tab-color');
      renderColorPicker();
      try { if (windowElement && windowElement._deactivateImageSampling) windowElement._deactivateImageSampling(); } catch (e) {}
    };
  }
  if (tabImage) {
    tabImage.onclick = () => {
      setActiveTabVisual('tab-image');
      renderImagePicker();
      try { if (windowElement && windowElement._activateImageSampling) windowElement._activateImageSampling(); } catch (e) {}
    };
  }
  if (tabHistory) {
    tabHistory.onclick = () => {
      setActiveTabVisual('tab-history');
      renderHistory();
      try { if (windowElement && windowElement._deactivateImageSampling) windowElement._deactivateImageSampling(); } catch (e) {}
    };
  }
}

function setActiveTabVisual(activeId) {
  ['tab-color', 'tab-image', 'tab-history'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === activeId) el.classList.add('active');
    else el.classList.remove('active');
  });
}

/* ---------------------------
   Estructura del modal (solo si no existe en HTML)
   --------------------------- */

function buildModalStructureIfNeeded() {
  const inner = document.getElementById('color-picker-inner-content');
  if (!inner) return;

  if (!document.getElementById('tab-color') && !document.getElementById('color-picker-tabs')) {
    const tabsBar = document.createElement('div');
    tabsBar.id = 'color-picker-tabs';
    tabsBar.style.display = 'flex';
    tabsBar.style.gap = '8px';
    tabsBar.style.padding = '12px';
    tabsBar.style.alignItems = 'center';
    tabsBar.innerHTML = `
      <button id="tab-color" class="tab active" style="padding:6px 10px;border-radius:8px;">Color</button>
      <button id="tab-image" class="tab" style="padding:6px 10px;border-radius:8px;">Imagen</button>
      <button id="tab-history" class="tab" style="padding:6px 10px;border-radius:8px;">Historial</button>
    `;
    const contentArea = document.createElement('div');
    contentArea.id = 'color-picker-content-area';
    contentArea.style.padding = '0 12px 12px 12px';

    inner.innerHTML = '';
    inner.appendChild(tabsBar);
    inner.appendChild(contentArea);

    attachExistingTabHandlers();
  } else {
    const contentArea = getContentArea();
    if (!contentArea) {
      const newArea = document.createElement('div');
      newArea.id = 'color-picker-content-area';
      newArea.style.padding = '0 12px 12px 12px';
      inner.appendChild(newArea);
    }
    attachExistingTabHandlers();
  }
}

/* ---------------------------
   Renderers (cada uno limpia content-area)
   --------------------------- */

function clearContentArea() {
  const area = getContentArea();
  if (!area) return;
  area.innerHTML = '';
}

function renderColorPicker() {
  const area = getContentArea();
  if (!area) return;
  clearContentArea();

  const wrapper = document.createElement('div');
  wrapper.style.paddingTop = '8px';
  wrapper.style.display = 'grid';
  wrapper.style.gap = '12px';
  wrapper.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';

  const selDiv = document.createElement('div');
  selDiv.style.display = 'flex';
  selDiv.style.flexDirection = 'column';
  selDiv.style.gap = '8px';
  selDiv.innerHTML = `<label style="color: var(--modal-text);">Selector</label>`;
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.id = 'color-picker-input';
  colorInput.value = currentColor;
  colorInput.style.width = '100%';
  colorInput.style.height = '40px';
  colorInput.style.borderRadius = '6px';
  colorInput.style.border = '1px solid var(--modal-input-border)';
  selDiv.appendChild(colorInput);
  wrapper.appendChild(selDiv);

  const fmtDiv = document.createElement('div');
  fmtDiv.style.display = 'flex';
  fmtDiv.style.flexDirection = 'column';
  fmtDiv.style.gap = '8px';
  fmtDiv.innerHTML = `<label style="color: var(--modal-text);">Formato</label>`;
  const formatSelect = document.createElement('select');
  formatSelect.id = 'color-format-select';
  formatSelect.style.padding = '6px';
  formatSelect.style.borderRadius = '6px';
  formatSelect.style.border = '1px solid var(--modal-input-border)';
  formatSelect.innerHTML = `
    <option value="hex" ${currentFormat === 'hex' ? 'selected' : ''}>HEX</option>
    <option value="rgb" ${currentFormat === 'rgb' ? 'selected' : ''}>RGB</option>
    <option value="hsl" ${currentFormat === 'hsl' ? 'selected' : ''}>HSL</option>
  `;
  fmtDiv.appendChild(formatSelect);
  wrapper.appendChild(fmtDiv);

  const codeRow = document.createElement('div');
  codeRow.style.gridColumn = '1 / -1';
  codeRow.style.display = 'flex';
  codeRow.style.gap = '8px';
  codeRow.style.alignItems = 'center';

  const codeContainer = document.createElement('div');
  codeContainer.style.flex = '1';
  codeContainer.style.display = 'flex';
  codeContainer.style.flexDirection = 'column';
  codeContainer.style.gap = '6px';
  codeContainer.innerHTML = `<label style="color: var(--modal-text);">Código</label>`;
  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.id = 'color-code-input';
  codeInput.value = formatColor(currentColor, currentFormat);
  codeInput.style.width = '100%';
  codeInput.style.padding = '8px';
  codeInput.style.borderRadius = '6px';
  codeInput.style.border = '1px solid var(--modal-input-border)';
  codeInput.style.background = 'var(--modal-input-bg)';
  codeInput.style.color = 'var(--modal-text)';
  codeContainer.appendChild(codeInput);
  codeRow.appendChild(codeContainer);

  if (!document.getElementById('copy-color-btn') && !document.getElementById('copy-color-global')) {
    const copyBtn = document.createElement('button');
    copyBtn.id = 'copy-color-btn';
    copyBtn.title = 'Copiar color';
    copyBtn.style.background = 'transparent';
    copyBtn.style.border = '0';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.width = '40px';
    copyBtn.style.height = '40px';
    copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>`;
    codeRow.appendChild(copyBtn);

    copyBtn.addEventListener('click', () => {
      const textToCopy = codeInput ? codeInput.value : formatColor(currentColor, currentFormat);
      navigator.clipboard.writeText(textToCopy).then(() => {
        const notif = document.createElement('div');
        notif.className = 'transient-notif';
        notif.textContent = `Color ${textToCopy} copiado`;
        document.body.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('visible'));
        setTimeout(() => notif.remove(), 1500);
      });
    });
  } else {
    const globalCopy = document.getElementById('copy-color-global') || document.getElementById('copy-color-btn');
    if (globalCopy) {
      globalCopy.onclick = () => {
        const textToCopy = codeInput ? codeInput.value : formatColor(currentColor, currentFormat);
        navigator.clipboard.writeText(textToCopy).then(() => {
          const notif = document.createElement('div');
          notif.className = 'transient-notif';
          notif.textContent = `Color ${textToCopy} copiado`;
          document.body.appendChild(notif);
          requestAnimationFrame(() => notif.classList.add('visible'));
          setTimeout(() => notif.remove(), 1500);
        });
      };
    }
  }

  wrapper.appendChild(codeRow);

  const preview = document.createElement('div');
  preview.id = 'color-preview';
  preview.style.height = '56px';
  preview.style.borderRadius = '8px';
  preview.style.border = '1px solid var(--modal-input-border)';
  preview.style.background = currentColor;
  wrapper.appendChild(preview);

  area.appendChild(wrapper);

  if (colorInput) {
    colorInput.addEventListener('input', (e) => {
      currentColor = e.target.value.toUpperCase();
      const formatted = formatColor(currentColor, currentFormat);
      if (codeInput) codeInput.value = formatted;
      if (preview) preview.style.background = currentColor;
    });
  }
  if (formatSelect) {
    formatSelect.addEventListener('change', (e) => {
      currentFormat = e.target.value;
      if (codeInput) codeInput.value = formatColor(currentColor, currentFormat);
    });
  }
  if (codeInput) {
    codeInput.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (currentFormat === 'hex' && val.match(/^#[0-9A-Fa-f]{6}$/)) currentColor = val.toUpperCase();
      else if (currentFormat === 'rgb') {
        const match = val.match(/rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/i);
        if (match) currentColor = `#${parseInt(match[1]).toString(16).padStart(2,'0')}${parseInt(match[2]).toString(16).padStart(2,'0')}${parseInt(match[3]).toString(16).padStart(2,'0')}`.toUpperCase();
      }
      if (preview) preview.style.background = currentColor;
    });
  }

  const globalInsert = document.getElementById('color-picker-select') || document.querySelector('#color-picker-movable-window .btn.primary');
  const globalCancel = document.getElementById('color-picker-cancel') || document.querySelector('#color-picker-movable-window .btn-cancel');

  if (globalInsert) {
    globalInsert.onclick = () => {
      const finalColor = imageState.lastSampleHex ? formatColor(imageState.lastSampleHex, currentFormat) : formatColor(currentColor, currentFormat);
      if (onColorSelected) onColorSelected(finalColor);
      saveRecentColor(imageState.lastSampleHex || currentColor);
      hideModal();
    };
  }
  if (globalCancel) {
    globalCancel.onclick = () => hideModal();
  }
}

function renderHistory() {
  const area = getContentArea();
  if (!area) return;
  clearContentArea();

  const items = recentColors.slice().reverse();
  const wrapper = document.createElement('div');
  wrapper.style.paddingTop = '8px';
  wrapper.style.display = 'grid';
  wrapper.style.gap = '12px';
  wrapper.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';

  const listDiv = document.createElement('div');
  listDiv.style.gridColumn = '1 / -1';
  listDiv.style.display = 'flex';
  listDiv.style.flexWrap = 'wrap';
  listDiv.style.gap = '8px';

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = 'var(--modal-text)';
    empty.textContent = 'No hay colores recientes';
    listDiv.appendChild(empty);
  } else {
    items.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'recent-color';
      btn.dataset.color = c;
      btn.style.width = '64px';
      btn.style.height = '64px';
      btn.style.borderRadius = '8px';
      btn.style.border = '1px solid #ddd';
      btn.style.background = c;
      btn.addEventListener('click', () => {
        currentColor = c;
        saveRecentColor(c);
        if (onColorSelected) onColorSelected(formatColor(c, currentFormat));
        hideModal();
      });
      listDiv.appendChild(btn);
    });
  }

  wrapper.appendChild(listDiv);

  const footerDiv = document.createElement('div');
  footerDiv.style.gridColumn = '1 / -1';
  footerDiv.style.display = 'flex';
  footerDiv.style.justifyContent = 'flex-end';
  footerDiv.style.gap = '8px';

  let clearBtn = document.getElementById('clear-history');
  if (!clearBtn) {
    clearBtn = document.createElement('button');
    clearBtn.id = 'clear-history';
    clearBtn.className = 'btn';
    clearBtn.textContent = 'Limpiar';
    footerDiv.appendChild(clearBtn);
  } else {
    footerDiv.appendChild(clearBtn);
  }

  clearBtn.addEventListener('click', () => {
    recentColors = [];
    localStorage.removeItem('color_picker_recent');
    renderHistory();
  });

  wrapper.appendChild(footerDiv);
  area.appendChild(wrapper);
}

function saveRecentColor(hex) {
  if (!hex) return;
  recentColors = recentColors.filter(c => c !== hex);
  recentColors.push(hex);
  if (recentColors.length > 12) recentColors.shift();
  try {
    localStorage.setItem('color_picker_recent', JSON.stringify(recentColors));
  } catch (e) {
  }
}

function renderImagePicker() {
  const area = getContentArea();
  if (!area) return;
  clearContentArea();

  const wrapper = document.createElement('div');
  wrapper.style.paddingTop = '8px';
  wrapper.style.display = 'grid';
  wrapper.style.gap = '12px';
  wrapper.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';

  const innerGrid = document.createElement('div');
  innerGrid.style.gridColumn = '1 / -1';
  innerGrid.style.display = 'grid';
  innerGrid.style.gap = '12px';
  innerGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
  innerGrid.style.alignItems = 'start';

  const openDiv = document.createElement('div');
  openDiv.style.display = 'flex';
  openDiv.style.flexDirection = 'column';
  openDiv.style.gap = '8px';
  openDiv.innerHTML = `<label style="color:var(--modal-text)">Abrir imagen</label>`;
  const fileInput = document.createElement('input');
  fileInput.id = 'image-file-input';
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  const openBtn = document.createElement('button');
  openBtn.id = 'image-open-btn';
  openBtn.className = 'btn';
  openBtn.textContent = 'Seleccionar archivo';
  openDiv.appendChild(fileInput);
  openDiv.appendChild(openBtn);
  innerGrid.appendChild(openDiv);

  const fmtDiv = document.createElement('div');
  fmtDiv.style.display = 'flex';
  fmtDiv.style.flexDirection = 'column';
  fmtDiv.style.gap = '8px';
  fmtDiv.innerHTML = `<label style="color:var(--modal-text)">Formato</label>`;
  const formatSelect = document.createElement('select');
  formatSelect.id = 'image-format-select';
  formatSelect.style.padding = '6px';
  formatSelect.style.borderRadius = '6px';
  formatSelect.style.border = '1px solid var(--modal-input-border)';
  formatSelect.innerHTML = `
    <option value="hex" ${currentFormat === 'hex' ? 'selected' : ''}>HEX</option>
    <option value="rgb" ${currentFormat === 'rgb' ? 'selected' : ''}>RGB</option>
    <option value="hsl" ${currentFormat === 'hsl' ? 'selected' : ''}>HSL</option>
  `;
  fmtDiv.appendChild(formatSelect);
  innerGrid.appendChild(fmtDiv);

  const liveRow = document.createElement('div');
  liveRow.style.gridColumn = '1 / -1';
  liveRow.style.display = 'flex';
  liveRow.style.gap = '8px';
  liveRow.style.alignItems = 'center';
  liveRow.style.flexWrap = 'wrap';

  const livePreview = document.createElement('div');
  livePreview.id = 'live-color-preview';
  livePreview.style.width = '72px';
  livePreview.style.height = '40px';
  livePreview.style.borderRadius = '6px';
  livePreview.style.border = '1px solid #ddd';
  livePreview.style.background = currentColor;
  liveRow.appendChild(livePreview);

  const liveRight = document.createElement('div');
  liveRight.style.flex = '1';
  liveRight.style.display = 'flex';
  liveRight.style.alignItems = 'center';
  liveRight.style.gap = '8px';

  const liveInputWrap = document.createElement('div');
  liveInputWrap.style.flex = '1';
  const liveInput = document.createElement('input');
  liveInput.id = 'live-color-code';
  liveInput.type = 'text';
  liveInput.readOnly = true;
  liveInput.value = formatColor(currentColor, currentFormat);
  liveInput.style.width = '100%';
  liveInput.style.padding = '8px';
  liveInput.style.borderRadius = '6px';
  liveInput.style.border = '1px solid var(--modal-input-border)';
  liveInput.style.background = 'var(--modal-input-bg)';
  liveInput.style.color = 'var(--modal-text)';
  liveInputWrap.appendChild(liveInput);
  liveRight.appendChild(liveInputWrap);

  if (!document.getElementById('live-copy-btn') && !document.getElementById('copy-color-global')) {
    const liveCopy = document.createElement('button');
    liveCopy.id = 'live-copy-btn';
    liveCopy.title = 'Copiar color';
    liveCopy.style.background = 'transparent';
    liveCopy.style.border = '0';
    liveCopy.style.cursor = 'pointer';
    liveCopy.style.width = '40px';
    liveCopy.style.height = '40px';
    liveCopy.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>`;
    liveRight.appendChild(liveCopy);
    liveCopy.addEventListener('click', () => {
      const text = liveInput ? liveInput.value : '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const n = document.createElement('div'); n.className = 'transient-notif'; n.textContent = `Color ${text} copiado`; document.body.appendChild(n);
        requestAnimationFrame(() => n.classList.add('visible'));
        setTimeout(() => n.remove(), 1400);
      });
    });
  } else {
    const globalCopy = document.getElementById('copy-color-global') || document.getElementById('live-copy-btn');
    if (globalCopy) {
      globalCopy.onclick = () => {
        const text = liveInput ? liveInput.value : '';
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          const n = document.createElement('div'); n.className = 'transient-notif'; n.textContent = `Color ${text} copiado`; document.body.appendChild(n);
          requestAnimationFrame(() => n.classList.add('visible'));
          setTimeout(() => n.remove(), 1400);
        });
      };
    }
  }

  liveRow.appendChild(liveRight);
  innerGrid.appendChild(liveRow);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.id = 'image-canvas-wrapper';
  canvasWrapper.style.gridColumn = '1 / -1';
  canvasWrapper.style.position = 'relative';
  canvasWrapper.style.border = '1px solid var(--modal-input-border)';
  canvasWrapper.style.borderRadius = '8px';
  canvasWrapper.style.padding = '8px';
  canvasWrapper.style.display = 'flex';
  canvasWrapper.style.justifyContent = 'center';
  canvasWrapper.style.alignItems = 'center';
  canvasWrapper.style.minHeight = '160px';
  canvasWrapper.style.overflow = 'auto';

  const canvasInner = document.createElement('div');
  canvasInner.id = 'image-canvas-inner';
  canvasInner.style.width = '100%';
  canvasInner.style.maxWidth = '100%';
  canvasInner.style.display = 'flex';
  canvasInner.style.justifyContent = 'center';

  const canvas = document.createElement('canvas');
  canvas.id = 'image-canvas';
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.display = 'block';
  canvas.style.maxWidth = '100%';

  canvasInner.appendChild(canvas);
  canvasWrapper.appendChild(canvasInner);

  const overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlaySvg.id = 'image-overlay';
  overlaySvg.style.position = 'absolute';
  overlaySvg.style.left = '8px';
  overlaySvg.style.top = '8px';
  overlaySvg.style.pointerEvents = 'none';
  overlaySvg.style.width = 'calc(100% - 16px)';
  overlaySvg.style.height = 'calc(100% - 16px)';
  canvasWrapper.appendChild(overlaySvg);

  innerGrid.appendChild(canvasWrapper);

  wrapper.appendChild(innerGrid);
  area.appendChild(wrapper);

  initImagePicker((selected) => {
    if (selected && selected.startsWith('#')) {
      currentColor = selected;
      const codeEl = document.getElementById('live-color-code');
      const previewEl = document.getElementById('live-color-preview');
      if (codeEl) codeEl.value = formatColor(currentColor, currentFormat);
      if (previewEl) previewEl.style.background = currentColor;
    }
  });
}

function initImagePicker(onColorSelectedCallback) {
  const fileInput = document.getElementById('image-file-input');
  const openBtn = document.getElementById('image-open-btn');
  const canvas = document.getElementById('image-canvas');
  const overlay = document.getElementById('image-overlay');
  const preview = document.getElementById('live-color-preview');
  const codeInput = document.getElementById('live-color-code');
  const copyBtn = document.getElementById('live-copy-btn') || document.getElementById('copy-color-global');
  const formatSelect = document.getElementById('image-format-select');
  const canvasWrapper = document.getElementById('image-canvas-wrapper');
  const canvasInner = document.getElementById('image-canvas-inner');

  if (!canvas || !fileInput || !openBtn || !overlay || !canvasWrapper) return;

  let ctx = canvas.getContext('2d');
  let img = new Image();
  let dpr = window.devicePixelRatio || 1;

  let customCursor = document.getElementById('color-picker-cursor');
  if (!customCursor) {
    customCursor = document.createElement('div');
    customCursor.id = 'color-picker-cursor';
    customCursor.style.position = 'fixed';
    customCursor.style.width = '28px';
    customCursor.style.height = '28px';
    customCursor.style.pointerEvents = 'none';
    customCursor.style.zIndex = '20000';
    customCursor.style.transform = 'translate(-50%, -50%)';
    customCursor.style.display = 'none';
    customCursor.style.borderRadius = '50%';
    customCursor.style.background = 'rgba(0,0,0,0.6)';
    customCursor.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.12) inset';
    document.body.appendChild(customCursor);
  }

  function showCustomCursorAt(x, y) {
    customCursor.style.left = `${x}px`;
    customCursor.style.top = `${y}px`;
    customCursor.style.display = 'block';
  }
  function hideCustomCursor() {
    customCursor.style.display = 'none';
  }

  function resizeOverlayToCanvas() {
    const clientW = canvas.clientWidth;
    const clientH = canvas.clientHeight;
    overlay.setAttribute('width', String(clientW));
    overlay.setAttribute('height', String(clientH));
    overlay.style.width = clientW + 'px';
    overlay.style.height = clientH + 'px';
    imageState.canvasRect = canvas.getBoundingClientRect();
  }

  function fitCanvasToContainer(imgWidth) {
    const maxWidth = canvasInner.clientWidth;
    const scale = Math.min(1, maxWidth / imgWidth);
    canvas.style.width = `${Math.round(imgWidth * scale)}px`;
    canvas.style.height = 'auto';
    imageState.canvasRect = canvas.getBoundingClientRect();
    resizeOverlayToCanvas();
  }

  openBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      img = new Image();
      img.onload = () => {
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(img.width * dpr);
        canvas.height = Math.round(img.height * dpr);
        canvas.style.width = `${Math.min(img.width, canvasInner.clientWidth)}px`;
        canvas.style.height = 'auto';
        ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        imageState.canvasRect = canvas.getBoundingClientRect();
        resizeOverlayToCanvas();
        activateSampling();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

  function sampleColorAt(clientX, clientY) {
    if (!imageState.canvasRect) imageState.canvasRect = canvas.getBoundingClientRect();
    const rect = imageState.canvasRect;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    const data = ctx.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
  }

  function updatePreview(rgba) {
    if (!rgba) return;
    const hex = rgbaToHex(rgba);
    imageState.lastSampleHex = hex;
    if (preview) preview.style.background = hex;
    if (codeInput) codeInput.value = formatColor(hex, currentFormat);
  }

  function drawPickerAt(clientX, clientY, zoom = 6, size = 88) {
    if (!imageState.canvasRect) imageState.canvasRect = canvas.getBoundingClientRect();
    const rect = imageState.canvasRect;
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const svgNS = 'http://www.w3.org/2000/svg';
    overlay.innerHTML = '';

    const clipId = `magClip${Date.now()}`;
    const clip = document.createElementNS(svgNS, 'clipPath');
    clip.setAttribute('id', clipId);
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(size / 2));
    clip.appendChild(circle);
    overlay.appendChild(clip);

    const imageEl = document.createElementNS(svgNS, 'image');
    try {
      imageEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
    } catch (err) {
      imageEl.setAttribute('href', '');
    }
    const imgW = canvas.clientWidth;
    const imgH = canvas.clientHeight;
    imageEl.setAttribute('x', String(cx - (size / 2) * zoom));
    imageEl.setAttribute('y', String(cy - (size / 2) * zoom));
    imageEl.setAttribute('width', String(imgW * zoom));
    imageEl.setAttribute('height', String(imgH * zoom));
    imageEl.setAttribute('clip-path', `url(#${clipId})`);
    overlay.appendChild(imageEl);

    const border = document.createElementNS(svgNS, 'circle');
    border.setAttribute('cx', String(cx));
    border.setAttribute('cy', String(cy));
    border.setAttribute('r', String(size / 2));
    border.setAttribute('stroke', '#fff');
    border.setAttribute('stroke-width', '2');
    border.setAttribute('fill', 'none');
    overlay.appendChild(border);

    const cross1 = document.createElementNS(svgNS, 'line');
    cross1.setAttribute('x1', String(cx - 6)); cross1.setAttribute('y1', String(cy)); cross1.setAttribute('x2', String(cx + 6)); cross1.setAttribute('y2', String(cy));
    cross1.setAttribute('stroke', 'rgba(0,0,0,0.6)'); cross1.setAttribute('stroke-width', '1');
    overlay.appendChild(cross1);
    const cross2 = document.createElementNS(svgNS, 'line');
    cross2.setAttribute('x1', String(cx)); cross2.setAttribute('y1', String(cy - 6)); cross2.setAttribute('x2', String(cx)); cross2.setAttribute('y2', String(cy + 6));
    cross2.setAttribute('stroke', 'rgba(0,0,0,0.6)'); cross2.setAttribute('stroke-width', '1');
    overlay.appendChild(cross2);

    const px = Math.min(canvas.clientWidth - 88, cx + 12);
    const py = Math.max(8, cy - size / 2);
    const previewBox = document.createElementNS(svgNS, 'rect');
    previewBox.setAttribute('x', String(px));
    previewBox.setAttribute('y', String(py));
    previewBox.setAttribute('width', '80');
    previewBox.setAttribute('height', '32');
    previewBox.setAttribute('rx', '6');
    previewBox.setAttribute('ry', '6');
    previewBox.setAttribute('fill', imageState.lastSampleHex || '#FFFFFF');
    previewBox.setAttribute('stroke', '#ddd');
    overlay.appendChild(previewBox);

    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', String(px + 8));
    text.setAttribute('y', String(py + 20));
    text.setAttribute('fill', '#111');
    text.setAttribute('font-size', '12');
    text.textContent = formatColor(imageState.lastSampleHex || '#FFFFFF', currentFormat);
    overlay.appendChild(text);

    const brush = document.createElementNS(svgNS, 'path');
    brush.setAttribute('d', 'M2 20c0 0 6-2 10-6 4-4 6-10 6-10s-6 2-10 6C6 16 2 20 2 20z');
    brush.setAttribute('fill', 'rgba(0,0,0,0.6)');
    brush.setAttribute('transform', `translate(${cx + 18}, ${cy - 18}) scale(0.9)`);
    overlay.appendChild(brush);
  }

  function clearOverlay() { overlay.innerHTML = ''; }

  function handlePointerMove(e) {
    if (!imageState.active) return;
    if (imageState.rafPending) return;
    imageState.rafPending = true;
    window.requestAnimationFrame(() => {
      imageState.rafPending = false;
      showCustomCursorAt(e.clientX, e.clientY);
      const rgba = sampleColorAt(e.clientX, e.clientY);
      if (rgba) updatePreview(rgba);
      drawPickerAt(e.clientX, e.clientY);
    });
  }

  function handlePointerDown(e) {
    if (!imageState.active) return;
    showCustomCursorAt(e.clientX, e.clientY);
    drawPickerAt(e.clientX, e.clientY);
    const rgba = sampleColorAt(e.clientX, e.clientY);
    if (rgba) {
      updatePreview(rgba);
      const final = formatColor(rgbaToHex(rgba), currentFormat);
      if (onColorSelectedCallback) onColorSelectedCallback(final);
      imageState.lastSampleHex = rgbaToHex(rgba);
      saveRecentColor(imageState.lastSampleHex);
    }
  }

  function activateSampling() {
    if (imageState.active) return;
    imageState.active = true;
    try { document.body.style.cursor = 'none'; } catch (e) {}
    canvasWrapper.style.touchAction = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    imageState.canvasRect = canvas.getBoundingClientRect();
    resizeOverlayToCanvas();
    showCustomCursorAt(window.innerWidth / 2, window.innerHeight / 2);
    try { bringModalToFront('color-picker-modal'); } catch (e) {}
  }

  function deactivateSampling() {
    if (!imageState.active) return;
    imageState.active = false;
    try { document.body.style.cursor = ''; } catch (e) {}
    canvasWrapper.style.touchAction = '';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown);
    clearOverlay();
    hideCustomCursor();
  }

  if (windowElement) {
    windowElement._activateImageSampling = activateSampling;
    windowElement._deactivateImageSampling = deactivateSampling;
  }

  activateSampling();

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = codeInput ? codeInput.value : '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const n = document.createElement('div'); n.className = 'transient-notif'; n.textContent = `Color ${text} copiado`; document.body.appendChild(n);
        requestAnimationFrame(() => n.classList.add('visible'));
        setTimeout(() => n.remove(), 1400);
      });
    });
  }

  formatSelect && formatSelect.addEventListener('change', (e) => {
    currentFormat = e.target.value;
    if (codeInput && imageState.lastSampleHex) codeInput.value = formatColor(imageState.lastSampleHex, currentFormat);
  });

  if (imageState.resizeObserver) imageState.resizeObserver.disconnect();
  imageState.resizeObserver = new ResizeObserver(() => {
    if (canvas && canvas.width) {
      imageState.canvasRect = canvas.getBoundingClientRect();
      resizeOverlayToCanvas();
      if (img && img.width) fitCanvasToContainer(img.width);
    }
  });
  imageState.resizeObserver.observe(canvasWrapper);
}

/* ---------------------------
   Estructura inicial y show/hide modal
   --------------------------- */

function showModal(callback) {
  if (isModalOpen) return;
  onColorSelected = callback;
  if (!windowElement) {
    windowElement = document.getElementById('color-picker-movable-window');
    headerElement = document.getElementById('color-picker-modal-header');
    closeBtn = document.getElementById('close-color-picker-modal');
    overlay = document.getElementById('color-picker-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => hideModal();
    registerModal(windowElement, 'color-picker-modal');
  }

  buildModalStructureIfNeeded();
  attachExistingTabHandlers();

  const activeTab = document.querySelector('#tab-color.active, #tab-image.active, #tab-history.active');
  if (activeTab) {
    if (activeTab.id === 'tab-image') {
      renderImagePicker();
      try { if (windowElement && windowElement._activateImageSampling) windowElement._activateImageSampling(); } catch (e) {}
    } else if (activeTab.id === 'tab-history') {
      renderHistory();
    } else {
      renderColorPicker();
    }
  } else {
    setActiveTabVisual('tab-color');
    renderColorPicker();
  }

  overlay && overlay.classList.add('active');
  windowElement.style.display = 'flex';
  centerModal();
  isModalOpen = true;
  bringModalToFront('color-picker-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  try {
    if (windowElement && windowElement._deactivateImageSampling) windowElement._deactivateImageSampling();
  } catch (e) {}
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
}

/* ---------------------------
   Init y exports
   --------------------------- */

(function init() {
  try {
    const stored = JSON.parse(localStorage.getItem('color_picker_recent') || '[]');
    if (Array.isArray(stored)) recentColors = stored;
  } catch (e) {
    recentColors = [];
  }
})();

export function showColorPicker(callback) {
  showModal(callback);
}

export function setDefaultColor(hex) {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) currentColor = hex.toUpperCase();
}

export function setDefaultFormat(fmt) {
  if (['hex', 'rgb', 'hsl'].includes(fmt)) currentFormat = fmt;
}