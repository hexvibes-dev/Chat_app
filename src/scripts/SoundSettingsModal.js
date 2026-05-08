// src/scripts/SoundSettingsModal.js
import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';
import { 
  setGlobalVolume, getGlobalVolume, 
  enableSounds, disableSounds, isSoundEnabled,
  playMessageSend, playMessageReceive, playClick, playNotification,
  playReactionAdd, playReactionRemove, playKeyboard, playPopupClose
} from './soundManager.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;

const SOUND_CONFIGS = [
  { key: 'click', name: 'Click de botón', getVolume: () => getVolumeForSound('click'), setVolume: (v) => setVolumeForSound('click', v), play: playClick },
  { key: 'messageSend', name: 'Enviar mensaje', getVolume: () => getVolumeForSound('messageSend'), setVolume: (v) => setVolumeForSound('messageSend', v), play: playMessageSend },
  { key: 'messageReceive', name: 'Recibir mensaje', getVolume: () => getVolumeForSound('messageReceive'), setVolume: (v) => setVolumeForSound('messageReceive', v), play: playMessageReceive },
  { key: 'notification', name: 'Notificaciones', getVolume: () => getVolumeForSound('notification'), setVolume: (v) => setVolumeForSound('notification', v), play: playNotification },
  { key: 'reactionAdd', name: 'Añadir reacción', getVolume: () => getVolumeForSound('reactionAdd'), setVolume: (v) => setVolumeForSound('reactionAdd', v), play: playReactionAdd },
  { key: 'reactionRemove', name: 'Eliminar reacción', getVolume: () => getVolumeForSound('reactionRemove'), setVolume: (v) => setVolumeForSound('reactionRemove', v), play: playReactionRemove },
  { key: 'keyboard', name: 'Teclado', getVolume: () => getVolumeForSound('keyboard'), setVolume: (v) => setVolumeForSound('keyboard', v), play: playKeyboard },
  { key: 'popupClose', name: 'Cerrar popup', getVolume: () => getVolumeForSound('popupClose'), setVolume: (v) => setVolumeForSound('popupClose', v), play: playPopupClose }
];

let soundEnabledStates = {};
let soundVolumes = {};

function loadSavedSettings() {
  SOUND_CONFIGS.forEach(config => {
    const key = config.key;
    const savedState = localStorage.getItem(`sound_${key}_enabled`);
    soundEnabledStates[key] = savedState !== null ? savedState === 'true' : true;
    
    const savedVolume = localStorage.getItem(`sound_${key}_volume`);
    soundVolumes[key] = savedVolume !== null ? parseFloat(savedVolume) : 0.5;
  });
}

function saveSoundEnabled(key, enabled) {
  localStorage.setItem(`sound_${key}_enabled`, enabled.toString());
}

function saveSoundVolume(key, volume) {
  localStorage.setItem(`sound_${key}_volume`, volume.toString());
}

function getVolumeForSound(key) {
  return soundVolumes[key] !== undefined ? soundVolumes[key] : 0.5;
}

function setVolumeForSound(key, volume) {
  soundVolumes[key] = volume;
  saveSoundVolume(key, volume);
}

function isSoundEnabledForKey(key) {
  return soundEnabledStates[key] !== undefined ? soundEnabledStates[key] : true;
}

function setSoundEnabledForKey(key, enabled) {
  soundEnabledStates[key] = enabled;
  saveSoundEnabled(key, enabled);
}

function updateSoundManagerGlobal() {
  const anyEnabled = Object.values(soundEnabledStates).some(v => v === true);
  if (anyEnabled) {
    enableSounds();
  } else {
    disableSounds();
  }
  setGlobalVolume(1);
}

function renderModalContent() {
  const container = document.getElementById('sound-settings-inner-content');
  if (!container) return;
  
  let html = `
    <div class="sound-items-container">
  `;
  
  SOUND_CONFIGS.forEach(config => {
    const isEnabled = isSoundEnabledForKey(config.key);
    const volume = getVolumeForSound(config.key);
    const volumePercent = Math.round(volume * 100);
    
    html += `
      <div class="sound-item" data-sound="${config.key}" style="${!isEnabled ? 'opacity: 0.5;' : ''}">
        <div class="sound-header">
          <button class="sound-icon-btn ${isEnabled ? 'active' : ''}" data-sound="${config.key}" data-toggle="${config.key}">
            ${isEnabled ? 
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h3l3-3v6l-3-3H3z"/><path d="M15 9a5 5 0 0 1 0 6"/><path d="M18 7a8 8 0 0 1 0 10"/></svg>' : 
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h3l3-3v6l-3-3H3z"/><path d="M15 9a5 5 0 0 1 0 6"/><path d="M18 7a8 8 0 0 1 0 10"/><line x1="21" y1="3" x2="3" y2="21"/></svg>'
            }
          </button>
          <span class="sound-name">${config.name}</span>
        </div>
        <div class="sound-slider-container">
          <input type="range" class="sound-slider" data-sound="${config.key}" data-slider="${config.key}" min="0" max="1" step="0.01" value="${volume}" ${!isEnabled ? 'disabled' : ''}>
          <span class="sound-volume-value" data-volume="${config.key}">${volumePercent}%</span>
        </div>
      </div>
    `;
  });
  
  html += `
    </div>
    <div class="modal-actions-buttons">
      <button id="sound-settings-cancel" class="btn-cancel">Cancelar</button>
      <button id="sound-settings-save" class="btn-save">Guardar</button>
    </div>
  `;
  
  container.innerHTML = html;
  
  SOUND_CONFIGS.forEach(config => {
    const slider = document.querySelector(`.sound-slider[data-slider="${config.key}"]`);
    const volumeSpan = document.querySelector(`.sound-volume-value[data-volume="${config.key}"]`);
    const toggleBtn = document.querySelector(`.sound-icon-btn[data-toggle="${config.key}"]`);
    const soundItem = document.querySelector(`.sound-item[data-sound="${config.key}"]`);
    
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (volumeSpan) volumeSpan.textContent = `${Math.round(val * 100)}%`;
        const wasEnabled = isSoundEnabledForKey(config.key);
        if (wasEnabled) {
          setVolumeForSound(config.key, val);
          config.play();
        }
      });
      
      slider.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      slider.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      });
    }
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newState = !isSoundEnabledForKey(config.key);
        setSoundEnabledForKey(config.key, newState);
        
        if (newState) {
          toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h3l3-3v6l-3-3H3z"/><path d="M15 9a5 5 0 0 1 0 6"/><path d="M18 7a8 8 0 0 1 0 10"/></svg>';
          toggleBtn.classList.add('active');
          if (soundItem) soundItem.style.opacity = '1';
          if (slider) slider.disabled = false;
          config.play();
        } else {
          toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h3l3-3v6l-3-3H3z"/><path d="M15 9a5 5 0 0 1 0 6"/><path d="M18 7a8 8 0 0 1 0 10"/><line x1="21" y1="3" x2="3" y2="21"/></svg>';
          toggleBtn.classList.remove('active');
          if (soundItem) soundItem.style.opacity = '0.5';
          if (slider) slider.disabled = true;
        }
      });
    }
  });
}

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-sound-settings.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-sound-settings resize-${dir}`;
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
        min: { width: 100, height: 100 },
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

function applySettingsAndClose() {
  SOUND_CONFIGS.forEach(config => {
    const slider = document.querySelector(`.sound-slider[data-slider="${config.key}"]`);
    if (slider) {
      const volume = parseFloat(slider.value);
      setVolumeForSound(config.key, volume);
    }
  });
  updateSoundManagerGlobal();
  hideModal();
}

function cancelSettings() {
  loadSavedSettings();
  hideModal();
}

function showModal() {
  if (isModalOpen) return;
  if (!windowElement) {
    windowElement = document.getElementById('sound-settings-movable-window');
    headerElement = document.getElementById('sound-settings-modal-header');
    closeBtn = document.getElementById('close-sound-settings-modal');
    overlay = document.getElementById('sound-settings-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => cancelSettings();
    registerModal(windowElement, 'sound-settings-modal');
  }
  loadSavedSettings();
  renderModalContent();
  
  const cancelBtn = document.getElementById('sound-settings-cancel');
  const saveBtn = document.getElementById('sound-settings-save');
  if (cancelBtn) cancelBtn.onclick = () => cancelSettings();
  if (saveBtn) saveBtn.onclick = () => applySettingsAndClose();
  
  overlay.classList.add('active');
  windowElement.style.display = 'flex';
  centerModal();
  isModalOpen = true;
  bringModalToFront('sound-settings-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
}

loadSavedSettings();

export function showSoundSettingsModal() {
  showModal();
}