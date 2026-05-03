// src/scripts/editor/GlobalColorPicker.js
import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../modalStackManager.js';

let windowElement, headerElement, closeBtn, overlay;
let isModalOpen = false;
let currentColor = '#000000';
let lastSampledColor = '#000000';
let currentFormat = 'hex';
let onColorSelected = null;
let recentColors = [];

let originalImage = null;
let canvas = null;
let ctx = null;
let canvasWrapper = null;
let livePreview = null;
let liveCode = null;
let resizeObserver = null;
let cachedImageDataUrl = null;
let clearImageBtn = null;

let draggablePickerEl = null;
let isPickerDragging = false;
let pickerTranslate = { x: 0, y: 0 };
let pickerDragStart = { x: 0, y: 0 };

function formatColor(hex, fmt) {
    if (!hex) return '';
    if (fmt === 'hex') return hex.toUpperCase();
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (fmt === 'rgb') return `rgb(${r}, ${g}, ${b})`;
    let rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rr: h = (gg - bb) / d + (gg < bb ? 6 : 0); break;
            case gg: h = (bb - rr) / d + 2; break;
            default: h = (rr - gg) / d + 4;
        }
        h *= 60;
    }
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function rgbaToHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function getContentArea() {
    return document.getElementById('color-picker-content-area') || document.getElementById('color-picker-inner-content') || null;
}

function attachExistingTabHandlers() {
    const tabColor = document.getElementById('tab-color');
    const tabImage = document.getElementById('tab-image');
    const tabHistory = document.getElementById('tab-history');
    if (tabColor) tabColor.onclick = () => { setActiveTabVisual('tab-color'); renderColorPicker(); deactivateImageSampling(); };
    if (tabImage) tabImage.onclick = () => { setActiveTabVisual('tab-image'); renderImagePicker(); activateImageSampling(); };
    if (tabHistory) tabHistory.onclick = () => { setActiveTabVisual('tab-history'); renderHistory(); deactivateImageSampling(); };
}

function setActiveTabVisual(id) {
    ['tab-color', 'tab-image', 'tab-history'].forEach(i => {
        const el = document.getElementById(i);
        if (!el) return;
        el.classList.toggle('active', i === id);
    });
}

function buildModalStructureIfNeeded() {
    const inner = document.getElementById('color-picker-inner-content');
    if (!inner) return;
    if (!document.getElementById('color-picker-tabs')) {
        inner.innerHTML = `
      <div id="color-picker-tabs" style="display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--modal-input-border)">
        <button id="tab-color" class="tab active" data-tab="color">Color</button>
        <button id="tab-image" class="tab" data-tab="image">Imagen</button>
        <button id="tab-history" class="tab" data-tab="history">Historial</button>
      </div>
      <div id="color-picker-content-area" style="padding:0 12px 12px 12px;height:calc(100% - 48px);overflow:auto"></div>
    `;
    }
    attachExistingTabHandlers();
}

function renderColorPicker() {
    const area = getContentArea();
    if (!area) return;
    area.innerHTML = `
    <div style="padding-top:8px;display:grid;gap:12px">
      <input id="color-picker-input" type="color" value="${currentColor}" style="height:40px;border-radius:6px;border:1px solid var(--modal-input-border)"/>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="color-code-input" type="text" value="${formatColor(currentColor, currentFormat)}" style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--modal-input-border)"/>
        <button id="color-copy-btn" class="btn" style="padding:4px 12px;">Copiar</button>
      </div>
      <div id="color-preview" style="height:56px;border-radius:8px;background:${currentColor};border:1px solid var(--modal-input-border)"></div>
    </div>
  `;
    const colorInput = document.getElementById('color-picker-input');
    const codeInput = document.getElementById('color-code-input');
    const preview = document.getElementById('color-preview');
    if (colorInput) {
        colorInput.addEventListener('input', e => {
            currentColor = e.target.value.toUpperCase();
            if (codeInput) codeInput.value = formatColor(currentColor, currentFormat);
            if (preview) preview.style.background = currentColor;
            saveRecentColor(currentColor);
        });
    }
    const copyBtn = document.getElementById('color-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = codeInput ? codeInput.value : formatColor(currentColor, currentFormat);
            navigator.clipboard.writeText(text);
            showTransientNotification(`Color ${text} copiado`);
        });
    }
}

function renderHistory() {
    const area = getContentArea();
    if (!area) return;
    const items = (recentColors || []).slice().reverse();
    area.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(64px, auto));gap:12px;justify-content:center;padding:12px;">
      ${items.map(c => `<button class="recent" data-color="${c}" style="width:64px;height:64px;border-radius:8px;border:1px solid #ddd;background:${c};cursor:pointer;"></button>`).join('')}
    </div>
  `;
    area.querySelectorAll('.recent').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = btn.dataset.color;
            currentColor = c;
            if (onColorSelected) onColorSelected(formatColor(c, currentFormat));
            saveRecentColor(c);
            hideModal();
        });
    });
}

function createDraggablePicker() {
    if (draggablePickerEl) return draggablePickerEl;
    const el = document.createElement('div');
    el.id = 'color-picker-draggable';
    Object.assign(el.style, {
        position: 'fixed',
        left: '20px',
        top: '120px',
        zIndex: '20002',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: '4px solid white',
        backgroundColor: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        transition: 'border-color 0.1s ease, transform 0.1s ease',
        willChange: 'transform'
    });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.style.pointerEvents = 'none';
    svg.style.display = 'block';
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M3 21l18-9L3 3v7l12 2-12 2v7z');
    path.setAttribute('fill', 'white');
    svg.appendChild(path);
    el.appendChild(svg);
    document.body.appendChild(el);
    function setPickerScale(scale) {
        el.style.transform = `translate3d(${pickerTranslate.x}px, ${pickerTranslate.y}px, 0) scale(${scale})`;
    }
    el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isPickerDragging = true;
        pickerDragStart = { x: e.clientX - pickerTranslate.x, y: e.clientY - pickerTranslate.y };
        el.style.cursor = 'grabbing';
        setPickerScale(1.4);
        el.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointermove', (e) => {
        if (!isPickerDragging) return;
        pickerTranslate.x = e.clientX - pickerDragStart.x;
        pickerTranslate.y = e.clientY - pickerDragStart.y;
        setPickerScale(1.4);
        const rect = el.getBoundingClientRect();
        sampleColorFromCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    window.addEventListener('pointerup', (e) => {
        if (!isPickerDragging) return;
        isPickerDragging = false;
        el.style.cursor = 'grab';
        setPickerScale(1);
        el.releasePointerCapture(e.pointerId);
    });
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        sampleColorFromCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    });
    draggablePickerEl = el;
    return el;
}

function showDraggablePicker() {
    const el = createDraggablePicker();
    if (el) el.style.display = 'flex';
    pickerTranslate = { x: 0, y: 0 };
    el.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
}

function hideDraggablePicker() {
    if (draggablePickerEl) draggablePickerEl.style.display = 'none';
}

function updatePickerBorderColor(hexColor) {
    if (draggablePickerEl) draggablePickerEl.style.borderColor = hexColor;
}

function updatePreviewColor(hexColor) {
    if (livePreview) livePreview.style.background = hexColor;
    if (liveCode) liveCode.value = formatColor(hexColor, currentFormat);
}

function sampleColorFromCanvas(screenX, screenY, triggerSelect = false) {
    if (!canvas || !ctx || !originalImage) return;
    const canvasRect = canvas.getBoundingClientRect();
    if (screenX < canvasRect.left || screenX > canvasRect.right || screenY < canvasRect.top || screenY > canvasRect.bottom) return;
    const cssX = screenX - canvasRect.left;
    const cssY = screenY - canvasRect.top;
    const realX = (cssX / canvasRect.width) * canvas.width;
    const realY = (cssY / canvasRect.height) * canvas.height;
    if (realX < 0 || realY < 0 || realX >= canvas.width || realY >= canvas.height) return;
    try {
        const pixel = ctx.getImageData(realX, realY, 1, 1).data;
        if (pixel[3] && pixel[3] > 0) {
            const hex = rgbaToHex({ r: pixel[0], g: pixel[1], b: pixel[2] });
            lastSampledColor = hex;
            updatePickerBorderColor(hex);
            updatePreviewColor(hex);
            if (triggerSelect) {
                currentColor = hex;
                if (onColorSelected) onColorSelected(formatColor(hex, currentFormat));
                saveRecentColor(hex);
                hideModal();
            }
        }
    } catch (err) {
        console.warn("Error sampling from canvas", err);
    }
}

function clearImage() {
    if (!canvas || !ctx) return;
    originalImage = null;
    cachedImageDataUrl = null;
    canvas.width = 0;
    canvas.height = 0;
    canvas.style.width = 'auto';
    canvas.style.height = 'auto';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (clearImageBtn) clearImageBtn.style.display = 'none';
    updatePreviewColor(currentColor);
}

function loadImageFromDataUrl(dataUrl) {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = function () {
        originalImage = img;
        cachedImageDataUrl = dataUrl;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0);
        if (clearImageBtn) clearImageBtn.style.display = 'flex';
    };
    img.src = dataUrl;
}

function initImagePicker(onColorSelectedCallback) {
    const fileInput = document.getElementById('image-file-input');
    const openBtn = document.getElementById('image-open-btn');
    canvas = document.getElementById('image-canvas');
    livePreview = document.getElementById('live-color-preview');
    liveCode = document.getElementById('live-color-code');
    canvasWrapper = document.getElementById('image-canvas-wrapper');
    if (!canvas || !fileInput || !openBtn || !canvasWrapper) {
        return;
    }
    ctx = canvas.getContext('2d');
    originalImage = null;
    canvasWrapper.style.overflow = 'hidden';
    canvasWrapper.style.display = 'flex';
    canvasWrapper.style.justifyContent = 'center';
    canvasWrapper.style.alignItems = 'center';
    canvasWrapper.style.backgroundColor = '#f0f0f0';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.style.objectFit = 'contain';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    if (!clearImageBtn) {
        clearImageBtn = document.createElement('button');
        clearImageBtn.id = 'clear-image-btn';
        clearImageBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        clearImageBtn.style.position = 'absolute';
        clearImageBtn.style.top = '8px';
        clearImageBtn.style.right = '8px';
        clearImageBtn.style.zIndex = '1000';
        clearImageBtn.style.backgroundColor = 'rgba(0,0,0,0.6)';
        clearImageBtn.style.border = 'none';
        clearImageBtn.style.borderRadius = '50%';
        clearImageBtn.style.width = '28px';
        clearImageBtn.style.height = '28px';
        clearImageBtn.style.display = 'none';
        clearImageBtn.style.cursor = 'pointer';
        clearImageBtn.style.color = 'white';
        clearImageBtn.style.alignItems = 'center';
        clearImageBtn.style.justifyContent = 'center';
        clearImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearImage();
        });
        canvasWrapper.style.position = 'relative';
        canvasWrapper.appendChild(clearImageBtn);
    }
    openBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            const dataUrl = event.target.result;
            cachedImageDataUrl = dataUrl;
            loadImageFromDataUrl(dataUrl);
        };
        reader.readAsDataURL(file);
    });
    if (cachedImageDataUrl && !originalImage) {
        loadImageFromDataUrl(cachedImageDataUrl);
    }
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => {});
    resizeObserver.observe(canvasWrapper);
}

function renderImagePicker() {
    const area = getContentArea();
    if (!area) return;
    area.innerHTML = `
    <div style="display:grid;gap:12px;padding:12px;">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input id="image-file-input" type="file" accept="image/*" style="display:none"/>
        <button id="image-open-btn" class="btn">Seleccionar archivo</button>
        <div id="live-color-preview" style="width:72px;height:40px;border:1px solid #ddd;background:${currentColor};border-radius:6px"></div>
        <input id="live-color-code" readonly value="${formatColor(currentColor, currentFormat)}" style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--modal-input-border)"/>
        <button id="live-copy-btn" class="btn" style="padding:4px 12px;">Copiar</button>
      </div>
      <div id="image-canvas-wrapper" style="border:1px solid var(--modal-input-border);border-radius:8px;padding:8px;min-height:200px;background:#f0f0f0;">
        <canvas id="image-canvas" style="display:block;margin:0 auto;"></canvas>
      </div>
    </div>
  `;
    initImagePicker((selected) => {
        if (selected && selected.startsWith('#')) {
            currentColor = selected;
            lastSampledColor = selected;
            const preview = document.getElementById('live-color-preview');
            const code = document.getElementById('live-color-code');
            if (preview) preview.style.background = currentColor;
            if (code) code.value = formatColor(currentColor, currentFormat);
        }
    });
    const copyBtn = document.getElementById('live-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const codeInput = document.getElementById('live-color-code');
            const text = codeInput ? codeInput.value : formatColor(currentColor, currentFormat);
            navigator.clipboard.writeText(text);
            showTransientNotification(`Color ${text} copiado`);
        });
    }
}

function saveRecentColor(hex) {
    if (!hex) return;
    recentColors = (recentColors || []).filter(c => c !== hex);
    recentColors.push(hex);
    if (recentColors.length > 12) recentColors.shift();
    try {
        localStorage.setItem('color_picker_recent', JSON.stringify(recentColors));
    } catch (e) { }
}

function activateImageSampling() { showDraggablePicker(); }
function deactivateImageSampling() { hideDraggablePicker(); }

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
        windowElement.style.overflow = 'hidden';
        windowElement.style.display = 'flex';
        windowElement.style.flexDirection = 'column';
        interact(windowElement).resizable({
            edges: { top: true, left: true, bottom: true, right: true },
            inertia: false,
            modifiers: [interact.modifiers.restrictSize({ min: { width: 300, height: 220 }, max: { width: window.innerWidth * 0.95, height: window.innerHeight * 0.95 } })],
            listeners: {
                move(event) {
                    const dx = event.deltaRect.left;
                    const dy = event.deltaRect.top;
                    const width = event.rect.width;
                    const height = event.rect.height;
                    const prevX = parseFloat(windowElement.dataset.x || '0');
                    const prevY = parseFloat(windowElement.dataset.y || '0');
                    const nx = prevX + dx;
                    const ny = prevY + dy;
                    windowElement.style.width = `${width}px`;
                    windowElement.style.height = `${height}px`;
                    windowElement.dataset.x = String(nx);
                    windowElement.dataset.y = String(ny);
                    windowElement.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
                    constrainAllModals();
                }
            }
        });
        interact(headerElement).draggable({
            inertia: false,
            allowFrom: headerElement,
            modifiers: [interact.modifiers.restrictRect({ restriction: document.documentElement, endOnly: true })],
            listeners: {
                start(event) {
                    const transformValue = windowElement.style.transform;
                    if (transformValue && transformValue !== 'none') {
                        const match = transformValue.match(/translate3d\(([^,]+),([^,]+),/);
                        if (match) {
                            windowElement.dataset.x = String(parseFloat(match[1]));
                            windowElement.dataset.y = String(parseFloat(match[2]));
                        }
                    }
                    headerElement.style.cursor = 'grabbing';
                },
                move(event) {
                    const prevX = parseFloat(windowElement.dataset.x || '0');
                    const prevY = parseFloat(windowElement.dataset.y || '0');
                    const nx = prevX + event.dx;
                    const ny = prevY + event.dy;
                    windowElement.dataset.x = String(nx);
                    windowElement.dataset.y = String(ny);
                    windowElement.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
                    constrainAllModals();
                },
                end() { headerElement.style.cursor = 'grab'; }
            }
        });
        if (closeBtn) closeBtn.onclick = () => { deactivateImageSampling(); hideModal(); };
        registerModal(windowElement, 'color-picker-modal');
    }
    buildModalStructureIfNeeded();
    const activeTab = document.querySelector('#tab-color.active, #tab-image.active, #tab-history.active');
    if (activeTab && activeTab.id === 'tab-image') {
        renderImagePicker();
        activateImageSampling();
    } else if (activeTab && activeTab.id === 'tab-history') {
        renderHistory();
        deactivateImageSampling();
    } else {
        renderColorPicker();
        deactivateImageSampling();
    }
    overlay && overlay.classList.add('active');
    windowElement.style.display = 'flex';
    const modalWidth = windowElement.offsetWidth;
    const modalHeight = windowElement.offsetHeight;
    const left = (window.innerWidth - modalWidth) / 2;
    const top = (window.innerHeight - modalHeight) / 2;
    windowElement.style.left = `${left}px`;
    windowElement.style.top = `${top}px`;
    windowElement.style.transform = 'none';
    windowElement.dataset.x = String(left);
    windowElement.dataset.y = String(top);
    isModalOpen = true;
    bringModalToFront('color-picker-modal');
    const insertBtn = document.getElementById('color-picker-insert');
    if (insertBtn) {
        insertBtn.onclick = () => {
            const activeTabNow = document.querySelector('#tab-color.active, #tab-image.active, #tab-history.active');
            let finalColor;
            if (activeTabNow && activeTabNow.id === 'tab-image') {
                finalColor = lastSampledColor;
            } else {
                finalColor = currentColor;
            }
            if (onColorSelected) onColorSelected(formatColor(finalColor, currentFormat));
            saveRecentColor(finalColor);
            hideModal();
        };
    }
}

function hideModal() {
    if (!isModalOpen) return;
    deactivateImageSampling();
    if (windowElement) windowElement.style.display = 'none';
    if (overlay) overlay.classList.remove('active');
    isModalOpen = false;
    if (draggablePickerEl) draggablePickerEl.style.display = 'none';
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

(function init() {
    try {
        const stored = localStorage.getItem('color_picker_recent');
        if (stored) recentColors = JSON.parse(stored);
        if (!Array.isArray(recentColors)) recentColors = [];
    } catch (e) {
        recentColors = [];
    }
})();

export function showGlobalColorPicker(callback) { showModal(callback); }
export { showGlobalColorPicker as showColorPicker };