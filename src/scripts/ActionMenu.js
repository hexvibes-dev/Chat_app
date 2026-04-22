import interact from 'interactjs';
import { showCustomEmojiModal, showQuickEmojiUpload } from './CustomEmojiModal.js';
import { insertAtCursor } from './input.js';
import { registerModal, unregisterModal, associateOverlay, bringModalToFront, constrainModalPosition } from './modalStackManager.js';

let modal = null;
let isOpen = false;
let isAnimating = false;
let container = null;
let header = null;
let closeBtn = null;
let windowX = 0, windowY = 0;

let isKeyboardOpen = false;
let originalModalTop = null;
let originalContainerTransform = null;

const input = document.getElementById('input');
const layerInput = document.getElementById('layerInput');

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
    handle.className = `resize-handle resize-${dir}`;
    element.appendChild(handle);
  });
}

function getInputTop() {
  if (!layerInput) return Infinity;
  const rect = layerInput.getBoundingClientRect();
  return rect.top;
}

function updateKeyboardStatus() {
  if (!window.visualViewport) return;
  
  const viewportHeight = window.visualViewport.height;
  const windowHeight = window.innerHeight;
  const keyboardHeight = windowHeight - viewportHeight;
  const wasOpen = isKeyboardOpen;
  isKeyboardOpen = keyboardHeight > 80;
  
  if (isKeyboardOpen && !wasOpen) {
    adjustModalPositionForKeyboard();
  } else if (!isKeyboardOpen && wasOpen) {
    resetModalPosition();
  }
}

function adjustModalPositionForKeyboard() {
  if (!container || !isOpen) return;
  
  const inputTop = getInputTop();
  if (inputTop === Infinity) return;
  
  const modalRect = container.getBoundingClientRect();
  const maxAllowedBottom = inputTop - 20;
  
  if (modalRect.bottom > maxAllowedBottom) {
    if (originalContainerTransform === null) {
      originalContainerTransform = container.style.transform;
      originalModalTop = container.getAttribute('data-y') || '0';
    }
    
    const currentY = parseFloat(container.getAttribute('data-y')) || 0;
    const delta = modalRect.bottom - maxAllowedBottom;
    const newY = currentY - delta;
    
    container.style.transform = `translate3d(${parseFloat(container.getAttribute('data-x')) || 0}px, ${newY}px, 0)`;
    container.setAttribute('data-y', newY);
    windowY = newY;
  }
}

function resetModalPosition() {
  if (!container) return;
  
  if (originalContainerTransform !== null) {
    container.style.transform = originalContainerTransform;
    const originalY = parseFloat(originalModalTop) || 0;
    container.setAttribute('data-y', originalY);
    windowY = originalY;
    originalContainerTransform = null;
    originalModalTop = null;
  }
}

function createModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'action-menu-modal';
  modal.className = 'action-menu-modal';
  modal.innerHTML = `
    <div class="action-menu-container">
      <div class="action-menu-header">
        <h3>Acciones</h3>
        <button class="action-menu-close">&times;</button>
      </div>
      <div class="action-menu-content">
        <div class="action-menu-options">
          <button class="action-option" data-action="sticker">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z"/>
              <path d="M8 12h8"/>
              <path d="M12 8v8"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
            <span>Crear sticker</span>
          </button>
          <button class="action-option" data-action="emoji">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            <span>Crear emoji</span>
          </button>
          <button class="action-option" data-action="image">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-4-3 3-4-4-5 5"/>
            </svg>
            <span>Enviar imagen</span>
          </button>
          <button class="action-option" data-action="manage_emoji">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4"/>
              <path d="M5.5 20v-4a6.5 6.5 0 0 1 13 0v4"/>
              <path d="M12 12v6"/>
              <path d="M9 15h6"/>
            </svg>
            <span>Gestionar emojis</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  container = modal.querySelector('.action-menu-container');
  header = modal.querySelector('.action-menu-header');
  closeBtn = modal.querySelector('.action-menu-close');
  addResizeHandles(container);
  setupInteract(container, header);
  registerModal(modal, 'action-menu-modal');
  closeBtn.addEventListener('click', () => hideModal());
  modal.querySelectorAll('.action-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      const action = opt.dataset.action;
      handleAction(action);
      hideModal();
    });
  });
  return modal;
}

function setupInteract(element, dragHandle) {
  interact(element).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 200, height: 250 },
        max: { width: window.innerWidth * 0.9, height: window.innerHeight * 0.9 }
      })
    ],
    listeners: {
      move(event) {
        let width = event.rect.width;
        let height = event.rect.height;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        
        windowX += event.deltaRect.left;
        windowY += event.deltaRect.top;
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
        
        if (isKeyboardOpen) {
          adjustModalPositionForKeyboard();
        }
      }
    }
  });
  
  interact(dragHandle).draggable({
    inertia: false,
    manualStart: false,
    allowFrom: dragHandle,
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
        
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
        
        if (isKeyboardOpen) {
          adjustModalPositionForKeyboard();
        }
      },
      end(event) {
        window.isDraggingModal = false;
        if (isKeyboardOpen) {
          adjustModalPositionForKeyboard();
        }
      }
    }
  });
}

function handleAction(action) {
  switch (action) {
    case 'sticker':
      showTransientNotification('Funcionalidad de crear sticker (próximamente)', 2000);
      break;
    case 'emoji':
      showQuickEmojiUpload();
      break;
    case 'image':
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const imgHtml = `<img src="${ev.target.result}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
            insertAtCursor(imgHtml, window.keyboardOpen);
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
      break;
    case 'manage_emoji':
      showCustomEmojiModal();
      break;
  }
}

function showModal() {
  if (isOpen || isAnimating) return;
  const modalEl = createModal();
  isOpen = true;
  modalEl.classList.remove('closing');
  modalEl.style.display = 'flex';
  modalEl.getBoundingClientRect();
  modalEl.classList.add('open');
  windowX = 0;
  windowY = 0;
  if (container) {
    container.style.transform = '';
    container.removeAttribute('data-x');
    container.removeAttribute('data-y');
    container.style.width = '';
    container.style.height = '';
  }
  bringModalToFront('action-menu-modal');
  
  originalContainerTransform = null;
  originalModalTop = null;
  
  if (isKeyboardOpen) {
    setTimeout(() => adjustModalPositionForKeyboard(), 10);
  }
}

function hideModal() {
  if (!isOpen || isAnimating) return;
  const modalEl = modal;
  if (!modalEl) return;
  isAnimating = true;
  modalEl.classList.remove('open');
  modalEl.classList.add('closing');
  setTimeout(() => {
    modalEl.style.display = 'none';
    modalEl.classList.remove('closing');
    isOpen = false;
    isAnimating = false;
    originalContainerTransform = null;
    originalModalTop = null;
  }, 300);
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateKeyboardStatus);
  window.visualViewport.addEventListener('scroll', updateKeyboardStatus);
} else {
  window.addEventListener('resize', updateKeyboardStatus);
}

window.addEventListener('load', updateKeyboardStatus);
window.addEventListener('keyboardchange', updateKeyboardStatus);

export function initActionMenu() {
  const button = document.getElementById('actionMenuBtn');
  if (!button) return;
  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) hideModal();
    else showModal();
  });
}