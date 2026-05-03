// src/scripts/editor/FloatingPreview.js
import { EditorManager } from './EditorManager.js';

let previewElement = null;
let isTutorialMode = true;
let currentStep = 0;
let animationFrameId = null;
let translateX = 0, translateY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let startTranslateX = 0, startTranslateY = 0;

const TUTORIAL_KEY = 'floating_preview_tutorial_seen';
const tutorialSteps = [
  "Bienvenido al editor puto",
  "Usa 'bubble' para el estilo visual de la burbuja, 'text' para el texto.",
  "Usa 'anima' para animar la burbuja y 'anima-text' para animar el texto.",
  "También puedes personalizar la hora con 'hour'.",
  "Las animaciones se ven en la bolita dentro del editor.",
  "Guarda tus estilos en la pestaña Custom.",
  "Aqui veras la preview en tiempo real de tus cambios",
  "¡Arrastra esta burbuja a donde quieras!"
];

function updateTutorialUI() {
  if (!previewElement) return;
  previewElement.innerHTML = `
    <div class="message-text" style="max-height: 150px; overflow-y: auto; user-select: none;">${tutorialSteps[currentStep]}</div>
    <div class="tutorial-buttons">
      <button class="tutorial-prev" ${currentStep === 0 ? 'disabled' : ''}>◀ Atrás</button>
      <button class="tutorial-next">${currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Siguiente ▶'}</button>
    </div>
  `;
  attachTutorialEvents();
}

function attachTutorialEvents() {
  const prevBtn = previewElement.querySelector('.tutorial-prev');
  const nextBtn = previewElement.querySelector('.tutorial-next');
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentStep > 0) {
        currentStep--;
        updateTutorialUI();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentStep === tutorialSteps.length - 1) {
        finishTutorial();
      } else {
        currentStep++;
        updateTutorialUI();
      }
    });
  }
}

function finishTutorial() {
  isTutorialMode = false;
  localStorage.setItem(TUTORIAL_KEY, 'true');
  const currentHour = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  previewElement.innerHTML = `
    <div class="message-text" style="max-height: 150px; overflow-y: auto; user-select: none;">${EditorManager.getMessageText()}</div>
    <div class="msg-hour">${currentHour}</div>
  `;
  previewElement.classList.remove('tutorial-mode');
  applyStylesToPreview();
  window.addEventListener('editor-styles-updated', applyStylesToPreview);
  window.addEventListener('editor-message-updated', (e) => {
    if (!isTutorialMode && previewElement) {
      const msgDiv = previewElement.querySelector('.message-text');
      if (msgDiv) msgDiv.textContent = e.detail;
    }
  });
}

function applyStylesToPreview() {
  if (!previewElement || isTutorialMode) return;
  const cssText = EditorManager.getCurrentCSS();
  const currentTransform = previewElement.style.transform;
  
  previewElement.style.cssText = '';
  const msgDiv = previewElement.querySelector('.message-text');
  const hourDiv = previewElement.querySelector('.msg-hour');
  if (msgDiv) msgDiv.style.cssText = '';
  if (hourDiv) hourDiv.style.cssText = '';
  
  const styleMap = parseCSS(cssText, ['bubble', 'text', 'hour']);
  if (styleMap['bubble']) Object.assign(previewElement.style, styleMap['bubble']);
  if (msgDiv && styleMap['text']) Object.assign(msgDiv.style, styleMap['text']);
  if (hourDiv && styleMap['hour']) Object.assign(hourDiv.style, styleMap['hour']);
  
  previewElement.style.position = 'fixed';
  previewElement.style.cursor = 'grab';
  previewElement.style.transform = currentTransform || `translate(${translateX}px, ${translateY}px)`;
  previewElement.style.zIndex = '20000';
  previewElement.style.transition = 'none';
  previewElement.style.touchAction = 'none';
  if (msgDiv) {
    msgDiv.style.maxHeight = '150px';
    msgDiv.style.overflowY = 'auto';
    msgDiv.style.userSelect = 'none';
  }
  if (hourDiv) {
    hourDiv.style.fontSize = '11px';
    hourDiv.style.opacity = '0.7';
    hourDiv.style.marginTop = '4px';
    hourDiv.style.textAlign = 'right';
  }
}

function parseCSS(cssText, allowedSelectors) {
  const result = {};
  const blockRegex = /([\w-]+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = blockRegex.exec(cssText)) !== null) {
    const selector = match[1].trim();
    if (!allowedSelectors.includes(selector)) continue;
    const decls = match[2].trim();
    const styleObj = {};
    decls.split(';').forEach(decl => {
      const [prop, val] = decl.split(':');
      if (prop && val) {
        const propName = prop.trim().toLowerCase();
        if (propName.startsWith('animation') || propName === 'transition') return;
        const camelProp = propName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styleObj[camelProp] = val.trim();
      }
    });
    result[selector] = styleObj;
  }
  return result;
}

function onPointerDown(e) {
  if (e.target.closest('.tutorial-prev') || e.target.closest('.tutorial-next')) return;
  e.preventDefault();
  e.stopPropagation();
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  startTranslateX = translateX;
  startTranslateY = translateY;
  previewElement.style.cursor = 'grabbing';
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
  if (!isDragging) return;
  e.preventDefault();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(() => {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    translateX = startTranslateX + dx;
    translateY = startTranslateY + dy;
    previewElement.style.transform = `translate(${translateX}px, ${translateY}px)`;
    animationFrameId = null;
  });
}

function onPointerUp(e) {
  if (!isDragging) return;
  e.preventDefault();
  isDragging = false;
  previewElement.style.cursor = 'grab';
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
}

function enableDragging() {
  if (!previewElement) return;
  previewElement.addEventListener('pointerdown', onPointerDown);
  previewElement.style.touchAction = 'none';
}

export function showFloatingPreview() {
  if (previewElement) {
    previewElement.remove();
    previewElement = null;
  }
  
  previewElement = document.createElement('div');
  previewElement.className = 'floating-preview speech-bubble';
  document.body.appendChild(previewElement);
  
  const width = previewElement.offsetWidth || 280;
  const height = previewElement.offsetHeight || 150;
  translateX = (window.innerWidth - width) / 2;
  translateY = (window.innerHeight - height) / 2;
  
  previewElement.style.position = 'fixed';
  previewElement.style.transform = `translate(${translateX}px, ${translateY}px)`;
  previewElement.style.zIndex = '20000';
  previewElement.style.cursor = 'grab';
  previewElement.style.userSelect = 'none';
  previewElement.style.transition = 'none';
  previewElement.style.touchAction = 'none';
  
  const tutorialSeen = localStorage.getItem(TUTORIAL_KEY) === 'true';
  if (tutorialSeen) {
    isTutorialMode = false;
    previewElement.classList.remove('tutorial-mode');
    const currentHour = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    previewElement.innerHTML = `
      <div class="message-text" style="max-height: 150px; overflow-y: auto; user-select: none;">${EditorManager.getMessageText()}</div>
      <div class="msg-hour">${currentHour}</div>
    `;
    applyStylesToPreview();
    window.addEventListener('editor-styles-updated', applyStylesToPreview);
    window.addEventListener('editor-message-updated', (e) => {
      if (!isTutorialMode && previewElement) {
        const msgDiv = previewElement.querySelector('.message-text');
        if (msgDiv) msgDiv.textContent = e.detail;
      }
    });
  } else {
    isTutorialMode = true;
    previewElement.classList.add('tutorial-mode');
    currentStep = 0;
    updateTutorialUI();
  }
  enableDragging();
}

export function hideFloatingPreview() {
  if (previewElement) {
    previewElement.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    previewElement.remove();
    previewElement = null;
  }
  window.removeEventListener('editor-styles-updated', applyStylesToPreview);
  window.removeEventListener('editor-message-updated', applyStylesToPreview);
  isDragging = false;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

export function updateFloatingPreviewStyles() {
  if (!isTutorialMode && previewElement) applyStylesToPreview();
}

export function updateFloatingPreviewMessage(text) {
  if (!isTutorialMode && previewElement) {
    const msgDiv = previewElement.querySelector('.message-text');
    if (msgDiv) msgDiv.textContent = text;
  }
}