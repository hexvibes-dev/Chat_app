// // src/scripts/editor/ColorPickerModal.js
// import interact from 'interactjs';
// import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../modalStackManager.js';

// let windowElement, headerElement, closeBtn, overlay;
// let isModalOpen = false;
// let currentColor = '#000000';
// let currentFormat = 'hex';
// let onColorSelected = null;
// let recentColors = [];

// const imageState = {
//   active: false,
//   lastSampleHex: null,
//   canvasRect: null,
//   rafPending: false,
//   resizeObserver: null,
//   img: null,
//   ctx: null,
//   sampleCanvas: null,
//   sampleCtx: null,
//   sampleScale: 1
// };

// let draggablePickerEl = null;

// function formatColor(hex, fmt) {
//   if (!hex) return '';
//   if (fmt === 'hex') return hex.toUpperCase();
//   const r = parseInt(hex.slice(1, 3), 16);
//   const g = parseInt(hex.slice(3, 5), 16);
//   const b = parseInt(hex.slice(5, 7), 16);
//   if (fmt === 'rgb') return `rgb(${r}, ${g}, ${b})`;
//   let rr = r / 255, gg = g / 255, bb = b / 255;
//   const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
//   let h = 0, s = 0, l = (max + min) / 2;
//   if (max !== min) {
//     const d = max - min;
//     s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//     switch (max) {
//       case rr: h = (gg - bb) / d + (gg < bb ? 6 : 0); break;
//       case gg: h = (bb - rr) / d + 2; break;
//       default: h = (rr - gg) / d + 4;
//     }
//     h *= 60;
//   }
//   return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
// }

// function rgbaToHex({ r, g, b }) {
//   return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
// }

// function getContentArea() {
//   return document.getElementById('color-picker-content-area') || document.getElementById('color-picker-inner-content') || null;
// }

// function attachExistingTabHandlers() {
//   const tabColor = document.getElementById('tab-color');
//   const tabImage = document.getElementById('tab-image');
//   const tabHistory = document.getElementById('tab-history');
//   if (tabColor) {
//     tabColor.onclick = () => {
//       setActiveTabVisual('tab-color');
//       renderColorPicker();
//       deactivateImageSampling();
//     };
//   }
//   if (tabImage) {
//     tabImage.onclick = () => {
//       setActiveTabVisual('tab-image');
//       renderImagePicker();
//       activateImageSampling();
//     };
//   }
//   if (tabHistory) {
//     tabHistory.onclick = () => {
//       setActiveTabVisual('tab-history');
//       renderHistory();
//       deactivateImageSampling();
//     };
//   }
// }

// function setActiveTabVisual(id) {
//   ['tab-color', 'tab-image', 'tab-history'].forEach(i => {
//     const el = document.getElementById(i);
//     if (!el) return;
//     el.classList.toggle('active', i === id);
//   });
// }

// function buildModalStructureIfNeeded() {
//   const inner = document.getElementById('color-picker-inner-content');
//   if (!inner) return;
//   if (!document.getElementById('color-picker-tabs')) {
//     inner.innerHTML = `
//       <div id="color-picker-tabs" style="display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--modal-input-border)">
//         <button id="tab-color" class="tab active" data-tab="color">Color</button>
//         <button id="tab-image" class="tab" data-tab="image">Imagen</button>
//         <button id="tab-history" class="tab" data-tab="history">Historial</button>
//       </div>
//       <div id="color-picker-content-area" style="padding:0 12px 12px 12px;height:calc(100% - 48px);overflow:auto"></div>
//     `;
//   }
//   attachExistingTabHandlers();
// }

// function renderColorPicker() {
//   const area = getContentArea();
//   if (!area) return;
//   area.innerHTML = `
//     <div style="padding-top:8px;display:grid;gap:12px">
//       <input id="color-picker-input" type="color" value="${currentColor}" style="height:40px;border-radius:6px;border:1px solid var(--modal-input-border)"/>
//       <div style="display:flex;align-items:center;gap:8px">
//         <input id="color-code-input" type="text" value="${formatColor(currentColor, currentFormat)}" style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--modal-input-border)"/>
//         <button id="color-copy-btn" class="btn" style="padding:4px 12px;">Copiar</button>
//       </div>
//       <div id="color-preview" style="height:56px;border-radius:8px;background:${currentColor};border:1px solid var(--modal-input-border)"></div>
//     </div>
//   `;
//   const colorInput = document.getElementById('color-picker-input');
//   const codeInput = document.getElementById('color-code-input');
//   if (colorInput) {
//     colorInput.addEventListener('input', e => {
//       currentColor = e.target.value.toUpperCase();
//       if (codeInput) codeInput.value = formatColor(currentColor, currentFormat);
//       const p = document.getElementById('color-preview');
//       if (p) p.style.background = currentColor;
//     });
//   }
//   const copyBtn = document.getElementById('color-copy-btn');
//   if (copyBtn) {
//     copyBtn.addEventListener('click', () => {
//       const text = codeInput ? codeInput.value : formatColor(currentColor, currentFormat);
//       navigator.clipboard.writeText(text);
//       showTransientNotification(`Color ${text} copiado`);
//     });
//   }
// }

// function renderHistory() {
//   const area = getContentArea();
//   if (!area) return;
//   const items = (recentColors || []).slice().reverse();
//   area.innerHTML = `
//     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
//       ${items.map(c => `<button class="recent" data-color="${c}" style="width:64px;height:64px;border-radius:8px;border:1px solid #ddd;background:${c}"></button>`).join('')}
//     </div>
//   `;
//   area.querySelectorAll('.recent').forEach(btn => {
//     btn.addEventListener('click', () => {
//       const c = btn.dataset.color;
//       if (onColorSelected) onColorSelected(formatColor(c, currentFormat));
//       hideModal();
//     });
//   });
// }

// function renderImagePicker() {
//   const area = getContentArea();
//   if (!area) return;
//   area.innerHTML = `
//     <div style="padding-top:8px;display:grid;gap:12px">
//       <div style="display:flex;gap:8px;align-items:center">
//         <input id="image-file-input" type="file" accept="image/*" style="display:none"/>
//         <button id="image-open-btn" class="btn">Seleccionar archivo</button>
//         <div id="live-color-preview" style="width:72px;height:40px;border:1px solid #ddd;background:${currentColor};border-radius:6px"></div>
//         <input id="live-color-code" readonly value="${formatColor(currentColor, currentFormat)}" style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--modal-input-border)"/>
//         <button id="live-copy-btn" class="btn" style="padding:4px 12px;">Copiar</button>
//       </div>
//       <div id="image-canvas-wrapper" style="position:relative;border:1px solid var(--modal-input-border);border-radius:8px;padding:8px;min-height:160px;overflow:auto;display:flex;justify-content:center;align-items:center">
//         <canvas id="image-canvas" style="max-width:100%;max-height:100%;display:block;touch-action:none;object-fit:contain"></canvas>
//       </div>
//     </div>
//   `;
//   initImagePicker(selected => {
//     if (selected && selected.startsWith('#')) {
//       currentColor = selected;
//       const preview = document.getElementById('live-color-preview');
//       const code = document.getElementById('live-color-code');
//       if (preview) preview.style.background = currentColor;
//       if (code) code.value = formatColor(currentColor, currentFormat);
//     }
//   });
//   const copyBtn = document.getElementById('live-copy-btn');
//   if (copyBtn) {
//     copyBtn.addEventListener('click', () => {
//       const codeInput = document.getElementById('live-color-code');
//       const text = codeInput ? codeInput.value : formatColor(currentColor, currentFormat);
//       navigator.clipboard.writeText(text);
//       showTransientNotification(`Color ${text} copiado`);
//     });
//   }
// }

// function saveRecentColor(hex) {
//   if (!hex) return;
//   recentColors = (recentColors || []).filter(c => c !== hex);
//   recentColors.push(hex);
//   if (recentColors.length > 12) recentColors.shift();
//   try {
//     localStorage.setItem('color_picker_recent', JSON.stringify(recentColors));
//   } catch (e) {}
// }

// // ========== DRAGGABLE CIRCLE PICKER ==========
// function createDraggablePicker() {
//   if (draggablePickerEl) return draggablePickerEl;
//   const el = document.createElement('div');
//   el.id = 'color-picker-draggable';
//   Object.assign(el.style, {
//     position: 'fixed',
//     left: '20px',
//     top: '120px',
//     zIndex: '20002',
//     width: '56px',
//     height: '56px',
//     borderRadius: '50%',
//     border: '4px solid white',
//     backgroundColor: 'rgba(0,0,0,0.3)',
//     backdropFilter: 'blur(2px)',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     cursor: 'grab',
//     boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
//     touchAction: 'none',
//     userSelect: 'none',
//     pointerEvents: 'auto',
//     transition: 'border-color 0.1s ease, transform 0.1s ease'
//   });
//   el.dataset.x = '0';
//   el.dataset.y = '0';

//   const svgNS = 'http://www.w3.org/2000/svg';
//   const svg = document.createElementNS(svgNS, 'svg');
//   svg.setAttribute('viewBox', '0 0 24 24');
//   svg.setAttribute('width', '28');
//   svg.setAttribute('height', '28');
//   svg.style.pointerEvents = 'none';
//   const path = document.createElementNS(svgNS, 'path');
//   path.setAttribute('d', 'M3 21l18-9L3 3v7l12 2-12 2v7z');
//   path.setAttribute('fill', 'white');
//   svg.appendChild(path);
//   el.appendChild(svg);

//   document.body.appendChild(el);

//   interact(el).draggable({
//     inertia: true,
//     modifiers: [interact.modifiers.restrictRect({ restriction: document.documentElement, endOnly: true })],
//     listeners: {
//       start(event) {
//         el.style.cursor = 'grabbing';
//         el.style.transform = 'scale(1.1)';
//         const transform = window.getComputedStyle(el).transform;
//         if (transform && transform !== 'none') {
//           const matrix = transform.match(/matrix3d\(([^)]+)\)|matrix\(([^)]+)\)/);
//           if (matrix) {
//             const vals = (matrix[1] || matrix[2]).split(',').map(Number);
//             el.dataset.x = vals.length >= 13 ? vals[12] : (vals[4] || 0);
//             el.dataset.y = vals.length >= 13 ? vals[13] : (vals[5] || 0);
//           }
//         }
//       },
//       move(event) {
//         const prevX = parseFloat(el.dataset.x || '0');
//         const prevY = parseFloat(el.dataset.y || '0');
//         const newX = prevX + event.dx;
//         const newY = prevY + event.dy;
//         el.dataset.x = String(newX);
//         el.dataset.y = String(newY);
//         el.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
//         const rect = el.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         sampleFromPickerCenter(centerX, centerY);
//       },
//       end() {
//         el.style.cursor = 'grab';
//         el.style.transform = '';
//       }
//     }
//   });
//   el.addEventListener('pointerdown', e => {
//     e.stopPropagation();
//     const rect = el.getBoundingClientRect();
//     sampleFromPickerCenter(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
//   });
//   draggablePickerEl = el;
//   return el;
// }

// function showDraggablePicker() {
//   const el = createDraggablePicker();
//   if (el) el.style.display = 'flex';
// }
// function hideDraggablePicker() {
//   if (draggablePickerEl) draggablePickerEl.style.display = 'none';
// }
// function updatePickerBorderColor(hexColor) {
//   if (draggablePickerEl) draggablePickerEl.style.borderColor = hexColor;
// }

// // ========== IMAGE PICKER LOGIC ==========
// function initImagePicker(onColorSelectedCallback) {
//   const fileInput = document.getElementById('image-file-input');
//   const openBtn = document.getElementById('image-open-btn');
//   const canvas = document.getElementById('image-canvas');
//   const preview = document.getElementById('live-color-preview');
//   const codeInput = document.getElementById('live-color-code');
//   const canvasWrapper = document.getElementById('image-canvas-wrapper');
//   if (!canvas || !fileInput || !openBtn || !canvasWrapper) return;

//   let ctx = canvas.getContext('2d');
//   let img = new Image();
//   imageState.img = img;
//   imageState.ctx = ctx;

//   showDraggablePicker();

//   openBtn.addEventListener('click', () => fileInput.click());
//   fileInput.addEventListener('change', e => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => {
//       const dataUrl = String(reader.result);
//       img = new Image();
//       imageState.img = img;
//       img.onload = () => {
//         imageState.sampleCanvas = null; // se recreará más abajo
//         const maxSample = 800;
//         const sampleScale = Math.min(1, maxSample / Math.max(img.width, img.height));
//         const sw = Math.max(1, Math.round(img.width * sampleScale));
//         const sh = Math.max(1, Math.round(img.height * sampleScale));
//         if (!imageState.sampleCanvas) imageState.sampleCanvas = document.createElement('canvas');
//         imageState.sampleCanvas.width = sw;
//         imageState.sampleCanvas.height = sh;
//         imageState.sampleCtx = imageState.sampleCanvas.getContext('2d');
//         imageState.sampleCtx.clearRect(0, 0, sw, sh);
//         imageState.sampleCtx.drawImage(img, 0, 0, sw, sh);
//         imageState.sampleScale = sampleScale;

//         // Ajustar canvas a las dimensiones visibles del contenedor
//         const containerWidth = canvasWrapper.clientWidth - 16; // restando padding
//         const containerHeight = canvasWrapper.clientHeight - 16;
//         const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
//         canvas.width = img.width;
//         canvas.height = img.height;
//         canvas.style.width = `${img.width * scale}px`;
//         canvas.style.height = `${img.height * scale}px`;
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         ctx.drawImage(img, 0, 0);
//         imageState.canvasRect = canvas.getBoundingClientRect();
//       };
//       img.src = dataUrl;
//     };
//     reader.readAsDataURL(file);
//   });

//   // Redimensionar dinámicamente la imagen cuando cambie el tamaño del contenedor
//   if (imageState.resizeObserver) imageState.resizeObserver.disconnect();
//   imageState.resizeObserver = new ResizeObserver(() => {
//     if (!img || !img.width || !canvasWrapper) return;
//     const containerWidth = canvasWrapper.clientWidth - 16;
//     const containerHeight = canvasWrapper.clientHeight - 16;
//     if (containerWidth <= 0 || containerHeight <= 0) return;
//     const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
//     canvas.style.width = `${img.width * scale}px`;
//     canvas.style.height = `${img.height * scale}px`;
//     imageState.canvasRect = canvas.getBoundingClientRect();
//     // Redibujar el canvas (si es necesario, aunque la imagen original ya está dibujada)
//     if (ctx && img.complete) {
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       ctx.drawImage(img, 0, 0);
//     }
//   });
//   imageState.resizeObserver.observe(canvasWrapper);

//   function sampleColorAt(clientX, clientY) {
//     if (!imageState.canvasRect) imageState.canvasRect = canvas.getBoundingClientRect();
//     const rect = imageState.canvasRect;
//     if (!imageState.sampleCanvas) return null;
//     const sx = Math.floor((clientX - rect.left) * (imageState.sampleCanvas.width / rect.width));
//     const sy = Math.floor((clientY - rect.top) * (imageState.sampleCanvas.height / rect.height));
//     if (sx < 0 || sy < 0 || sx >= imageState.sampleCanvas.width || sy >= imageState.sampleCanvas.height) return null;
//     try {
//       const data = imageState.sampleCtx.getImageData(sx, sy, 1, 1).data;
//       return { r: data[0], g: data[1], b: data[2], a: data[3] };
//     } catch (e) {
//       return null;
//     }
//   }

//   function updatePreview(rgba) {
//     if (!rgba) return;
//     const hex = rgbaToHex(rgba);
//     imageState.lastSampleHex = hex;
//     if (preview) preview.style.background = hex;
//     if (codeInput) codeInput.value = formatColor(hex, currentFormat);
//     updatePickerBorderColor(hex);
//   }

//   function sampleFromPickerCenter(clientX, clientY, triggerSelect = false) {
//     if (imageState.rafPending) return;
//     imageState.rafPending = true;
//     requestAnimationFrame(() => {
//       imageState.rafPending = false;
//       const rgba = sampleColorAt(clientX, clientY);
//       if (rgba) updatePreview(rgba);
//       if (triggerSelect && rgba) {
//         const final = formatColor(rgbaToHex(rgba), currentFormat);
//         if (onColorSelectedCallback) onColorSelectedCallback(final);
//         imageState.lastSampleHex = rgbaToHex(rgba);
//         saveRecentColor(imageState.lastSampleHex);
//         hideModal(); // Opcional: cerrar el modal tras seleccionar
//       }
//     });
//   }

//   let globalMoveHandler = null;
//   let globalDownHandler = null;
//   function activateSampling() {
//     if (imageState.active) return;
//     imageState.active = true;
//     globalMoveHandler = () => {
//       if (draggablePickerEl && draggablePickerEl.style.display !== 'none') {
//         const rect = draggablePickerEl.getBoundingClientRect();
//         sampleFromPickerCenter(rect.left + rect.width / 2, rect.top + rect.height / 2);
//       }
//     };
//     globalDownHandler = () => {
//       if (draggablePickerEl && draggablePickerEl.style.display !== 'none') {
//         const rect = draggablePickerEl.getBoundingClientRect();
//         sampleFromPickerCenter(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
//       }
//     };
//     window.addEventListener('pointermove', globalMoveHandler);
//     window.addEventListener('pointerdown', globalDownHandler);
//   }
//   function deactivateSampling() {
//     if (!imageState.active) return;
//     imageState.active = false;
//     if (globalMoveHandler) window.removeEventListener('pointermove', globalMoveHandler);
//     if (globalDownHandler) window.removeEventListener('pointerdown', globalDownHandler);
//     hideDraggablePicker();
//   }

//   if (windowElement) {
//     windowElement._activateImageSampling = activateSampling;
//     windowElement._deactivateImageSampling = deactivateSampling;
//   }
//   activateSampling();
// }

// function showModal(callback) {
//   if (isModalOpen) return;
//   onColorSelected = callback;
//   if (!windowElement) {
//     windowElement = document.getElementById('color-picker-movable-window');
//     headerElement = document.getElementById('color-picker-modal-header');
//     closeBtn = document.getElementById('close-color-picker-modal');
//     overlay = document.getElementById('color-picker-overlay');
//     if (!windowElement || !headerElement) return;
//     associateOverlay(windowElement, overlay);
//     interact(windowElement).resizable({
//       edges: { top: true, left: true, bottom: true, right: true },
//       inertia: false,
//       modifiers: [interact.modifiers.restrictSize({ min: { width: 300, height: 220 }, max: { width: window.innerWidth * 0.95, height: window.innerHeight * 0.95 } })],
//       listeners: {
//         move(event) {
//           const dx = event.deltaRect.left;
//           const dy = event.deltaRect.top;
//           const width = event.rect.width;
//           const height = event.rect.height;
//           const prevX = parseFloat(windowElement.dataset.x || '0');
//           const prevY = parseFloat(windowElement.dataset.y || '0');
//           const nx = prevX + dx;
//           const ny = prevY + dy;
//           windowElement.style.width = `${width}px`;
//           windowElement.style.height = `${height}px`;
//           windowElement.dataset.x = String(nx);
//           windowElement.dataset.y = String(ny);
//           windowElement.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
//           constrainAllModals();
//         }
//       }
//     });
//     interact(headerElement).draggable({
//       inertia: false,
//       allowFrom: headerElement,
//       modifiers: [interact.modifiers.restrictRect({ restriction: document.documentElement, endOnly: true })],
//       listeners: {
//         start() { headerElement.style.cursor = 'grabbing'; },
//         move(event) {
//           const prevX = parseFloat(windowElement.dataset.x || '0');
//           const prevY = parseFloat(windowElement.dataset.y || '0');
//           const nx = prevX + event.dx;
//           const ny = prevY + event.dy;
//           windowElement.dataset.x = String(nx);
//           windowElement.dataset.y = String(ny);
//           windowElement.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
//           constrainAllModals();
//         },
//         end() { headerElement.style.cursor = 'grab'; }
//       }
//     });
//     if (closeBtn) closeBtn.onclick = () => { if (windowElement && windowElement._deactivateImageSampling) windowElement._deactivateImageSampling(); hideModal(); };
//     registerModal(windowElement, 'color-picker-modal');
//   }
//   buildModalStructureIfNeeded();
//   const activeTab = document.querySelector('#tab-color.active, #tab-image.active, #tab-history.active');
//   if (activeTab && activeTab.id === 'tab-image') {
//     renderImagePicker();
//     try { if (windowElement && windowElement._activateImageSampling) windowElement._activateImageSampling(); } catch (e) { }
//   } else if (activeTab && activeTab.id === 'tab-history') {
//     renderHistory();
//   } else {
//     renderColorPicker();
//   }
//   overlay && overlay.classList.add('active');
//   windowElement.style.display = 'flex';
//   windowElement.dataset.x = windowElement.dataset.x || '0';
//   windowElement.dataset.y = windowElement.dataset.y || '0';
//   isModalOpen = true;
//   bringModalToFront('color-picker-modal');
// }

// function hideModal() {
//   if (!isModalOpen) return;
//   try { if (windowElement && windowElement._deactivateImageSampling) windowElement._deactivateImageSampling(); } catch (e) { }
//   if (windowElement) windowElement.style.display = 'none';
//   if (overlay) overlay.classList.remove('active');
//   isModalOpen = false;
//   hideDraggablePicker();
// }

// function showTransientNotification(text, duration = 1500) {
//   let notif = document.querySelector('.transient-notif');
//   if (!notif) {
//     notif = document.createElement('div');
//     notif.className = 'transient-notif';
//     document.body.appendChild(notif);
//   }
//   notif.textContent = text;
//   notif.classList.add('visible');
//   setTimeout(() => notif.classList.remove('visible'), duration);
// }

// (function init() {
//   try {
//     const stored = localStorage.getItem('color_picker_recent');
//     if (stored) recentColors = JSON.parse(stored);
//   } catch (e) { recentColors = []; }
//   const style = document.createElement('style');
//   style.textContent = `
//     #color-picker-draggable { touch-action: none; -webkit-user-drag: none; user-select: none; will-change: transform; }
//     #color-picker-draggable:active { cursor: grabbing; }
//     .color-picker-movable-window { will-change: transform, width, height; touch-action: none; }
//     #image-canvas { image-rendering: optimizeQuality; background: #f0f0f0; display: block; margin: auto; }
//     .transient-notif { position: fixed; left: 50%; transform: translateX(-50%); bottom: 90px; background: rgba(0,0,0,0.85); color: white; padding: 8px 12px; border-radius: 8px; z-index: 20003; opacity: 0; transition: opacity 0.18s; pointer-events: none; }
//     .transient-notif.visible { opacity: 1; }
//   `;
//   document.head.appendChild(style);
// })();

// export function showColorPicker(callback) { showModal(callback); }
// export function setDefaultColor(hex) { if (/^#[0-9A-Fa-f]{6}$/.test(hex)) currentColor = hex.toUpperCase(); }
// export function setDefaultFormat(fmt) { if (['hex', 'rgb', 'hsl'].includes(fmt)) currentFormat = fmt; }